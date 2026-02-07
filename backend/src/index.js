import crypto from "crypto";
import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";

dotenv.config();

const {
  PORT = "8080",
  JWT_SECRET,
  WS_PATH = "/ws",
  DEV_ALLOW_TOKEN_ISSUE = "false",
  SIGNALING_ENCRYPTION_KEY,
} = process.env;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required to start the signaling server.");
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/token", (req, res) => {
  if (DEV_ALLOW_TOKEN_ISSUE !== "true") {
    return res.status(403).json({ error: "Token issuing disabled." });
  }

  const { userId, name } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  const token = jwt.sign(
    {
      sub: userId,
      name,
    },
    JWT_SECRET,
    {
      issuer: "c1phera",
      audience: "c1phera-rtc",
      expiresIn: "2h",
    }
  );

  return res.json({ token });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: WS_PATH });

const rooms = new Map();
const clients = new Map();

const getRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  return rooms.get(roomId);
};

const removeClientFromRooms = (socket) => {
  for (const [roomId, sockets] of rooms.entries()) {
    if (sockets.delete(socket) && sockets.size === 0) {
      rooms.delete(roomId);
    }
  }
};

const deriveKey = () => {
  if (!SIGNALING_ENCRYPTION_KEY) {
    return null;
  }
  return crypto.createHash("sha256").update(SIGNALING_ENCRYPTION_KEY).digest();
};

const encryptionKey = deriveKey();

const encryptPayload = (payload) => {
  if (!encryptionKey) {
    return payload;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: data.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
};

const decryptPayload = (payload) => {
  if (!encryptionKey) {
    return payload;
  }
  if (!payload?.ciphertext || !payload?.iv || !payload?.tag) {
    throw new Error("Encrypted payload missing ciphertext, iv, or tag.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
};

const safeSend = (socket, message) => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

const broadcastToRoom = (roomId, message, exclude) => {
  const sockets = rooms.get(roomId);
  if (!sockets) return;
  for (const socket of sockets) {
    if (socket !== exclude) {
      safeSend(socket, message);
    }
  }
};

wss.on("connection", (socket, request) => {
  try {
    const url = new URL(request.url ?? "", `http://${request.headers.host}`);
    const token =
      url.searchParams.get("token") ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      socket.close(4401, "Missing token");
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "c1phera",
      audience: "c1phera-rtc",
    });

    const clientId = decoded.sub;
    clients.set(socket, { id: clientId, name: decoded.name ?? null });

    safeSend(socket, {
      type: "ready",
      payload: encryptPayload({ id: clientId }),
    });
  } catch (error) {
    socket.close(4401, "Unauthorized");
    return;
  }

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      const sender = clients.get(socket);

      if (!sender) {
        socket.close(4401, "Unauthorized");
        return;
      }

      const payload = encryptionKey ? decryptPayload(message.payload) : message;

      switch (payload.type) {
        case "join": {
          const { roomId } = payload;
          if (!roomId) throw new Error("roomId is required");
          const room = getRoom(roomId);
          room.add(socket);
          broadcastToRoom(
            roomId,
            {
              type: "peer-joined",
              payload: encryptPayload({ roomId, peerId: sender.id }),
            },
            socket
          );
          break;
        }
        case "leave": {
          const { roomId } = payload;
          if (!roomId) throw new Error("roomId is required");
          const room = getRoom(roomId);
          room.delete(socket);
          broadcastToRoom(
            roomId,
            {
              type: "peer-left",
              payload: encryptPayload({ roomId, peerId: sender.id }),
            },
            socket
          );
          break;
        }
        case "signal": {
          const { roomId, to, data } = payload;
          if (!roomId || !data) throw new Error("roomId and data are required");

          const messageToSend = {
            type: "signal",
            payload: encryptPayload({
              roomId,
              from: sender.id,
              to: to ?? null,
              data,
            }),
          };

          if (to) {
            for (const [clientSocket, client] of clients.entries()) {
              if (client.id === to) {
                safeSend(clientSocket, messageToSend);
                return;
              }
            }
            break;
          }

          broadcastToRoom(roomId, messageToSend, socket);
          break;
        }
        default:
          throw new Error(`Unsupported message type: ${payload.type}`);
      }
    } catch (error) {
      safeSend(socket, {
        type: "error",
        payload: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  });

  socket.on("close", () => {
    const client = clients.get(socket);

    if (client) {
      for (const [roomId, sockets] of rooms.entries()) {
        if (sockets.has(socket)) {
          broadcastToRoom(
            roomId,
            {
              type: "peer-left",
              payload: encryptPayload({ roomId, peerId: client.id }),
            },
            socket
          );
        }
      }
    }

    removeClientFromRooms(socket);
    clients.delete(socket);
  });
});

server.listen(Number(PORT), () => {
  console.log(`c1phera RTC signaling server running on :${PORT}${WS_PATH}`);
});

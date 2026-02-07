type RtcMessage = {
  type: string;
  payload?: Record<string, unknown>;
};

type RtcConfig = {
  userId: string;
  name?: string;
};

class RtcClient {
  private socket: WebSocket | null = null;
  private ready: Promise<void> | null = null;
  private roomId: string | null = null;

  private get wsUrl() {
    return import.meta.env.VITE_RTC_WS_URL as string | undefined;
  }

  private async getToken({ userId, name }: RtcConfig) {
    const explicitToken = import.meta.env.VITE_RTC_TOKEN as string | undefined;
    if (explicitToken) {
      return explicitToken;
    }

    const tokenEndpoint = import.meta.env
      .VITE_RTC_DEV_TOKEN_ENDPOINT as string | undefined;

    if (!tokenEndpoint) {
      throw new Error(
        "Missing RTC token. Set VITE_RTC_TOKEN or VITE_RTC_DEV_TOKEN_ENDPOINT."
      );
    }

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, name }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch RTC token.");
    }

    const data = (await response.json()) as { token?: string };
    if (!data.token) {
      throw new Error("RTC token response missing token.");
    }

    return data.token;
  }

  async connect(config: RtcConfig) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    if (!this.wsUrl) {
      console.warn(
        "RTC WebSocket URL not configured. Set VITE_RTC_WS_URL to enable calling."
      );
      return;
    }

    const token = await this.getToken(config);
    const url = new URL(this.wsUrl);
    url.searchParams.set("token", token);

    this.socket = new WebSocket(url.toString());
    this.ready = new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("RTC socket not initialized."));
        return;
      }

      this.socket.addEventListener("open", () => resolve());
      this.socket.addEventListener("error", () =>
        reject(new Error("RTC socket error."))
      );
    });

    this.socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data) as RtcMessage;
        if (data.type === "error") {
          console.warn("RTC error:", data.payload);
        }
      } catch (error) {
        console.warn("RTC message parse failed", error);
      }
    });

    await this.ready;
  }

  async joinRoom(roomId: string) {
    if (!this.socket || !this.ready) return;
    await this.ready;

    this.roomId = roomId;
    this.send({ type: "join", roomId });
  }

  async leaveRoom() {
    if (!this.socket || !this.roomId) return;

    this.send({ type: "leave", roomId: this.roomId });
    this.roomId = null;
  }

  send(payload: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  async disconnect() {
    await this.leaveRoom();
    this.socket?.close();
    this.socket = null;
    this.ready = null;
  }
}

const rtcClient = new RtcClient();

export default rtcClient;

# c1phera RTC Backend

Node.js/Express signaling server for WebRTC voice/video calls (group-friendly) with JWT auth.

## Features
- WebSocket signaling for offers/answers/ICE
- JWT-based authentication (issuer/audience scoped)
- Optional encrypted signaling payloads (AES-256-GCM)
- Simple room-based broadcast for group calls

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Set `JWT_SECRET` in `.env` and optionally `SIGNALING_ENCRYPTION_KEY` for encrypted payloads.

## Run

```bash
npm run dev
```

## REST Endpoints

- `GET /api/health`
- `POST /api/token` (dev only, gated by `DEV_ALLOW_TOKEN_ISSUE=true`)

Example token request:

```bash
curl -X POST http://localhost:8080/api/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","name":"Alex"}'
```

## WebSocket

Connect to: `ws://localhost:8080/ws?token=JWT`

Message formats:

### Unencrypted

```json
{ "type": "join", "roomId": "room-1" }
{ "type": "leave", "roomId": "room-1" }
{ "type": "signal", "roomId": "room-1", "to": "peer-id", "data": {"sdp": "..."} }
```

### Encrypted payloads

If `SIGNALING_ENCRYPTION_KEY` is set, clients should encrypt the payload and send:

```json
{ "payload": { "ciphertext": "...", "iv": "...", "tag": "..." } }
```

The encrypted payload should be the JSON object that normally includes `type`, `roomId`, etc.

Server responses:

```json
{ "type": "ready", "payload": { "id": "user-123" } }
{ "type": "peer-joined", "payload": { "roomId": "room-1", "peerId": "user-456" } }
{ "type": "peer-left", "payload": { "roomId": "room-1", "peerId": "user-456" } }
{ "type": "signal", "payload": { "roomId": "room-1", "from": "user-123", "to": null, "data": {"ice": "..."} } }
```

## Encryption notes
- WebRTC already encrypts media with DTLS-SRTP by default.
- For end-to-end encryption (E2EE), use Insertable Streams in the client and keep encryption keys out of the server.
- The optional signaling encryption only protects signaling payloads in transit and is not a substitute for E2EE.

<image src="src/assets/images/thumbnail.png" style="border-radius:16px;margin-bottom:5px;"/>

## Features ⚡

This template is packed with a lot of features including:

- [x] Dark and light modes.
- [x] Messages with attachments.
- [x] Replies and pins.
- [x] Conversations and archives.
- [x] Settings.
- [x] Notifications.
- [x] Voice calls.
- [x] Sign in and sign up pages.
- [x] Password reset page.
- [x] and much more.

<br/>
<br/>

## Setup 🔧

Here is how to setup this template:

<p>1. Clone the repository.</p>

```bash
git clone https://github.com/demon-bixia/Avian-Template.git
```

<p>2. Install dependencies.</p>

```bash
npm install
```

<p>3. Run the development server.</p>

```bash
npm run dev
```

<br/>
<br/>

## RTC Backend (Node/Express) 📞

This repo includes a lightweight WebRTC signaling backend under `backend/` for voice/video calls with JWT auth.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

See `backend/README.md` for configuration, WebSocket usage, and encryption notes.

<br/>
<br/>

### Frontend RTC wiring

The voice call modal now opens a WebSocket signaling session when a call is active. Configure the frontend with:

```bash
VITE_RTC_WS_URL=ws://localhost:8080/ws
VITE_RTC_DEV_TOKEN_ENDPOINT=http://localhost:8080/api/token
```

If you already have JWTs issued elsewhere, set `VITE_RTC_TOKEN` instead of the dev token endpoint.

<br/>
<br/>

## Resources 📙

<p>The resources used to create this project are:</p>

- <a href="https://www.figma.com/design/afxhPVpXABmGzKPk146vlz/Avian-Messaging-Old?node-id=0-1&t=zUVzLyhGRmDk1KCn-0">Figma file</a>
- <a href="https://pinia.vuejs.org/">Pinia</a>
- <a href="https://heroicons.com/">Heroicons</a>
- <a href="https://github.com/dcastil/tailwind-merge">Tailwind merge</a>
- <a href="https://vueuse.org/">vueuse</a>
- <a href="https://wavesurfer-js.org/">Wavesurfer-js</a>
- <a href="https://github.com/Akryum/floating-vue">floating-vue</a>

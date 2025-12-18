# Skibbly (Next.js + Fabric.js + Socket.io)

Whiteboard and group chat on one page, inspired by Skribbl.io. Uses Fabric.js for drawing and Socket.io for realtime chat and whiteboard sync.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run the dev server:

```bash
npm run dev
```

Visit http://localhost:3000 and open multiple browser tabs to test realtime chat and drawing.

## Notes
- Tailwind is preconfigured in `tailwind.config.js` and `styles/globals.css`.
- Socket server is initialized via the API route at `/pages/api/socket.js`.
- Whiteboard uses Fabric.js with free drawing; paths are broadcast to all clients.

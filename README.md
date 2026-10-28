# Lepark 🎮

A real-time multiplayer 2D virtual space game built with **Phaser 3**, **Colyseus**, and **TypeScript**.

## 🌟 Features

- **Real-Time Multiplayer**: Synchronized state across all connected clients via Colyseus binary protocol.
- **Custom Character Appearance**:
  - Color picker for custom dot characters.
  - Custom sprite upload support (idle, left, right, up, down).
  - Built-in sample sprites with instant preview.
- **Smooth Interpolation**: Client-side snapshot interpolation (`@geckos.io/snapshot-interpolation`) for lag-free, jitter-free movement.
- **Zero-Jitter Pixel Rendering**: Clean pixel-art rendering with camera tracking and name tags.
- **Persistent Backend**: Dockerized PostgreSQL database service for user data and state.
- **Modern Monorepo Structure**: Clean separation of `client`, `server`, and `shared` code.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- Docker & Docker Compose (for PostgreSQL database)

### Installation
```bash
# Install dependencies across all workspaces
npm install
```

### Running Locally

1. **Start the Database**:
   ```bash
   npm run db:up
   ```

2. **(Optional) Import / Restore Existing Database Data**:
   ```bash
   npm run db:import
   ```
   *(To export current database state anytime: `npm run db:export`)*

3. **Start the Game Server**:
   ```bash
   npm run dev:server
   ```

4. **Start the Client (Vite)**:
   ```bash
   npm run dev:client
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser!

## 📁 Project Structure

```
lepark/
├── client/          # Phaser 3 + Vite frontend application
├── server/          # Node.js + Colyseus authoritative game server
├── shared/          # Shared types, schemas, and constants
├── docker/          # PostgreSQL initialization scripts
└── docker-compose.yml
```

## 🛠️ Build
```bash
npm run build
```

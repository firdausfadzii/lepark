import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "colyseus";
import { WebSocketTransport, WebSocketClient } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom";
import { initDb, getAllSavedPlayers, isDatabaseHealthy } from "./db";

dotenv.config();

// Colyseus 0.15 sends state/patch payloads as plain `number[]`.
// Ensure array payloads are converted into binary buffers before transmission.
const originalRaw = WebSocketClient.prototype.raw;
WebSocketClient.prototype.raw = function (data: any, options?: any, cb?: any) {
  const payload = Array.isArray(data) ? Uint8Array.from(data) : data;
  return originalRaw.call(this, payload, options, cb);
};

const PORT = parseInt(process.env.PORT || "2567", 10);
const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: isDatabaseHealthy() ? "connected" : "disconnected (fallback mode)",
    timestamp: new Date().toISOString(),
  });
});

// Database players API endpoint
app.get("/api/players", async (req, res) => {
  try {
    const players = await getAllSavedPlayers();
    res.json({ success: true, count: players.length, players });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    maxPayload: 10 * 1024 * 1024, // 10MB payload limit to prevent disconnects when transmitting custom sprites
  }),
});

// Define multiplayer game room
gameServer.define("game_room", GameRoom);

async function start() {
  await initDb();
  await gameServer.listen(PORT);
  console.log(`🎮 Game Server is listening on ws://localhost:${PORT}`);
  console.log(`📡 Health endpoint: http://localhost:${PORT}/health`);
  console.log(`👥 Database players API: http://localhost:${PORT}/api/players`);
}

start().catch((err) => {
  console.error("Fatal error starting server:", err);
});

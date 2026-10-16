import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "colyseus";
import { WebSocketTransport, WebSocketClient } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom";
import {
  initDb,
  getAllSavedPlayers,
  isDatabaseHealthy,
  findUserByUsername,
  findUserById,
  createUser,
  updateUserDisplayName,
} from "./db";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth";
import { AuthUser } from "shared";

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

// ==========================================
// Authentication Endpoints
// ==========================================

/**
 * Register a new user account.
 * Requires:
 * - unique username
 * - display name (optional)
 * - password
 * - require password (confirm password)
 */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, displayName, password, confirmPassword } = req.body || {};

    // 1. Username validation
    if (!username || typeof username !== "string" || username.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Username is required." });
    }
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({
        success: false,
        error: "Username must be between 3 and 30 characters long.",
      });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: "Username may only contain letters, numbers, and underscores.",
      });
    }

    // 2. Password validation
    if (!password || typeof password !== "string") {
      return res.status(400).json({ success: false, error: "Password is required." });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long.",
      });
    }

    // 3. Confirm password validation ("require password")
    if (confirmPassword === undefined || confirmPassword === null) {
      return res.status(400).json({
        success: false,
        error: "Password confirmation is required.",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match.",
      });
    }

    // 4. Check for duplicate username
    const existing = await findUserByUsername(cleanUsername);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Username is already taken. Please choose another username.",
      });
    }

    // 5. Clean optional display name
    const cleanDisplayName =
      displayName && typeof displayName === "string" && displayName.trim().length > 0
        ? displayName.trim().slice(0, 30)
        : null;

    // 6. Hash password and insert record
    const passwordHash = hashPassword(password);
    const createdUser = await createUser(cleanUsername, passwordHash, cleanDisplayName);

    const user: AuthUser = {
      id: createdUser.id,
      username: createdUser.username,
      displayName: createdUser.display_name,
    };

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during registration.",
    });
  }
});

/**
 * Login with username and password.
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        error: "Username and password are required.",
      });
    }

    const cleanUsername = username.trim();
    const userRecord = await findUserByUsername(cleanUsername);

    if (!userRecord) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password.",
      });
    }

    const isMatch = verifyPassword(password, userRecord.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password.",
      });
    }

    const user: AuthUser = {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.display_name,
    };

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during login.",
    });
  }
});

/**
 * Get current user profile by Bearer token.
 */
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Missing or invalid authorization token." });
    }

    const token = authHeader.slice(7).trim();
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Invalid or expired token." });
    }

    const userRecord = await findUserById(payload.id);
    if (!userRecord) {
      return res.status(404).json({ success: false, error: "User no longer exists." });
    }

    const user: AuthUser = {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.display_name,
    };

    return res.json({ success: true, user });
  } catch (err: any) {
    console.error("Auth me error:", err);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

/**
 * Update user display name.
 */
app.put("/api/auth/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Missing authorization token." });
    }

    const token = authHeader.slice(7).trim();
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Invalid or expired token." });
    }

    const { displayName } = req.body || {};
    const cleanDisplayName =
      displayName && typeof displayName === "string" && displayName.trim().length > 0
        ? displayName.trim().slice(0, 30)
        : null;

    const updatedRecord = await updateUserDisplayName(payload.id, cleanDisplayName);
    if (!updatedRecord) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const user: AuthUser = {
      id: updatedRecord.id,
      username: updatedRecord.username,
      displayName: updatedRecord.display_name,
    };

    const newToken = generateToken(user);

    return res.json({
      success: true,
      token: newToken,
      user,
    });
  } catch (err: any) {
    console.error("Update profile error:", err);
    return res.status(500).json({ success: false, error: "Internal server error." });
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
  console.log(`🔐 Auth endpoints available at http://localhost:${PORT}/api/auth/*`);
}

start().catch((err) => {
  console.error("Fatal error starting server:", err);
});

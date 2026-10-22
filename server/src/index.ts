import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server, matchMaker } from "colyseus";
import { WebSocketTransport, WebSocketClient } from "@colyseus/ws-transport";
import { GameRoom, getSpacePlayerCount } from "./rooms/GameRoom";
import {
  initDb,
  getAllSavedPlayers,
  isDatabaseHealthy,
  findUserByUsername,
  findUserById,
  createUser,
  updateUserDisplayName,
  getSuperadminSpaces,
  getSpaceById,
  getUserPersonalSpace,
  ensureUserPersonalSpace,
  createSuperadminSpace,
  updateSpace,
  deleteSpace,
} from "./db";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth";
import { AuthUser, Space, SpacesListResponse, SpaceResponse } from "shared";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Configure Colyseus matchmaking CORS to dynamically allow all requested headers
(matchMaker.controller.DEFAULT_CORS_HEADERS as any)["Access-Control-Allow-Headers"] = "*";
matchMaker.controller.getCorsHeaders = function (req: any) {
  const origin = (req.headers && req.headers["origin"]) || "*";
  const requestedHeaders = req.headers && req.headers["access-control-request-headers"];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": requestedHeaders || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
  };
};

// Colyseus 0.15 sends state/patch payloads as plain `number[]`.
// Ensure array payloads are converted into binary buffers before transmission.
const originalRaw = WebSocketClient.prototype.raw;
WebSocketClient.prototype.raw = function (data: any, options?: any, cb?: any) {
  const payload = Array.isArray(data) ? Uint8Array.from(data) : data;
  return originalRaw.call(this, payload, options, cb);
};

const PORT = parseInt(process.env.PORT || "2567", 10);
const app = express();

// Universal CORS Middleware: guarantees headers for all cross-origin requests & preflights
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Content-Type, Authorization, Accept, X-Requested-With, Origin, skip_zrok_interstitial"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

const corsOptions: cors.CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// Helper for extracting AuthUser from Bearer token
function getAuthUser(req: express.Request): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return verifyToken(token);
}

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

    // 3. Confirm password validation
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
    const createdUser = await createUser(cleanUsername, passwordHash, cleanDisplayName, "user");

    const user: AuthUser = {
      id: createdUser.id,
      username: createdUser.username,
      displayName: createdUser.display_name,
      role: createdUser.role,
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

    // Ensure personal space is initialized
    await ensureUserPersonalSpace(userRecord.id, userRecord.username);

    const user: AuthUser = {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.display_name,
      role: userRecord.role,
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
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired authorization token." });
    }

    const userRecord = await findUserById(user.id);
    if (!userRecord) {
      return res.status(401).json({ success: false, error: "User no longer exists." });
    }

    // Ensure user has personal space
    await ensureUserPersonalSpace(userRecord.id, userRecord.username);

    const updatedUser: AuthUser = {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.display_name,
      role: userRecord.role,
    };

    return res.json({ success: true, user: updatedUser });
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
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired token." });
    }

    const { displayName } = req.body || {};
    const cleanDisplayName =
      displayName && typeof displayName === "string" && displayName.trim().length > 0
        ? displayName.trim().slice(0, 30)
        : null;

    const updatedRecord = await updateUserDisplayName(user.id, cleanDisplayName);
    if (!updatedRecord) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const updatedUser: AuthUser = {
      id: updatedRecord.id,
      username: updatedRecord.username,
      displayName: updatedRecord.display_name,
      role: updatedRecord.role,
    };

    const newToken = generateToken(updatedUser);

    return res.json({
      success: true,
      token: newToken,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error("Update profile error:", err);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// ==========================================
// Spaces REST Endpoints
// ==========================================

/**
 * GET /api/spaces
 * - Returns superadmin spaces (shown in listing, grouped by category).
 * - User spaces are explicitly omitted from the public listing.
 * - If user is authenticated, also returns their own single personal space.
 */
app.get("/api/spaces", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const adminSpaces = await getSuperadminSpaces();

    // Attach real-time active player counts
    const spaces: Space[] = adminSpaces.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      ownerId: s.owner_id,
      ownerUsername: s.owner_username,
      isPublic: s.is_public,
      isSuperadminSpace: true,
      whitelist: s.whitelist,
      playerCount: getSpacePlayerCount(s.id),
      createdAt: s.created_at.toISOString(),
      updatedAt: s.updated_at.toISOString(),
    }));

    // Extract unique categories
    const categorySet = new Set<string>();
    spaces.forEach((s) => {
      if (s.category) categorySet.add(s.category);
    });
    const categories = Array.from(categorySet);

    let mySpace: Space | undefined = undefined;
    if (authUser) {
      const userRecord = await findUserById(authUser.id);
      if (!userRecord) {
        return res.status(401).json({ success: false, error: "User no longer exists." });
      }

      const personalSpace = await ensureUserPersonalSpace(userRecord.id, userRecord.username);
      if (personalSpace) {
        mySpace = {
          id: personalSpace.id,
          name: personalSpace.name,
          category: "Personal",
          ownerId: personalSpace.owner_id,
          ownerUsername: userRecord.username,
          isPublic: personalSpace.is_public,
          isSuperadminSpace: false,
          whitelist: personalSpace.whitelist,
          playerCount: getSpacePlayerCount(personalSpace.id),
          createdAt: personalSpace.created_at.toISOString(),
          updatedAt: personalSpace.updated_at.toISOString(),
        };
      }
    }

    const response: SpacesListResponse = {
      success: true,
      categories,
      spaces,
      mySpace,
    };

    return res.json(response);
  } catch (err: any) {
    console.error("Get spaces error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch spaces." });
  }
});

/**
 * GET /api/spaces/my-space
 * - Get authenticated user's personal space
 */
app.get("/api/spaces/my-space", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const userRecord = await findUserById(authUser.id);
    if (!userRecord) {
      return res.status(401).json({ success: false, error: "User no longer exists." });
    }

    const personalSpace = await ensureUserPersonalSpace(userRecord.id, userRecord.username);
    if (!personalSpace) {
      return res.status(404).json({ success: false, error: "Failed to fetch personal space." });
    }

    const space: Space = {
      id: personalSpace.id,
      name: personalSpace.name,
      category: "Personal",
      ownerId: personalSpace.owner_id,
      ownerUsername: userRecord.username,
      isPublic: personalSpace.is_public,
      isSuperadminSpace: false,
      whitelist: personalSpace.whitelist,
      playerCount: getSpacePlayerCount(personalSpace.id),
      createdAt: personalSpace.created_at.toISOString(),
      updatedAt: personalSpace.updated_at.toISOString(),
    };

    return res.json({ success: true, space });
  } catch (err: any) {
    console.error("Get my-space error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch personal space." });
  }
});

/**
 * PUT /api/spaces/my-space
 * - User updates their personal space (name, public/private toggle, whitelist)
 */
app.put("/api/spaces/my-space", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const userRecord = await findUserById(authUser.id);
    if (!userRecord) {
      return res.status(401).json({ success: false, error: "User no longer exists." });
    }

    const personalSpace = await ensureUserPersonalSpace(userRecord.id, userRecord.username);
    if (!personalSpace) {
      return res.status(404).json({ success: false, error: "Personal space not found." });
    }

    const { name, isPublic, whitelist } = req.body || {};

    // Clean whitelist: array of trimmed non-empty usernames
    let cleanWhitelist: string[] | undefined = undefined;
    if (Array.isArray(whitelist)) {
      cleanWhitelist = whitelist
        .map((w: any) => String(w).trim())
        .filter((w: string) => w.length > 0 && /^[a-zA-Z0-9_]+$/.test(w));
    }

    const updated = await updateSpace(personalSpace.id, {
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 50) : undefined,
      isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
      whitelist: cleanWhitelist,
    });

    if (!updated) {
      return res.status(500).json({ success: false, error: "Failed to update personal space." });
    }

    const space: Space = {
      id: updated.id,
      name: updated.name,
      category: "Personal",
      ownerId: updated.owner_id,
      ownerUsername: authUser.username,
      isPublic: updated.is_public,
      isSuperadminSpace: false,
      whitelist: updated.whitelist,
      playerCount: getSpacePlayerCount(updated.id),
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };

    return res.json({ success: true, space });
  } catch (err: any) {
    console.error("Update my-space error:", err);
    return res.status(500).json({ success: false, error: "Failed to update space." });
  }
});

/**
 * GET /api/spaces/user-space/:identifier
 * - Get user personal space by user ID or username
 */
app.get("/api/spaces/user-space/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    let user = null;
    const parsedId = parseInt(identifier, 10);
    if (!isNaN(parsedId)) {
      user = await findUserById(parsedId);
    }
    if (!user) {
      user = await findUserByUsername(identifier);
    }
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const personalSpace = await ensureUserPersonalSpace(user.id, user.username);
    if (!personalSpace) {
      return res.status(404).json({ success: false, error: "Personal space not found." });
    }
    const space: Space = {
      id: personalSpace.id,
      name: personalSpace.name,
      category: "Personal",
      ownerId: personalSpace.owner_id,
      ownerUsername: user.username,
      isPublic: personalSpace.is_public,
      isSuperadminSpace: false,
      whitelist: personalSpace.whitelist,
      playerCount: getSpacePlayerCount(personalSpace.id),
      createdAt: personalSpace.created_at.toISOString(),
      updatedAt: personalSpace.updated_at.toISOString(),
    };

    return res.json({ success: true, space });
  } catch (err: any) {
    console.error("Get user-space error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch user space." });
  }
});

/**
 * POST /api/spaces
 * - Superadmin creates a new space (public or private with category)
 */
app.post("/api/spaces", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Only superadmin accounts can create new directory spaces.",
      });
    }

    const { name, category, isPublic, whitelist } = req.body || {};
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Space name is required." });
    }

    const cleanName = name.trim().slice(0, 50);
    const cleanCategory =
      category && typeof category === "string" && category.trim().length > 0
        ? category.trim().slice(0, 40)
        : "General";

    let cleanWhitelist: string[] = [];
    if (Array.isArray(whitelist)) {
      cleanWhitelist = whitelist
        .map((w: any) => String(w).trim())
        .filter((w: string) => w.length > 0 && /^[a-zA-Z0-9_]+$/.test(w));
    }

    const created = await createSuperadminSpace({
      name: cleanName,
      category: cleanCategory,
      isPublic: typeof isPublic === "boolean" ? isPublic : true,
      ownerId: authUser.id,
      whitelist: cleanWhitelist,
    });

    const space: Space = {
      id: created.id,
      name: created.name,
      category: created.category,
      ownerId: created.owner_id,
      ownerUsername: authUser.username,
      isPublic: created.is_public,
      isSuperadminSpace: true,
      whitelist: created.whitelist,
      playerCount: 0,
      createdAt: created.created_at.toISOString(),
      updatedAt: created.updated_at.toISOString(),
    };

    return res.status(201).json({ success: true, space });
  } catch (err: any) {
    console.error("Create space error:", err);
    return res.status(500).json({ success: false, error: "Failed to create space." });
  }
});

/**
 * PUT /api/spaces/:id
 * - Superadmin updates a directory space
 */
app.put("/api/spaces/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Only superadmin accounts can edit directory spaces.",
      });
    }

    const spaceId = req.params.id;
    const existing = await getSpaceById(spaceId);
    if (!existing || !existing.is_superadmin_space) {
      return res.status(404).json({ success: false, error: "Superadmin space not found." });
    }

    const { name, category, isPublic, whitelist } = req.body || {};

    let cleanWhitelist: string[] | undefined = undefined;
    if (Array.isArray(whitelist)) {
      cleanWhitelist = whitelist
        .map((w: any) => String(w).trim())
        .filter((w: string) => w.length > 0 && /^[a-zA-Z0-9_]+$/.test(w));
    }

    const updated = await updateSpace(spaceId, {
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 50) : undefined,
      category: typeof category === "string" && category.trim() ? category.trim().slice(0, 40) : undefined,
      isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
      whitelist: cleanWhitelist,
    });

    if (!updated) {
      return res.status(500).json({ success: false, error: "Failed to update space." });
    }

    const space: Space = {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      ownerId: updated.owner_id,
      ownerUsername: updated.owner_username || "admin",
      isPublic: updated.is_public,
      isSuperadminSpace: true,
      whitelist: updated.whitelist,
      playerCount: getSpacePlayerCount(updated.id),
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };

    return res.json({ success: true, space });
  } catch (err: any) {
    console.error("Update space error:", err);
    return res.status(500).json({ success: false, error: "Failed to update space." });
  }
});

/**
 * DELETE /api/spaces/:id
 * - Superadmin deletes a directory space
 */
app.delete("/api/spaces/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Only superadmin accounts can delete directory spaces.",
      });
    }

    const spaceId = req.params.id;
    const existing = await getSpaceById(spaceId);
    if (!existing || !existing.is_superadmin_space) {
      return res.status(404).json({ success: false, error: "Superadmin space not found." });
    }

    const success = await deleteSpace(spaceId);
    return res.json({ success });
  } catch (err: any) {
    console.error("Delete space error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete space." });
  }
});

// Helper to discover or auto-generate HTTPS certificates
function getHttpsConfig(): { key: Buffer; cert: Buffer } | undefined {
  // 1. Check custom paths from environment
  const customKey = process.env.SSL_KEY_PATH;
  const customCert = process.env.SSL_CERT_PATH;
  if (customKey && customCert && fs.existsSync(customKey) && fs.existsSync(customCert)) {
    try {
      return {
        key: fs.readFileSync(customKey),
        cert: fs.readFileSync(customCert),
      };
    } catch (err) {
      console.warn("[SSL] Failed to read custom SSL cert/key from environment paths:", err);
    }
  }

  // 2. Candidate directories
  const candidateDirs = [
    path.resolve(__dirname, "../../certs"),
    path.resolve(__dirname, "../certs"),
    path.resolve(__dirname, "../../client/certs"),
    path.resolve(__dirname, "../client/certs"),
    path.resolve(__dirname, "certs"),
  ];

  for (const dir of candidateDirs) {
    const keyPath = path.join(dir, "key.pem");
    const certPath = path.join(dir, "cert.pem");
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      try {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
      } catch (err) {
        console.warn(`[SSL] Failed to read SSL certs from ${dir}:`, err);
      }
    }
  }

  // 3. Fallback: auto-generate self-signed cert for lan.jomlepark.cc and localhost
  const targetDir = path.resolve(__dirname, "../../certs");
  const keyPath = path.join(targetDir, "key.pem");
  const certPath = path.join(targetDir, "cert.pem");
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    console.log(`[SSL] Generating self-signed certificates in ${targetDir}...`);
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=lan.jomlepark.cc" -addext "subjectAltName=DNS:lan.jomlepark.cc,DNS:jomlepark.cc,DNS:*.jomlepark.cc,DNS:localhost,IP:127.0.0.1" -keyout "${keyPath}" -out "${certPath}" -days 3650`,
      { stdio: "ignore" }
    );
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
  } catch (err) {
    console.warn("[SSL] Failed to auto-generate self-signed certificates:", err);
  }
  return undefined;
}

function shouldEnableHttps(): boolean {
  if (process.env.SERVER_HTTPS === "false" || process.env.HTTPS === "false") {
    return false;
  }
  if (
    process.env.SERVER_HTTPS === "true" ||
    process.env.HTTPS === "true" ||
    process.env.VITE_HTTPS === "true"
  ) {
    return true;
  }
  const serverUrl = process.env.SERVER_URL || "";
  if (serverUrl.startsWith("https://")) {
    if (serverUrl.includes("shares.zrok.io") || serverUrl.includes("ngrok.app")) {
      return false;
    }
    return true;
  }
  return false;
}

const isHttps = shouldEnableHttps();
let serverInstance: http.Server | https.Server;

if (isHttps) {
  const sslConfig = getHttpsConfig();
  if (sslConfig) {
    serverInstance = https.createServer(sslConfig, app);
    console.log("🔒 HTTPS enabled for game server");
  } else {
    console.warn("⚠️ HTTPS was requested but certificates could not be loaded. Falling back to HTTP.");
    serverInstance = http.createServer(app);
  }
} else {
  serverInstance = http.createServer(app);
}

// Graceful client error handler (prevents crashes from port scanners or plain HTTP requests hitting HTTPS)
serverInstance.on("clientError", (err: any, socket) => {
  if (err.code === "ECONNRESET" || !socket.writable) {
    return;
  }
  socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\nClient sent plain HTTP request to HTTPS port.\r\n");
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: serverInstance,
    maxPayload: 10 * 1024 * 1024, // 10MB payload limit
  }),
});

// Define multiplayer game room with space filtering
gameServer.define("game_room", GameRoom).filterBy(["spaceId"]);

async function start() {
  await initDb();
  await gameServer.listen(PORT, "0.0.0.0");
  const isTls = serverInstance instanceof https.Server;
  const protocol = isTls ? "https" : "http";
  const wsProtocol = isTls ? "wss" : "ws";
  console.log(`🎮 Game Server is listening on ${wsProtocol}://0.0.0.0:${PORT}`);
  if (process.env.SERVER_URL) {
    console.log(`🌐 Server URL: ${process.env.SERVER_URL}`);
  }
  if (process.env.CLIENT_URL) {
    console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
  }
  console.log(`📡 Health endpoint: ${protocol}://localhost:${PORT}/health`);
  console.log(`📡 Health endpoint (LAN): ${protocol}://lan.jomlepark.cc:${PORT}/health`);
  console.log(`👥 Database players API: ${protocol}://localhost:${PORT}/api/players`);
  console.log(`🌌 Spaces API: ${protocol}://localhost:${PORT}/api/spaces`);
  console.log(`🔐 Auth endpoints available at ${protocol}://localhost:${PORT}/api/auth/*`);
}

start().catch((err) => {
  console.error("Fatal error starting server:", err);
});

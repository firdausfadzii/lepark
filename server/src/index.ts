import { parkingPointsService } from "./services/ParkingPointsService";
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
import { GameRoom, getSpacePlayerCount, notifySpaceSettingsUpdated } from "./rooms/GameRoom";
import {
  initDb,
  getAllSavedPlayers,
  isDatabaseHealthy,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  createUser,
  updateUserDisplayName,
  updateUserEmail,
  updateUserPassword,
  getSuperadminSpaces,
  getSpaceById,
  getUserPersonalSpace,
  getSharedSpacesForUser,
  ensureUserPersonalSpace,
  createSuperadminSpace,
  updateSpace,
  deleteSpace,
  unlockSkinForUser,
  unlockAssetForUser,
  sendFriendRequest,
  acceptFriendRequest,
  rejectOrCancelFriendRequest,
  removeFriend,
  getFriendshipsForUser,
  createOrganisation,
  getOrganisationsForUser,
  getOrganisationById,
  getRecentChatMessages,
  addOrganisationMember,
  removeOrganisationMember,
  deleteOrganisation,
  getAllUsersBasic,
  getAccessibleSpacesForNotes,
  getNotesForUser,
  createNote,
  updateNote,
  deleteNote,
  getAssignableCalendarMembers,
  getCalendarEventsForUser,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarMealsForSpace,
  upsertCalendarMealForSpace,
  getSpaceInventory,
  createSpaceInventoryItem,
  updateSpaceInventoryItem,
  deleteSpaceInventoryItem,
  SpaceRecord,
} from "./db";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth";
import { sendOtp, verifyOtp, consumeOtp, isValidEmail, OtpPurpose } from "./services/EmailService";
import { AuthUser, Space, SpacesListResponse, SpaceResponse, FriendEntry, FriendRequestEntry, FriendsListResponse, ORGANISATION_CREATION_COST, ASSET_UNLOCK_COST, isPaidAssetId, NoteType, CalendarType, CalendarRepeatUnit } from "shared";

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
app.use(express.json({ limit: "8mb" }));

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
 * Send an OTP code to an email address for registration, password reset, or linking email.
 */
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email, purpose } = req.body || {};
    const validPurposes: OtpPurpose[] = ["register", "forgot_password", "link_email"];
    const targetPurpose: OtpPurpose = validPurposes.includes(purpose) ? purpose : "register";

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (targetPurpose === "register" || targetPurpose === "link_email") {
      if (targetPurpose === "link_email") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return res.status(401).json({ success: false, error: "Unauthorized." });
        }
      }
      const existingEmailUser = await findUserByEmail(cleanEmail);
      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          error: "This email is already linked to an account.",
        });
      }
    } else if (targetPurpose === "forgot_password") {
      const existingEmailUser = await findUserByEmail(cleanEmail);
      if (!existingEmailUser) {
        return res.status(404).json({
          success: false,
          error: "No account found with that email address.",
        });
      }
    }

    const result = await sendOtp(cleanEmail, targetPurpose);
    if (!result.success) {
      const statusCode = result.cooldownRemaining ? 429 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error || "Failed to send OTP.",
        cooldownRemaining: result.cooldownRemaining,
      });
    }

    return res.json({
      success: true,
      message: "OTP sent to your email address.",
      cooldownSeconds: 60,
    });
  } catch (err: any) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ success: false, error: "Internal server error while sending OTP." });
  }
});

/**
 * Register a new user account.
 */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, otp, displayName, password, confirmPassword } = req.body || {};

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

    // 4. Email & OTP validation
    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: "A valid email address is required." });
    }
    const cleanEmail = email.trim().toLowerCase();

    const existingEmail = await findUserByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: "Email is already registered to another account.",
      });
    }

    const otpCheck = verifyOtp(cleanEmail, typeof otp === "string" ? otp : "", "register", false);
    if (!otpCheck.valid) {
      return res.status(400).json({ success: false, error: otpCheck.error || "Invalid OTP code." });
    }

    // 5. Check for duplicate username
    const existing = await findUserByUsername(cleanUsername);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Username is already taken. Please choose another username.",
      });
    }

    // 6. Clean optional display name
    const cleanDisplayName =
      displayName && typeof displayName === "string" && displayName.trim().length > 0
        ? displayName.trim().slice(0, 30)
        : null;

    // 7. Hash password, consume OTP, and insert record
    const passwordHash = hashPassword(password);
    const createdUser = await createUser(cleanUsername, passwordHash, cleanDisplayName, "user", cleanEmail);
    consumeOtp(cleanEmail, "register");

    const user: AuthUser = {
      id: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      displayName: createdUser.display_name,
      role: createdUser.role,
      parkingPoints: createdUser.parking_points || 0,
      unlockedSkins: createdUser.unlocked_skins || [],
      unlockedAssets: createdUser.unlocked_assets || [],
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
 * Login with username or email and password.
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, email, loginType, password } = req.body || {};
    const useEmail = loginType === "email" || (!!email && !username);
    const identifier = useEmail ? email : username;

    if (!identifier || typeof identifier !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        error: useEmail ? "Email and password are required." : "Username and password are required.",
      });
    }

    const cleanIdentifier = identifier.trim();
    const userRecord = useEmail
      ? await findUserByEmail(cleanIdentifier)
      : await findUserByUsername(cleanIdentifier);

    if (!userRecord) {
      return res.status(401).json({
        success: false,
        error: useEmail ? "Invalid email or password." : "Invalid username or password.",
      });
    }

    const isMatch = verifyPassword(password, userRecord.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: useEmail ? "Invalid email or password." : "Invalid username or password.",
      });
    }

    // Ensure personal space is initialized
    await ensureUserPersonalSpace(userRecord.id, userRecord.username);

    const user: AuthUser = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email || null,
      displayName: userRecord.display_name,
      role: userRecord.role,
      parkingPoints: userRecord.parking_points || 0,
      unlockedSkins: userRecord.unlocked_skins || [],
      unlockedAssets: userRecord.unlocked_assets || [],
      lastSpaceId: userRecord.last_space_id || null,
      lastX: userRecord.last_x ?? null,
      lastY: userRecord.last_y ?? null,
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
      email: userRecord.email || null,
      displayName: userRecord.display_name,
      role: userRecord.role,
      parkingPoints: userRecord.parking_points || 0,
      unlockedSkins: userRecord.unlocked_skins || [],
      unlockedAssets: userRecord.unlocked_assets || [],
      lastSpaceId: userRecord.last_space_id || null,
      lastX: userRecord.last_x ?? null,
      lastY: userRecord.last_y ?? null,
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
      email: updatedRecord.email || null,
      displayName: updatedRecord.display_name,
      role: updatedRecord.role,
      parkingPoints: updatedRecord.parking_points || 0,
      unlockedSkins: updatedRecord.unlocked_skins || [],
      unlockedAssets: updatedRecord.unlocked_assets || [],
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

/**
 * Reset password via email OTP.
 */
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body || {};

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }
    const cleanEmail = email.trim().toLowerCase();

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long.",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match.",
      });
    }

    const userRecord = await findUserByEmail(cleanEmail);
    if (!userRecord) {
      return res.status(404).json({ success: false, error: "No account found with that email address." });
    }

    const otpCheck = verifyOtp(cleanEmail, typeof otp === "string" ? otp : "", "forgot_password", true);
    if (!otpCheck.valid) {
      return res.status(400).json({ success: false, error: otpCheck.error || "Invalid OTP code." });
    }

    const passwordHash = hashPassword(newPassword);
    const updated = await updateUserPassword(userRecord.id, passwordHash);
    if (!updated) {
      return res.status(500).json({ success: false, error: "Failed to update password." });
    }

    return res.json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

/**
 * Link an email address to the currently logged-in user (via OTP).
 */
app.post("/api/auth/link-email", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Invalid or expired token." });
    }

    const { email, otp } = req.body || {};
    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }
    const cleanEmail = email.trim().toLowerCase();

    const existingEmailUser = await findUserByEmail(cleanEmail);
    if (existingEmailUser && existingEmailUser.id !== authUser.id) {
      return res.status(409).json({
        success: false,
        error: "This email is already linked to another account.",
      });
    }

    const otpCheck = verifyOtp(cleanEmail, typeof otp === "string" ? otp : "", "link_email", true);
    if (!otpCheck.valid) {
      return res.status(400).json({ success: false, error: otpCheck.error || "Invalid OTP code." });
    }

    const updatedRecord = await updateUserEmail(authUser.id, cleanEmail);
    if (!updatedRecord) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const updatedUser: AuthUser = {
      id: updatedRecord.id,
      username: updatedRecord.username,
      email: updatedRecord.email || null,
      displayName: updatedRecord.display_name,
      role: updatedRecord.role,
      parkingPoints: updatedRecord.parking_points || 0,
      unlockedSkins: updatedRecord.unlocked_skins || [],
      unlockedAssets: updatedRecord.unlocked_assets || [],
    };

    const newToken = generateToken(updatedUser);
    return res.json({
      success: true,
      token: newToken,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error("Link email error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Internal server error." });
  }
});




/**
 * Unlock a character sprite skin with parking points.
 * POST /api/skins/unlock
 */
app.post("/api/skins/unlock", async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired authorization token." });
    }

    const { skinId } = req.body || {};
    if (!skinId || typeof skinId !== "string") {
      return res.status(400).json({ success: false, error: "Missing skinId." });
    }

    // Define skin costs
    const SKIN_COSTS: Record<string, number> = {
      ghost_slime: 10,
    };

    if (!(skinId in SKIN_COSTS)) {
      return res.status(400).json({ success: false, error: `Skin '${skinId}' is not unlockable with points.` });
    }

    const cost = SKIN_COSTS[skinId];
    const result = await unlockSkinForUser(user.id, skinId, cost);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "Failed to unlock skin.",
        points: result.newPoints,
        unlockedSkins: result.unlockedSkins,
      });
    }

    // Synchronize points with active sessions in ParkingPointsService
    parkingPointsService.updateUserPoints(user.id, result.newPoints);

    return res.json({
      success: true,
      points: result.newPoints,
      unlockedSkins: result.unlockedSkins,
      skinId,
    });
  } catch (err: any) {
    console.error("Unlock skin error:", err);
    return res.status(500).json({ success: false, error: "Internal server error while unlocking skin." });
  }
});

/**
 * Unlock a single map editor asset/sprite with parking points (5 points per sprite).
 * POST /api/assets/unlock
 */
app.post("/api/assets/unlock", async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired authorization token." });
    }

    const { assetId } = req.body || {};
    if (!assetId || typeof assetId !== "string" || assetId.length > 200 || assetId.includes("..")) {
      return res.status(400).json({ success: false, error: "Invalid assetId." });
    }

    if (!isPaidAssetId(assetId)) {
      return res.status(400).json({ success: false, error: `Asset '${assetId}' does not require unlocking.` });
    }

    const result = await unlockAssetForUser(user.id, assetId, ASSET_UNLOCK_COST);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "Failed to unlock asset.",
        points: result.newPoints,
        unlockedAssets: result.unlockedAssets,
      });
    }

    // Synchronize points with active sessions in ParkingPointsService
    parkingPointsService.updateUserPoints(user.id, result.newPoints);

    return res.json({
      success: true,
      points: result.newPoints,
      unlockedAssets: result.unlockedAssets,
      assetId,
    });
  } catch (err: any) {
    console.error("Unlock asset error:", err);
    return res.status(500).json({ success: false, error: "Internal server error while unlocking asset." });
  }
});

// ==========================================
// Spaces REST Endpoints
// ==========================================

function toSpaceDto(s: SpaceRecord, ownerUsernameOverride?: string): Space {
  return {
    id: s.id,
    name: s.name,
    category: s.is_superadmin_space ? (s.category || "General") : "Personal",
    ownerId: s.owner_id,
    ownerUsername: ownerUsernameOverride || s.owner_username || (s.is_superadmin_space ? "superadmin" : "User"),
    isPublic: s.is_public,
    isSuperadminSpace: s.is_superadmin_space,
    whitelist: s.whitelist || [],
    sharedOwners: s.shared_owners || [],
    playerCount: getSpacePlayerCount(s.id),
    createdAt: s.created_at.toISOString(),
    updatedAt: s.updated_at.toISOString(),
  };
}

function cleanWhitelistInput(whitelist: any): string[] | undefined {
  if (!Array.isArray(whitelist)) return undefined;
  return whitelist
    .map((w: any) => String(w).trim())
    .filter((w: string) => w.length > 0 && /^[a-zA-Z0-9_]+$/.test(w));
}

async function cleanAndValidateSharedOwners(
  rawList: any,
  excludeUsername?: string,
  friendCheck?: { actingUserId: number; existingSharedOwners?: string[] }
): Promise<{ usernames?: string[]; error?: string }> {
  if (!Array.isArray(rawList)) return { usernames: undefined };

  let acceptedFriendUsernames: Set<string> | null = null;
  const existingSharedSet = new Set(
    (friendCheck?.existingSharedOwners || []).map((u) => u.toLowerCase())
  );
  if (friendCheck) {
    const friendships = await getFriendshipsForUser(friendCheck.actingUserId);
    acceptedFriendUsernames = new Set(
      friendships
        .filter((f) => f.status === "accepted")
        .map((f) => f.other_username.toLowerCase())
    );
  }

  const seen = new Set<string>();
  if (excludeUsername) {
    seen.add(excludeUsername.toLowerCase());
  }

  const result: string[] = [];
  for (const item of rawList) {
    const trimmed = String(item).trim();
    if (!trimmed) continue;
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { error: `Invalid username "${trimmed}".` };
    }
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;

    const user = await findUserByUsername(trimmed);
    if (!user) {
      return { error: `User "@${trimmed}" not found.` };
    }

    if (
      acceptedFriendUsernames &&
      !existingSharedSet.has(lower) &&
      !acceptedFriendUsernames.has(lower)
    ) {
      return {
        error: `You can only share your space with friends. "@${user.username}" is not in your friend list.`,
      };
    }

    seen.add(lower);
    result.push(user.username);
  }

  return { usernames: result };
}

/**
 * GET /api/spaces
 * - Returns superadmin spaces (shown in listing, grouped by category).
 * - User spaces are explicitly omitted from the public listing.
 * - If user is authenticated, also returns their own single personal space and spaces shared with them.
 */
app.get("/api/spaces", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const adminSpaces = await getSuperadminSpaces();

    const spaces: Space[] = adminSpaces.map((s) => toSpaceDto(s));

    const categorySet = new Set<string>();
    spaces.forEach((s) => {
      if (s.category) categorySet.add(s.category);
    });
    const categories = Array.from(categorySet);

    let mySpace: Space | undefined = undefined;
    let sharedSpaces: Space[] | undefined = undefined;
    if (authUser) {
      const userRecord = await findUserById(authUser.id);
      if (!userRecord) {
        return res.status(401).json({ success: false, error: "User no longer exists." });
      }

      const personalSpace = await ensureUserPersonalSpace(userRecord.id, userRecord.username);
      if (personalSpace) {
        mySpace = toSpaceDto(personalSpace, userRecord.username);
      }

      const sharedRecords = await getSharedSpacesForUser(userRecord.id, userRecord.username);
      sharedSpaces = sharedRecords.map((s) => toSpaceDto(s));
    }

    const response: SpacesListResponse = {
      success: true,
      categories,
      spaces,
      mySpace,
      sharedSpaces,
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

    return res.json({ success: true, space: toSpaceDto(personalSpace, userRecord.username) });
  } catch (err: any) {
    console.error("Get my-space error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch personal space." });
  }
});

/**
 * PUT /api/spaces/my-space
 * - User updates their personal space (name, public/private toggle, whitelist, sharedOwners)
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

    const { name, isPublic, whitelist, sharedOwners } = req.body || {};

    const cleanWhitelist = cleanWhitelistInput(whitelist);
    const { usernames: cleanSharedOwners, error: shareError } = await cleanAndValidateSharedOwners(
      sharedOwners,
      userRecord.username,
      { actingUserId: userRecord.id, existingSharedOwners: personalSpace.shared_owners }
    );
    if (shareError) {
      return res.status(400).json({ success: false, error: shareError });
    }

    const finalWhitelist =
      personalSpace.is_public && isPublic === false
        ? await mergeAcceptedFriendsIntoWhitelist(
            personalSpace.owner_id,
            cleanWhitelist ?? personalSpace.whitelist
          )
        : cleanWhitelist;

    const updated = await updateSpace(personalSpace.id, {
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 50) : undefined,
      isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
      whitelist: finalWhitelist,
      sharedOwners: cleanSharedOwners,
    });

    if (!updated) {
      return res.status(500).json({ success: false, error: "Failed to update personal space." });
    }

    notifySpaceSettingsUpdated(updated.id, updated.shared_owners);

    return res.json({ success: true, space: toSpaceDto(updated, userRecord.username) });
  } catch (err: any) {
    console.error("Update my-space error:", err);
    return res.status(500).json({ success: false, error: "Failed to update space." });
  }
});

/**
 * PUT /api/spaces/personal/:id
 * - Primary owner, shared housemate, or superadmin updates a personal space's settings
 */
app.put("/api/spaces/personal/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const userRecord = await findUserById(authUser.id);
    if (!userRecord) {
      return res.status(401).json({ success: false, error: "User no longer exists." });
    }

    const spaceId = req.params.id;
    const existing = await getSpaceById(spaceId);
    if (!existing || existing.is_superadmin_space) {
      return res.status(404).json({ success: false, error: "Personal space not found." });
    }

    const isPrimaryOwner = existing.owner_id === userRecord.id;
    const isSharedOwner = (existing.shared_owners || []).some(
      (u) => u.toLowerCase() === userRecord.username.toLowerCase()
    );
    const isSuperadmin = userRecord.role === "superadmin";

    if (!isPrimaryOwner && !isSharedOwner && !isSuperadmin) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to edit this space's settings.",
      });
    }

    const { name, isPublic, whitelist, sharedOwners } = req.body || {};

    const cleanWhitelist = cleanWhitelistInput(whitelist);
    const { usernames: cleanSharedOwners, error: shareError } = await cleanAndValidateSharedOwners(
      sharedOwners,
      existing.owner_username,
      isSuperadmin
        ? undefined
        : { actingUserId: userRecord.id, existingSharedOwners: existing.shared_owners }
    );
    if (shareError) {
      return res.status(400).json({ success: false, error: shareError });
    }

    const finalWhitelist =
      existing.is_public && isPublic === false
        ? await mergeAcceptedFriendsIntoWhitelist(
            existing.owner_id,
            cleanWhitelist ?? existing.whitelist
          )
        : cleanWhitelist;

    const updated = await updateSpace(existing.id, {
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 50) : undefined,
      isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
      whitelist: finalWhitelist,
      sharedOwners: cleanSharedOwners,
    });

    if (!updated) {
      return res.status(500).json({ success: false, error: "Failed to update space." });
    }

    notifySpaceSettingsUpdated(updated.id, updated.shared_owners);

    return res.json({ success: true, space: toSpaceDto(updated) });
  } catch (err: any) {
    console.error("Update shared personal space error:", err);
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

    return res.json({ success: true, space: toSpaceDto(personalSpace, user.username) });
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

    const { name, category, isPublic, whitelist, sharedOwners } = req.body || {};
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Space name is required." });
    }

    const cleanName = name.trim().slice(0, 50);
    const cleanCategory =
      category && typeof category === "string" && category.trim().length > 0
        ? category.trim().slice(0, 40)
        : "General";

    const cleanWhitelist = cleanWhitelistInput(whitelist) || [];
    const { usernames: cleanSharedOwners, error: shareError } = await cleanAndValidateSharedOwners(
      sharedOwners,
      authUser.username
    );
    if (shareError) {
      return res.status(400).json({ success: false, error: shareError });
    }

    const created = await createSuperadminSpace({
      name: cleanName,
      category: cleanCategory,
      isPublic: typeof isPublic === "boolean" ? isPublic : true,
      ownerId: authUser.id,
      whitelist: cleanWhitelist,
      sharedOwners: cleanSharedOwners || [],
    });

    return res.status(201).json({ success: true, space: toSpaceDto(created, authUser.username) });
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

    const { name, category, isPublic, whitelist, sharedOwners } = req.body || {};

    const cleanWhitelist = cleanWhitelistInput(whitelist);
    const { usernames: cleanSharedOwners, error: shareError } = await cleanAndValidateSharedOwners(
      sharedOwners,
      existing.owner_username
    );
    if (shareError) {
      return res.status(400).json({ success: false, error: shareError });
    }

    const updated = await updateSpace(spaceId, {
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 50) : undefined,
      category: typeof category === "string" && category.trim() ? category.trim().slice(0, 40) : undefined,
      isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
      whitelist: cleanWhitelist,
      sharedOwners: cleanSharedOwners,
    });

    if (!updated) {
      return res.status(500).json({ success: false, error: "Failed to update space." });
    }

    notifySpaceSettingsUpdated(updated.id, updated.shared_owners);

    return res.json({ success: true, space: toSpaceDto(updated) });
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

// ==========================================
// Friends System API Endpoints
// ==========================================

function notifyUserFriendUpdate(userId: number) {
  try {
    const session = parkingPointsService.getOnlineSessionForUser(userId);
    if (session) {
      session.client.send("FRIEND_UPDATE", { timestamp: Date.now() });
    }
  } catch {
    // Safe catch
  }
}

async function mergeAcceptedFriendsIntoWhitelist(
  ownerId: number,
  currentWhitelist?: string[]
): Promise<string[]> {
  const base = Array.isArray(currentWhitelist) ? [...currentWhitelist] : [];
  const seen = new Set(base.map((u) => u.toLowerCase()));
  const friendships = await getFriendshipsForUser(ownerId);
  for (const f of friendships) {
    if (f.status !== "accepted") continue;
    const uname = f.other_username;
    if (uname && !seen.has(uname.toLowerCase())) {
      seen.add(uname.toLowerCase());
      base.push(uname);
    }
  }
  return base;
}

async function addFriendToPrivateSpaceIfNeeded(ownerId: number, friendUsername: string) {
  try {
    const space = await getUserPersonalSpace(ownerId);
    if (!space || space.is_public) return;
    const current = Array.isArray(space.whitelist) ? space.whitelist : [];
    const alreadyIn = current.some((u) => u.toLowerCase() === friendUsername.toLowerCase());
    if (alreadyIn) return;
    const updated = await updateSpace(space.id, {
      whitelist: [...current, friendUsername],
    });
    if (updated) {
      notifySpaceSettingsUpdated(updated.id, updated.shared_owners);
    }
  } catch (err) {
    console.warn("Could not auto-add friend to private space whitelist:", err);
  }
}

async function syncNewFriendsToPrivateSpaces(userIdA: number, userIdB: number) {
  const [userA, userB] = await Promise.all([findUserById(userIdA), findUserById(userIdB)]);
  if (!userA || !userB) return;
  await Promise.all([
    addFriendToPrivateSpaceIfNeeded(userA.id, userB.username),
    addFriendToPrivateSpaceIfNeeded(userB.id, userA.username),
  ]);
}

app.get("/api/friends", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const rows = await getFriendshipsForUser(authUser.id);
    const online: FriendEntry[] = [];
    const offline: FriendEntry[] = [];
    const pending: FriendRequestEntry[] = [];
    const requests: FriendRequestEntry[] = [];

    const spaceNameCache = new Map<string, string>();
    async function resolveSpaceName(spaceId: string): Promise<string> {
      if (spaceNameCache.has(spaceId)) return spaceNameCache.get(spaceId)!;
      let name = spaceId;
      try {
        const space = await getSpaceById(spaceId);
        if (space && space.name) {
          name = space.name;
        } else if (spaceId === "space_central_plaza") {
          name = "CO3";
        }
      } catch {
        // Fallback to spaceId
      }
      spaceNameCache.set(spaceId, name);
      return name;
    }

    for (const row of rows) {
      const baseName = row.other_display_name || row.other_username;
      const onlineInfo = parkingPointsService.getOnlineUserInfo(row.other_user_id);

      if (row.status === "accepted") {
        if (onlineInfo) {
          const spaceName = await resolveSpaceName(onlineInfo.spaceId);
          online.push({
            friendshipId: row.id,
            userId: row.other_user_id,
            username: row.other_username,
            displayName: row.other_display_name,
            name: onlineInfo.name || baseName,
            color: onlineInfo.color || "#3b82f6",
            avatar: onlineInfo.avatar,
            isOnline: true,
            sessionId: onlineInfo.sessionId,
            spaceId: onlineInfo.spaceId,
            spaceName,
            isSuperadmin: onlineInfo.isSuperadmin,
          });
        } else {
          offline.push({
            friendshipId: row.id,
            userId: row.other_user_id,
            username: row.other_username,
            displayName: row.other_display_name,
            name: baseName,
            color: "#3b82f6",
            avatar: null,
            isOnline: false,
            sessionId: null,
            spaceId: null,
            spaceName: null,
            isSuperadmin: false,
          });
        }
      } else if (row.status === "pending") {
        const entry: FriendRequestEntry = {
          friendshipId: row.id,
          userId: row.other_user_id,
          username: row.other_username,
          displayName: row.other_display_name,
          name: onlineInfo?.name || baseName,
          avatar: onlineInfo?.avatar || null,
          createdAt: new Date(row.created_at).toISOString(),
        };
        if (row.requester_id === authUser.id) {
          pending.push(entry);
        } else {
          requests.push(entry);
        }
      }
    }

    const response: FriendsListResponse = {
      success: true,
      online,
      offline,
      pending,
      requests,
    };
    return res.json(response);
  } catch (err: any) {
    console.error("Get friends error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch friends." });
  }
});

app.post("/api/friends/request", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const { targetUserId, username } = req.body || {};
    let targetUser = null;

    if (typeof targetUserId === "number" && targetUserId > 0) {
      targetUser = await findUserById(targetUserId);
    } else if (typeof username === "string" && username.trim().length > 0) {
      targetUser = await findUserByUsername(username.trim());
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, error: "Player not found." });
    }

    const result = await sendFriendRequest(authUser.id, targetUser.id);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    if (result.status === "accepted") {
      await syncNewFriendsToPrivateSpaces(authUser.id, targetUser.id);
    }

    notifyUserFriendUpdate(targetUser.id);
    notifyUserFriendUpdate(authUser.id);

    return res.json({
      success: true,
      status: result.status,
      friendshipId: result.friendshipId,
    });
  } catch (err: any) {
    console.error("Friend request error:", err);
    return res.status(500).json({ success: false, error: "Failed to send friend request." });
  }
});

app.post("/api/friends/accept", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const friendshipId = Number(req.body?.friendshipId);
    if (!friendshipId || isNaN(friendshipId)) {
      return res.status(400).json({ success: false, error: "Invalid friendship ID." });
    }

    const result = await acceptFriendRequest(authUser.id, friendshipId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    if (result.requesterId) {
      await syncNewFriendsToPrivateSpaces(authUser.id, result.requesterId);
      notifyUserFriendUpdate(result.requesterId);
    }
    notifyUserFriendUpdate(authUser.id);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Accept friend request error:", err);
    return res.status(500).json({ success: false, error: "Failed to accept friend request." });
  }
});

app.post("/api/friends/reject", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const friendshipId = Number(req.body?.friendshipId);
    if (!friendshipId || isNaN(friendshipId)) {
      return res.status(400).json({ success: false, error: "Invalid friendship ID." });
    }

    const result = await rejectOrCancelFriendRequest(authUser.id, friendshipId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    if (result.otherUserId) {
      notifyUserFriendUpdate(result.otherUserId);
    }
    notifyUserFriendUpdate(authUser.id);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Reject friend request error:", err);
    return res.status(500).json({ success: false, error: "Failed to update friend request." });
  }
});

app.delete("/api/friends/:friendUserId", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const friendUserId = Number(req.params.friendUserId);
    if (!friendUserId || isNaN(friendUserId)) {
      return res.status(400).json({ success: false, error: "Invalid friend user ID." });
    }

    const removed = await removeFriend(authUser.id, friendUserId);
    if (!removed) {
      return res.status(404).json({ success: false, error: "Friend not found." });
    }

    notifyUserFriendUpdate(friendUserId);
    notifyUserFriendUpdate(authUser.id);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Remove friend error:", err);
    return res.status(500).json({ success: false, error: "Failed to remove friend." });
  }
});

// ==========================================
// Organisation System API Endpoints
// ==========================================

app.get("/api/organisations", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const organisations = await getOrganisationsForUser(authUser.id);
    return res.json({ success: true, organisations });
  } catch (err) {
    console.error("Get organisations error:", err);
    return res.status(500).json({ success: false, error: "Failed to load organisations." });
  }
});

app.get("/api/organisations/players", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    if (authUser.role !== "superadmin") {
      return res.status(403).json({ success: false, error: "Superadmin access required." });
    }
    const users = await getAllUsersBasic();
    const players = users
      .filter((u) => u.userId !== authUser.id)
      .map((u) => ({
        ...u,
        isOnline: Boolean(parkingPointsService.getOnlineUserInfo(u.userId)),
      }));
    return res.json({ success: true, players });
  } catch (err) {
    console.error("Get organisation players error:", err);
    return res.status(500).json({ success: false, error: "Failed to load players." });
  }
});

app.post("/api/organisations", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const { name, memberUserIds, logo } = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60) {
      return res.status(400).json({
        success: false,
        error: "Organisation name must be between 2 and 60 characters.",
      });
    }

    const parsedMemberIds: number[] = Array.isArray(memberUserIds)
      ? memberUserIds.map((id: any) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    let sanitizedLogo: string | null = null;
    if (logo !== undefined && logo !== null && logo !== "") {
      if (typeof logo !== "string" || !/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(logo)) {
        return res.status(400).json({
          success: false,
          error: "Invalid logo format. Please upload a PNG, JPG, WebP, or GIF image (100x100px).",
        });
      }
      if (logo.length > 300000) {
        return res.status(400).json({
          success: false,
          error: "Logo image is too large. Please use a 100x100px image.",
        });
      }
      sanitizedLogo = logo;
    }

    const cost = authUser.role === "superadmin" ? 0 : ORGANISATION_CREATION_COST;
    const result = await createOrganisation(
      authUser.id,
      name,
      parsedMemberIds,
      sanitizedLogo,
      cost
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "Failed to create organisation.",
        points: result.newPoints,
      });
    }

    if (typeof result.newPoints === "number") {
      parkingPointsService.updateUserPoints(authUser.id, result.newPoints);
    }

    return res.json({
      success: true,
      organisation: result.organisation,
      points: result.newPoints,
    });
  } catch (err) {
    console.error("Create organisation error:", err);
    return res.status(500).json({ success: false, error: "Failed to create organisation." });
  }
});

app.post("/api/organisations/:id/members", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const orgId = Number(req.params.id);
    const targetUserId = Number(req.body?.userId);
    if (!Number.isInteger(orgId) || orgId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid organisation or user ID." });
    }

    const result = await addOrganisationMember(orgId, authUser.id, targetUserId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, organisation: result.organisation });
  } catch (err) {
    console.error("Add organisation member error:", err);
    return res.status(500).json({ success: false, error: "Failed to add member." });
  }
});

app.delete("/api/organisations/:id/members/:userId", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const orgId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(orgId) || orgId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid organisation or user ID." });
    }

    const result = await removeOrganisationMember(orgId, authUser.id, targetUserId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, organisation: result.organisation });
  } catch (err) {
    console.error("Remove organisation member error:", err);
    return res.status(500).json({ success: false, error: "Failed to remove member." });
  }
});

app.delete("/api/organisations/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const orgId = Number(req.params.id);
    if (!Number.isInteger(orgId) || orgId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid organisation ID." });
    }

    const result = await deleteOrganisation(orgId, authUser.id);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete organisation error:", err);
    return res.status(500).json({ success: false, error: "Failed to disband organisation." });
  }
});

app.get("/api/organisations/:id/messages", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const orgId = Number(req.params.id);
    if (!Number.isInteger(orgId) || orgId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid organisation ID." });
    }
    const org = await getOrganisationById(orgId);
    if (!org || !org.members.some((m) => m.userId === authUser.id)) {
      return res.status(403).json({ success: false, error: "Not a member of this organisation." });
    }
    const messages = await getRecentChatMessages(String(orgId), "org", 50);
    return res.json({ success: true, messages });
  } catch (err) {
    console.error("Get organisation messages error:", err);
    return res.status(500).json({ success: false, error: "Failed to load organisation messages." });
  }
});

// ==========================================
// Notes System API Endpoints
// ==========================================

function sanitizeNoteHtml(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|button|meta|link)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|button|meta|link)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data):[^"']*\2/gi, '$1="#"')
    .slice(0, 100000);
}

function parseNoteType(raw: any): NoteType | null {
  if (raw === "personal" || raw === "space" || raw === "organisation") {
    return raw;
  }
  return null;
}

app.get("/api/notes", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const noteType = parseNoteType(req.query.type) || "personal";
    const spaceId = typeof req.query.spaceId === "string" && req.query.spaceId.trim() ? req.query.spaceId.trim() : undefined;
    const orgIdRaw = req.query.organisationId;
    const organisationId =
      typeof orgIdRaw === "string" && orgIdRaw.trim() && Number.isInteger(Number(orgIdRaw))
        ? Number(orgIdRaw)
        : undefined;

    const [accessibleSpaces, result] = await Promise.all([
      getAccessibleSpacesForNotes(authUser.id, authUser.username),
      getNotesForUser(authUser.id, authUser.username, noteType, spaceId, organisationId),
    ]);

    if (!result.success) {
      return res.status(403).json({ success: false, error: result.error, accessibleSpaces });
    }

    return res.json({
      success: true,
      notes: result.notes,
      accessibleSpaces,
    });
  } catch (err) {
    console.error("Get notes error:", err);
    return res.status(500).json({ success: false, error: "Failed to load notes." });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const { type, title, content, spaceId, organisationId } = req.body || {};
    const noteType = parseNoteType(type);
    if (!noteType) {
      return res.status(400).json({ success: false, error: "Invalid note type." });
    }
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    if (!cleanTitle || cleanTitle.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Note title is required and must be 200 characters or less.",
      });
    }
    const cleanContent = sanitizeNoteHtml(typeof content === "string" ? content : "");
    const parsedOrgId =
      organisationId !== undefined && organisationId !== null && Number.isInteger(Number(organisationId))
        ? Number(organisationId)
        : null;
    const imgs = parseCalendarImages(req.body);
    if (imgs.error) {
      return res.status(400).json({ success: false, error: imgs.error });
    }

    const result = await createNote({
      userId: authUser.id,
      username: authUser.username,
      type: noteType,
      title: cleanTitle,
      content: cleanContent,
      spaceId: typeof spaceId === "string" && spaceId.trim() ? spaceId.trim() : null,
      organisationId: parsedOrgId,
      images: imgs.images,
    });

    if (!result.success) {
      return res.status(403).json({ success: false, error: result.error });
    }
    return res.status(201).json({ success: true, note: result.note });
  } catch (err) {
    console.error("Create note error:", err);
    return res.status(500).json({ success: false, error: "Failed to create note." });
  }
});

app.put("/api/notes/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const noteId = Number(req.params.id);
    if (!Number.isInteger(noteId) || noteId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid note ID." });
    }
    const { title, content } = req.body || {};
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    if (!cleanTitle || cleanTitle.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Note title is required and must be 200 characters or less.",
      });
    }
    const cleanContent = sanitizeNoteHtml(typeof content === "string" ? content : "");
    const imgs = req.body?.images !== undefined ? parseCalendarImages(req.body) : undefined;
    if (imgs?.error) {
      return res.status(400).json({ success: false, error: imgs.error });
    }

    const result = await updateNote(
      noteId,
      authUser.id,
      authUser.username,
      cleanTitle,
      cleanContent,
      imgs ? imgs.images : undefined
    );
    if (!result.success) {
      const status = result.error === "Note not found." ? 404 : 403;
      return res.status(status).json({ success: false, error: result.error });
    }
    return res.json({ success: true, note: result.note });
  } catch (err) {
    console.error("Update note error:", err);
    return res.status(500).json({ success: false, error: "Failed to update note." });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const noteId = Number(req.params.id);
    if (!Number.isInteger(noteId) || noteId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid note ID." });
    }
    const result = await deleteNote(noteId, authUser.id, authUser.username);
    if (!result.success) {
      const status = result.error === "Note not found." ? 404 : 403;
      return res.status(status).json({ success: false, error: result.error });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete note error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete note." });
  }
});

// ==========================================
// Space Inventory API Endpoints
// ==========================================

app.get("/api/spaces/:spaceId/inventory", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const spaceId = typeof req.params.spaceId === "string" ? req.params.spaceId.trim() : "";
    if (!spaceId) {
      return res.status(400).json({ success: false, error: "Space ID is required." });
    }
    const result = await getSpaceInventory(spaceId, authUser.id, authUser.username);
    if (!result.success) {
      return res.status(403).json({ success: false, error: result.error });
    }
    return res.json({ success: true, items: result.items });
  } catch (err) {
    console.error("Get space inventory error:", err);
    return res.status(500).json({ success: false, error: "Failed to load space inventory." });
  }
});

app.post("/api/spaces/:spaceId/inventory", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const spaceId = typeof req.params.spaceId === "string" ? req.params.spaceId.trim() : "";
    if (!spaceId) {
      return res.status(400).json({ success: false, error: "Space ID is required." });
    }
    const { name, bought } = req.body || {};
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName || cleanName.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Inventory name is required and must be 200 characters or less.",
      });
    }
    const result = await createSpaceInventoryItem({
      spaceId,
      userId: authUser.id,
      username: authUser.username,
      name: cleanName,
      bought: Boolean(bought),
    });
    if (!result.success) {
      return res.status(403).json({ success: false, error: result.error });
    }
    return res.status(201).json({ success: true, item: result.item });
  } catch (err) {
    console.error("Create space inventory error:", err);
    return res.status(500).json({ success: false, error: "Failed to add inventory item." });
  }
});

app.put("/api/spaces/:spaceId/inventory/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const spaceId = typeof req.params.spaceId === "string" ? req.params.spaceId.trim() : "";
    const itemId = Number(req.params.id);
    if (!spaceId || !Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid space or inventory item ID." });
    }
    const { name, bought } = req.body || {};
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName || cleanName.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Inventory name is required and must be 200 characters or less.",
      });
    }
    const result = await updateSpaceInventoryItem({
      id: itemId,
      spaceId,
      userId: authUser.id,
      username: authUser.username,
      name: cleanName,
      bought: Boolean(bought),
    });
    if (!result.success) {
      const status = result.error === "Inventory item not found." ? 404 : 403;
      return res.status(status).json({ success: false, error: result.error });
    }
    return res.json({ success: true, item: result.item });
  } catch (err) {
    console.error("Update space inventory error:", err);
    return res.status(500).json({ success: false, error: "Failed to update inventory item." });
  }
});

app.delete("/api/spaces/:spaceId/inventory/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const spaceId = typeof req.params.spaceId === "string" ? req.params.spaceId.trim() : "";
    const itemId = Number(req.params.id);
    if (!spaceId || !Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid space or inventory item ID." });
    }
    const result = await deleteSpaceInventoryItem({
      id: itemId,
      spaceId,
      userId: authUser.id,
      username: authUser.username,
    });
    if (!result.success) {
      const status = result.error === "Inventory item not found." ? 404 : 403;
      return res.status(status).json({ success: false, error: result.error });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete space inventory error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete inventory item." });
  }
});

// ==========================================
// Calendar Events API Endpoints
// ==========================================

function isValidIsoDate(val: any): val is string {
  if (typeof val !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [y, m, d] = val.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isValidTimeHHMM(val: any): val is string {
  return typeof val === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(val);
}

function parseCalendarEventDatesAndTime(body: any): {
  error?: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
} {
  const startDate = typeof body?.startDate === "string" ? body.startDate.trim() : "";
  const endDateRaw = typeof body?.endDate === "string" && body.endDate.trim() ? body.endDate.trim() : startDate;

  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDateRaw)) {
    return {
      error: "Valid start and end dates (YYYY-MM-DD) are required.",
      startDate,
      endDate: endDateRaw,
      isAllDay: true,
      startTime: null,
      endTime: null,
    };
  }
  if (endDateRaw < startDate) {
    return {
      error: "End date cannot be earlier than start date.",
      startDate,
      endDate: endDateRaw,
      isAllDay: true,
      startTime: null,
      endTime: null,
    };
  }

  // Multi-day events do not use time inputs
  if (endDateRaw > startDate) {
    return {
      startDate,
      endDate: endDateRaw,
      isAllDay: true,
      startTime: null,
      endTime: null,
    };
  }

  const isAllDay = body?.isAllDay !== false;
  if (isAllDay) {
    return {
      startDate,
      endDate: endDateRaw,
      isAllDay: true,
      startTime: null,
      endTime: null,
    };
  }

  const startTime = typeof body?.startTime === "string" ? body.startTime.trim() : "";
  const endTime = typeof body?.endTime === "string" ? body.endTime.trim() : "";
  if (!isValidTimeHHMM(startTime) || !isValidTimeHHMM(endTime)) {
    return {
      error: "Valid start time and end time (HH:MM) are required when not All Day.",
      startDate,
      endDate: endDateRaw,
      isAllDay: false,
      startTime: null,
      endTime: null,
    };
  }
  if (endTime < startTime) {
    return {
      error: "End time cannot be earlier than start time.",
      startDate,
      endDate: endDateRaw,
      isAllDay: false,
      startTime,
      endTime,
    };
  }

  return {
    startDate,
    endDate: endDateRaw,
    isAllDay: false,
    startTime,
    endTime,
  };
}

function parseCalendarRepeat(body: any): {
  error?: string;
  repeatInterval: number | null;
  repeatUnit: CalendarRepeatUnit | null;
} {
  const rawInterval = body?.repeatInterval;
  const rawUnit = body?.repeatUnit;
  if (rawInterval === undefined || rawInterval === null || rawInterval === "" || Number(rawInterval) === 0) {
    return { repeatInterval: null, repeatUnit: null };
  }
  const interval = Number(rawInterval);
  if (!Number.isInteger(interval) || interval < 1 || interval > 365) {
    return { error: "Repeat interval must be a whole number between 1 and 365.", repeatInterval: null, repeatUnit: null };
  }
  if (rawUnit !== "day" && rawUnit !== "week" && rawUnit !== "month" && rawUnit !== "year") {
    return { error: "Repeat unit must be day, week, month, or year.", repeatInterval: null, repeatUnit: null };
  }
  return { repeatInterval: interval, repeatUnit: rawUnit };
}

function parseCalendarImages(body: any): { error?: string; images: string[] } {
  const raw = body?.images;
  if (raw === undefined || raw === null) return { images: [] };
  if (!Array.isArray(raw)) {
    return { error: "Invalid images payload.", images: [] };
  }
  if (raw.length > 10) {
    return { error: "You can upload up to 10 pictures per event.", images: [] };
  }
  const images: string[] = [];
  for (const item of raw) {
    if (
      typeof item !== "string" ||
      !/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(item)
    ) {
      return { error: "Only picture files (JPEG, PNG, WebP) are allowed.", images: [] };
    }
    if (item.length > 2_000_000) {
      return { error: "Each compressed picture must be under 1.5MB.", images: [] };
    }
    images.push(item);
  }
  return { images };
}

function parseCalendarAssignees(body: any): {
  assigneeIds: number[];
  rotateAssignees: boolean;
} {
  const rawIds = Array.isArray(body?.assigneeIds) ? body.assigneeIds : [];
  const seen = new Set<number>();
  const assigneeIds: number[] = [];
  for (const item of rawIds) {
    const id = Number(item);
    if (Number.isInteger(id) && id > 0 && !seen.has(id)) {
      seen.add(id);
      assigneeIds.push(id);
    }
  }
  const rotateAssignees = Boolean(body?.rotateAssignees);
  return { assigneeIds, rotateAssignees };
}

app.get("/api/calendar/events", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const calType: CalendarType = parseNoteType(req.query.type) || "personal";
    const spaceId =
      typeof req.query.spaceId === "string" && req.query.spaceId.trim() ? req.query.spaceId.trim() : undefined;
    const orgIdRaw = req.query.organisationId;
    const organisationId =
      typeof orgIdRaw === "string" && orgIdRaw.trim() && Number.isInteger(Number(orgIdRaw))
        ? Number(orgIdRaw)
        : undefined;

    const [accessibleSpaces, result, assignableMembers] = await Promise.all([
      getAccessibleSpacesForNotes(authUser.id, authUser.username),
      getCalendarEventsForUser(authUser.id, authUser.username, calType, spaceId, organisationId),
      calType !== "personal"
        ? getAssignableCalendarMembers(calType, spaceId, organisationId)
        : Promise.resolve([]),
    ]);

    if (!result.success) {
      return res.status(403).json({ success: false, error: result.error, accessibleSpaces, assignableMembers: [] });
    }

    return res.json({
      success: true,
      events: result.events,
      accessibleSpaces,
      assignableMembers,
    });
  } catch (err) {
    console.error("Get calendar events error:", err);
    return res.status(500).json({ success: false, error: "Failed to load calendar events." });
  }
});

app.post("/api/calendar/events", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const { type, title, description, spaceId, organisationId } = req.body || {};
    const calType = parseNoteType(type) as CalendarType | null;
    if (!calType) {
      return res.status(400).json({ success: false, error: "Invalid calendar type." });
    }
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    if (!cleanTitle || cleanTitle.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Event title is required and must be 200 characters or less.",
      });
    }
    const dt = parseCalendarEventDatesAndTime(req.body);
    if (dt.error) {
      return res.status(400).json({ success: false, error: dt.error });
    }
    const rep = parseCalendarRepeat(req.body);
    if (rep.error) {
      return res.status(400).json({ success: false, error: rep.error });
    }
    const assign = parseCalendarAssignees(req.body);
    const imgs = parseCalendarImages(req.body);
    if (imgs.error) {
      return res.status(400).json({ success: false, error: imgs.error });
    }

    const cleanDescription = sanitizeNoteHtml(typeof description === "string" ? description : "");
    const parsedOrgId =
      organisationId !== undefined && organisationId !== null && Number.isInteger(Number(organisationId))
        ? Number(organisationId)
        : null;

    const result = await createCalendarEvent({
      userId: authUser.id,
      username: authUser.username,
      type: calType,
      title: cleanTitle,
      description: cleanDescription,
      startDate: dt.startDate,
      endDate: dt.endDate,
      isAllDay: dt.isAllDay,
      startTime: dt.startTime,
      endTime: dt.endTime,
      repeatInterval: rep.repeatInterval,
      repeatUnit: rep.repeatUnit,
      assigneeIds: assign.assigneeIds,
      rotateAssignees: assign.rotateAssignees,
      images: imgs.images,
      spaceId: typeof spaceId === "string" && spaceId.trim() ? spaceId.trim() : null,
      organisationId: parsedOrgId,
    });

    if (!result.success) {
      return res.status(403).json({ success: false, error: result.error });
    }
    return res.status(201).json({ success: true, event: result.event });
  } catch (err) {
    console.error("Create calendar event error:", err);
    return res.status(500).json({ success: false, error: "Failed to create calendar event." });
  }
});

app.put("/api/calendar/events/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid event ID." });
    }
    const { title, description } = req.body || {};
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    if (!cleanTitle || cleanTitle.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Event title is required and must be 200 characters or less.",
      });
    }
    const dt = parseCalendarEventDatesAndTime(req.body);
    if (dt.error) {
      return res.status(400).json({ success: false, error: dt.error });
    }
    const rep = parseCalendarRepeat(req.body);
    if (rep.error) {
      return res.status(400).json({ success: false, error: rep.error });
    }
    const assign = parseCalendarAssignees(req.body);
    const imgs = parseCalendarImages(req.body);
    if (imgs.error) {
      return res.status(400).json({ success: false, error: imgs.error });
    }
    const cleanDescription = sanitizeNoteHtml(typeof description === "string" ? description : "");

    const result = await updateCalendarEvent(eventId, authUser.id, authUser.username, {
      title: cleanTitle,
      description: cleanDescription,
      startDate: dt.startDate,
      endDate: dt.endDate,
      isAllDay: dt.isAllDay,
      startTime: dt.startTime,
      endTime: dt.endTime,
      repeatInterval: rep.repeatInterval,
      repeatUnit: rep.repeatUnit,
      assigneeIds: assign.assigneeIds,
      rotateAssignees: assign.rotateAssignees,
      images: imgs.images,
    });
    if (!result.success) {
      const status = result.error === "Event not found." ? 404 : 403;
      return res.status(status).json({ success: false, error: result.error });
    }
    return res.json({ success: true, event: result.event });
  } catch (err) {
    console.error("Update calendar event error:", err);
    return res.status(500).json({ success: false, error: "Failed to update calendar event." });
  }
});

app.delete("/api/calendar/events/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid event ID." });
    }
    const result = await deleteCalendarEvent(eventId, authUser.id, authUser.username);
    if (!result.success) {
      const status = result.error === "Event not found." ? 404 : 403;
      return res.status(status).json({ success: false, error: result.error });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete calendar event error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete calendar event." });
  }
});

app.get("/api/calendar/meals", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const accessibleSpaces = await getAccessibleSpacesForNotes(authUser.id, authUser.username);
    const spaceId =
      typeof req.query.spaceId === "string" && req.query.spaceId.trim() ? req.query.spaceId.trim() : undefined;

    if (!spaceId) {
      return res.json({ success: true, meals: [], accessibleSpaces });
    }

    const result = await getCalendarMealsForSpace(authUser.id, authUser.username, spaceId);
    if (!result.success) {
      return res.status(403).json({ success: false, error: result.error, accessibleSpaces });
    }
    return res.json({ success: true, meals: result.meals || [], accessibleSpaces });
  } catch (err) {
    console.error("Get calendar meals error:", err);
    return res.status(500).json({ success: false, error: "Failed to load meals." });
  }
});

app.put("/api/calendar/meals/:dayOfWeek", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const dayOfWeek = Number(req.params.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ success: false, error: "Invalid day of week." });
    }
    const spaceId = typeof req.body?.spaceId === "string" ? req.body.spaceId.trim() : "";
    if (!spaceId) {
      return res.status(400).json({ success: false, error: "Space is required." });
    }
    const rawMealName = req.body?.mealName;
    if (typeof rawMealName !== "string") {
      return res.status(400).json({ success: false, error: "Meal name must be a string." });
    }
    if (rawMealName.trim().length > 200) {
      return res.status(400).json({ success: false, error: "Meal name must be 200 characters or less." });
    }
    const result = await upsertCalendarMealForSpace(authUser.id, authUser.username, spaceId, dayOfWeek, rawMealName);
    if (!result.success) {
      return res.status(403).json({ success: false, error: result.error });
    }
    return res.json({ success: true, meal: result.meal });
  } catch (err) {
    console.error("Update calendar meal error:", err);
    return res.status(500).json({ success: false, error: "Failed to save meal." });
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
  parkingPointsService.start();
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

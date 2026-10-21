export type AvatarFrames = string | string[];

export const MAX_AVATAR_FRAMES = 6;

export interface PlayerAvatars {
  idle?: AvatarFrames; // Standing still (data URL / base64 or array of frames)
  left?: AvatarFrames; // Moving left frames
  right?: AvatarFrames; // Moving right frames
  up?: AvatarFrames; // Moving up frames
  down?: AvatarFrames; // Moving down frames
}

export const DEFAULT_AVATARS: Record<"idle" | "left" | "right" | "up" | "down", string[]> = {
  idle: ["/assets/man_still.png"],
  left: ["/assets/male_move_left_1.png", "/assets/male_move_left_2.png"],
  right: ["/assets/male_move_right_1.png", "/assets/male_move_right_2.png"],
  up: ["/assets/male_move_up_1.png", "/assets/male_move_up_2.png"],
  down: ["/assets/male_move_down_1.png", "/assets/male_move_down_2.png"],
};

export function normalizeFrames(frames?: AvatarFrames): string[] {
  if (!frames) return [];
  if (Array.isArray(frames)) return frames.filter((f) => typeof f === "string" && f.length > 0);
  if (typeof frames === "string" && frames.length > 0) return [frames];
  return [];
}

export interface PlayerInputPayload {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface PlayerJoinOptions {
  name: string;
  color: string;
  avatars?: PlayerAvatars;
  spaceId?: string;
  token?: string;
}

export interface PlayerDbRecord {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  avatars?: PlayerAvatars;
  created_at?: Date;
  last_seen?: Date;
}

export interface AuthUser {
  id: number;
  username: string;
  displayName?: string | null;
  role: "user" | "superadmin";
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export interface PrivateZoneBounds {
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
}

export interface PrivateZone {
  id: string;
  name?: string;
  bounds: PrivateZoneBounds;
  createdAt?: number;
}

export interface Space {
  id: string;
  name: string;
  category: string; // e.g. "Town Square", "Hangout Lounges", or "Personal"
  ownerId: number;
  ownerUsername?: string;
  isPublic: boolean;
  isSuperadminSpace: boolean;
  whitelist: string[]; // usernames allowed if private
  tiles?: Record<string, string>;
  privateZones?: PrivateZone[];
  jukeboxes?: JukeboxState[];
  typewriters?: TypewriterState[];
  playerCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpacesListResponse {
  success: boolean;
  categories: string[];
  spaces: Space[];
  mySpace?: Space;
  error?: string;
}

export interface SpaceResponse {
  success: boolean;
  space?: Space;
  error?: string;
}

export type ChatRoomType = "map" | "zone" | "whisper";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  isSuperadmin?: boolean;
  roomType: ChatRoomType;
  roomId: string;
  roomName: string;
  targetId?: string;
  targetName?: string;
  text: string;
  timestamp: number;
}

export interface SendChatMessagePayload {
  roomType: ChatRoomType;
  roomId?: string;
  targetName?: string;
  text: string;
}

export type VoiceChannelType = "map" | "zone";

export interface VoicePeer {
  sessionId: string;
  name: string;
  color: string;
  isSuperadmin?: boolean;
  speaking?: boolean;
  channelType?: VoiceChannelType;
  channelId?: string;
}

export interface VoiceSignalPayload {
  targetSessionId: string;
  signal: any;
}

export interface JukeboxTrack {
  id: string; // Unique track queue ID (e.g. UUID)
  youtubeId: string; // 11-char YouTube Video ID (e.g. "dQw4w9WgXcQ")
  title: string; // Video title
  duration: number; // Duration in seconds (approx/reported)
  addedBySessionId: string; // Colyseus session ID
  addedByName: string; // Player display name
  addedAt: number; // Timestamp added (ms)
}

export interface JukeboxState {
  id: string; // Jukebox entity ID
  spaceId: string; // Space ID where jukebox is located
  x: number; // Freeform world X coordinate (pixels, NOT snapped to grid)
  y: number; // Freeform world Y coordinate (pixels, NOT snapped to grid)
  isPlaying: boolean; // Playback active
  currentTrackIndex: number; // Current index in playlist
  trackStartedAt: number; // Server timestamp (ms) when current track started
  playlist: JukeboxTrack[]; // Collaborative queue
  passable?: boolean; // Whether players can walk through it (default false = solid obstacle)
  ontop?: boolean; // Render on top of character (true) or behind character (false)
}

export interface JukeboxAddTrackPayload {
  jukeboxId: string;
  urlOrId: string;
}

export interface JukeboxAddPlaylistPayload {
  jukeboxId: string;
  playlistUrlOrId: string;
}

export interface JukeboxRemoveTrackPayload {
  jukeboxId: string;
  trackId: string;
}

export interface JukeboxSkipPayload {
  jukeboxId: string;
}

export interface JukeboxPlacePayload {
  x: number; // Freeform world X (pixels)
  y: number; // Freeform world Y (pixels)
  passable?: boolean;
  ontop?: boolean;
}

export interface JukeboxMovePayload {
  jukeboxId: string;
  x: number; // Freeform world X (pixels)
  y: number; // Freeform world Y (pixels)
}

export interface JukeboxDeletePayload {
  jukeboxId: string;
}

export interface TypewriterState {
  id: string; // Typewriter entity ID
  spaceId: string; // Space ID where typewriter is located
  x: number; // Freeform world X coordinate (pixels, NOT snapped to grid)
  y: number; // Freeform world Y coordinate (pixels, NOT snapped to grid)
  passable?: boolean; // Whether players can walk through it (default false = solid obstacle)
  ontop?: boolean; // Render on top of character (true) or behind character (false)
}

export interface TypewriterPlacePayload {
  x: number; // Freeform world X (pixels)
  y: number; // Freeform world Y (pixels)
  passable?: boolean;
  ontop?: boolean;
}

export interface TypewriterMovePayload {
  typewriterId: string;
  x: number; // Freeform world X (pixels)
  y: number; // Freeform world Y (pixels)
}

export interface TypewriterDeletePayload {
  typewriterId: string;
}

export type TypeRaceStatus = "waiting" | "starting" | "racing" | "ended";

export interface TypeRacePlayer {
  sessionId: string;
  userId?: number;
  name: string;
  color: string;
  isReady: boolean;
  isViewer: boolean; // True if joined while match in progress
  progress: number; // 0-100 percentage
  charsTyped: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  finishRank?: number;
  finishTime?: number; // Time in seconds
}

export interface TypeRaceResult {
  sessionId: string;
  name: string;
  color: string;
  wpm: number;
  accuracy: number;
  timeSeconds: number;
  rank: number;
}

export interface TypeRaceRoomState {
  typewriterId: string;
  status: TypeRaceStatus;
  quote: string;
  startTime: number;
  countdown: number;
  players: Record<string, TypeRacePlayer>;
  results?: TypeRaceResult[];
}

export interface TypeRaceJoinPayload {
  typewriterId: string;
}

export interface TypeRaceLeavePayload {
  typewriterId: string;
}

export interface TypeRaceReadyPayload {
  typewriterId: string;
  ready: boolean;
}

export interface TypeRaceProgressPayload {
  typewriterId: string;
  charsTyped: number;
  errors: number;
  finished: boolean;
  wpm: number;
  accuracy: number;
}

export interface TypeRacePlayAgainPayload {
  typewriterId: string;
}

export const FREEFORM_ASSET_KEYS = [
  "office_chair_150",
  "office_chair_back_150",
] as const;
export type FreeformAssetKey = (typeof FREEFORM_ASSET_KEYS)[number];

export function isFreeformAsset(assetKey: string | undefined | null): boolean {
  if (!assetKey) return false;
  const baseKey = assetKey.includes("|") ? assetKey.split("|")[0] : assetKey;
  return baseKey === "office_chair_150" || baseKey === "office_chair_back_150";
}

export interface FreeformDecorationData {
  id: string;
  assetKey: string;
  color?: string | null;
  x: number;
  y: number;
  passable: boolean;
  ontop: boolean;
}

export function parseFreeformTile(val: string): FreeformDecorationData | null {
  if (!val || typeof val !== "string") return null;
  const parts = val.split("::");
  if (parts.length < 2) return null;
  const [assetPart, colorPart] = parts[0].split("|");
  const coords = parts[1].split(",");
  if (coords.length < 2) return null;
  const x = parseFloat(coords[0]);
  const y = parseFloat(coords[1]);
  if (isNaN(x) || isNaN(y)) return null;

  const isPassable = !parts.includes("solid") && !parts.includes("obstacle");
  const isOntop = parts.includes("ontop") || parts.includes("above");

  return {
    id: "",
    assetKey: assetPart,
    color: colorPart && colorPart !== "none" ? colorPart : null,
    x,
    y,
    passable: isPassable,
    ontop: isOntop,
  };
}

export function serializeFreeformTile(
  assetKey: string,
  x: number,
  y: number,
  color?: string | null,
  passable: boolean = true,
  ontop: boolean = false
): string {
  const colPart = color ? color : "none";
  const passPart = passable ? "passable" : "solid";
  const layerPart = ontop ? "ontop" : "behind";
  return `${assetKey}|${colPart}::${Math.round(x)},${Math.round(y)}::${passPart}::${layerPart}`;
}

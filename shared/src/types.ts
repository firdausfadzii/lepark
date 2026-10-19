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

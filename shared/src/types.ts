export interface PlayerAvatars {
  idle?: string; // Standing still (data URL / base64)
  left?: string; // Standing left and moving left
  right?: string; // Standing right and moving right
  up?: string; // Standing up and moving up
  down?: string; // Standing down and moving down
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

export interface Space {
  id: string;
  name: string;
  category: string; // e.g. "Town Square", "Hangout Lounges", or "Personal"
  ownerId: number;
  ownerUsername?: string;
  isPublic: boolean;
  isSuperadminSpace: boolean;
  whitelist: string[]; // usernames allowed if private
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




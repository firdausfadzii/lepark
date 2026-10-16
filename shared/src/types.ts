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


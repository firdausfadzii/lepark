import { Schema, MapSchema, type } from "@colyseus/schema";
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from "./constants";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "Player";
  @type("string") color: string = "#3b82f6";
  @type("number") x: number = Math.floor(GRID_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
  @type("number") y: number = Math.floor(GRID_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;
  @type("string") direction: string = "idle";
  @type("boolean") isSuperadmin: boolean = false;
  @type("number") userId: number = 0;
  @type("string") userSpaceId: string = "";
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

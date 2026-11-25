import { Schema, MapSchema, type } from "@colyseus/schema";
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from "./constants";

export class OutfitSchema extends Schema {
  @type("string") shirtStyle: string = "short_sleeve";
  @type("string") shirtColor: string = "#ffffff";
  @type("string") sleeveColor: string = "";
  @type("string") pantsColor: string = "#2c3e50";
  @type("string") skinColor: string = "#faf3e8";
  @type("string") outerwearKey: string = "";
  @type("string") outerwearColor: string = "#e74c3c";
  @type("string") hatKey: string = "";
}

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
  @type("number") focusPoints: number = 0;
  @type("string") focusStatus: string = "none";
  @type("string") focusSquadId: string = "";
  @type("number") focusEndTime: number = 0;
  @type("string") rpgGearSignature: string = "";
  @type(OutfitSchema) outfit: OutfitSchema = new OutfitSchema();
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

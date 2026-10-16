import { Schema, MapSchema, type } from "@colyseus/schema";
import { WORLD_WIDTH, WORLD_HEIGHT } from "./constants";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "Player";
  @type("string") color: string = "#3b82f6";
  @type("number") x: number = WORLD_WIDTH / 2; // 960
  @type("number") y: number = WORLD_HEIGHT / 2; // 540
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

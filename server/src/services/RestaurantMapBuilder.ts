import { GRID_COLS, GRID_ROWS, TILE_SIZE, serializeFreeformTile } from "shared";

/**
 * Generates the "Saffron & Hearth Bistro" restaurant layout as Lepark space tiles
 * based on assets/restaurant_phaser3_map_48px.json (48x36 grid at 50px per tile).
 */
export function buildRestaurantBistroTiles(): Record<string, string> {
  const tiles: Record<string, string> = {};

  // 1. Base flooring per zone
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // Exterior terrace (bottom sidewalk y >= 1584 -> row >= 32)
      if (row >= 32) {
        tiles[`${col},${row}`] = "stone_2";
        continue;
      }
      // Outer grass border outside building (col 0, col 47, row 0)
      if (col === 0 || col === 47 || row === 0) {
        tiles[`${col},${row}`] = "grass_4";
        continue;
      }
      // Commercial Kitchen (Z4: cols 2..33, rows 2..12)
      if (col >= 2 && col <= 33 && row >= 2 && row <= 12) {
        tiles[`${col},${row}`] = "stone_4";
        continue;
      }
      // Walk-in Chiller, Pantry & Staff Room (Z6: cols 34..45, rows 2..12)
      if (col >= 34 && col <= 45 && row >= 2 && row <= 12) {
        tiles[`${col},${row}`] = "stone_1";
        continue;
      }
      // VIP Private Dining & Wine Salon (Z5: cols 38..45, rows 13..30)
      if (col >= 38 && col <= 45 && row >= 13 && row <= 30) {
        tiles[`${col},${row}`] = "carpet_4";
        continue;
      }
      // Beverage Bar corner (Z3: cols 29..36, rows 17..20)
      if (col >= 29 && col <= 36 && row >= 17 && row <= 20) {
        tiles[`${col},${row}`] = "marble_2";
        continue;
      }
      // Main Dining Hall (Z2)
      tiles[`${col},${row}`] = "wood_4";
    }
  }

  // Helper to mark wall obstacle cells cleanly
  const setWall = (col: number, row: number, wallKey = "wood_wall_7") => {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    tiles[`${col},${row}`] = `${wallKey}::obstacle`;
  };

  // 2. Outer perimeter walls
  // North wall (row 1), leaving rear delivery door open at cols 38..40
  for (let c = 1; c <= 46; c++) {
    if (c >= 38 && c <= 40) continue;
    setWall(c, 1, "wood_wall_7");
  }
  // West wall (col 1) & East wall (col 46), rows 1..31
  for (let r = 1; r <= 31; r++) {
    setWall(1, r, "wood_wall_8");
    setWall(46, r, "wood_wall_8");
  }
  // South storefront wall (row 31), leaving Main Double Entrance open at cols 22..25
  for (let c = 1; c <= 46; c++) {
    if (c >= 22 && c <= 25) continue;
    if (c % 3 === 0) {
      setWall(c, 31, "glass_1");
    } else {
      setWall(c, 31, "wood_wall_7");
    }
  }

  // 3. Interior partition walls
  // Kitchen/Dining divider wall (row 13):
  // - cols 2..7 solid
  // - cols 8..9 open (Kitchen IN door)
  // - cols 10..22 open/expo pass counter occupies 12..21 (counter itself is solid prop!)
  // - col 23 pier, cols 24..25 open (Kitchen OUT door), cols 26..45 solid
  for (let c = 2; c <= 7; c++) setWall(c, 13, "wood_wall_7");
  for (let c = 10; c <= 11; c++) setWall(c, 13, "wood_wall_7");
  setWall(22, 13, "wood_wall_7");
  setWall(23, 13, "wood_wall_7");
  for (let c = 26; c <= 45; c++) setWall(c, 13, "wood_wall_7");

  // Kitchen / Pantry vertical divider (col 34, rows 2..12, doorway at rows 7..8)
  for (let r = 2; r <= 12; r++) {
    if (r === 7 || r === 8) continue;
    setWall(34, r, "wood_wall_8");
  }

  // Dining / VIP vertical divider (col 37, rows 14..30, archways at rows 14..16 and 26..27)
  for (let r = 14; r <= 30; r++) {
    if ((r >= 14 && r <= 16) || (r >= 26 && r <= 27)) continue;
    setWall(37, r, "wood_wall_8");
  }

  // 4. Spawn Point (Head Waiter / Player arrival in Central Service Spine)
  tiles["spawn_point"] = "24,25";

  // 5. Freeform Restaurant Props
  let propIdx = 1;
  const addProp = (
    assetKey: string,
    x: number,
    y: number,
    passable = false,
    ontop = false,
    layer = 0,
    flipX = false
  ) => {
    const id = `freeform:rest_${propIdx++}`;
    tiles[id] = serializeFreeformTile(
      `restaurant/${assetKey}`,
      x,
      y,
      null,
      passable,
      ontop,
      layer,
      null,
      flipX
    );
  };

  // Exterior Entrance Props
  addProp("rest_waiting_bench", 792, 1615, false);
  addProp("rest_planter_olive", 1010, 1620, false);
  addProp("rest_menu_podium", 1392, 1615, false);
  addProp("rest_planter_olive", 1560, 1620, false);

  // Hostess Podium & Greeting Counter (near main entrance)
  addProp("rest_hostess_podium", 960, 1488, false);

  // Heated Expo & Plating Pass Counter (separating kitchen & dining)
  addProp("rest_expo_pass_counter", 850, 675, false);

  // Main Dining Tables (#1 - #10) + Chairs
  const addDiningSet = (
    x: number,
    y: number,
    isBooth = false
  ) => {
    if (isBooth) {
      addProp("rest_booth_table", x, y, false);
      addProp("rest_booth_sofa", x - 64, y, false, false, 0, false);
      addProp("rest_booth_sofa", x + 64, y, false, false, 0, true);
    } else {
      addProp("rest_dining_chair_front", x - 22, y - 42, false);
      addProp("rest_dining_chair_front", x + 22, y - 42, false);
      addProp("rest_dining_table", x, y, false);
      addProp("rest_dining_chair_back", x - 22, y + 40, false, true, 1);
      addProp("rest_dining_chair_back", x + 22, y + 40, false, true, 1);
    }
  };

  // West Dining Column (#1 - #3)
  addDiningSet(336, 912, true);
  addDiningSet(336, 1152, false);
  addDiningSet(336, 1392, false);

  // Center Dining Column (#4 - #6)
  addDiningSet(672, 912, false);
  addDiningSet(672, 1152, false);
  addDiningSet(672, 1392, false);

  // Spine-Side Dining Column (#7 - #8)
  addDiningSet(1008, 912, false);
  addDiningSet(1008, 1152, false);

  // East Dining Column (#9 - #10)
  addDiningSet(1536, 1200, false);
  addDiningSet(1536, 1440, false);

  // Bistro Decorative Rugs & Trees
  addProp("rest_bistro_rug", 1225, 1320, true, false, -1);
  addProp("rest_bistro_tree", 145, 760, false);
  addProp("rest_bistro_tree", 145, 1460, false);
  addProp("rest_bistro_tree", 1800, 760, false);

  // Waiter Service Stations
  addProp("rest_waiter_pos_h", 1020, 1340, false);
  addProp("rest_waiter_pos_v", 1770, 1250, false);

  // Espresso & Beverage Bar (Z3)
  addProp("rest_espresso_backbar", 1630, 825, false);
  addProp("rest_beverage_bar_counter", 1620, 960, false);
  addProp("rest_bar_stool", 1520, 1015, false);
  addProp("rest_bar_stool", 1590, 1015, false);
  addProp("rest_bar_stool", 1660, 1015, false);
  addProp("rest_bar_stool", 1730, 1015, false);

  // Commercial Kitchen Equipment (Z4)
  addProp("rest_commercial_dishwasher", 150, 260, false);
  addProp("rest_scullery_sink", 150, 370, false);
  addProp("rest_dish_drop_counter", 240, 490, false);
  addProp("rest_pizza_oven", 390, 155, false);
  addProp("rest_gas_range", 670, 155, false);
  addProp("rest_grill_station", 790, 155, false);
  addProp("rest_deep_fryer", 900, 155, false);
  addProp("rest_central_plating_island", 840, 400, false);
  addProp("rest_pastry_bench", 1360, 155, false);
  addProp("rest_garde_manger", 1360, 400, false);

  // VIP Private Dining & Wine Salon (Z5)
  addProp("rest_vip_banquet_table", 2090, 936, false);
  addProp("rest_vip_armchair_front", 2050, 882, false);
  addProp("rest_vip_armchair_front", 2130, 882, false);
  addProp("rest_vip_armchair_back", 2050, 990, false, true, 1);
  addProp("rest_vip_armchair_back", 2130, 990, false, true, 1);

  addProp("rest_vip_banquet_table", 2090, 1224, false);
  addProp("rest_vip_armchair_front", 2050, 1170, false);
  addProp("rest_vip_armchair_front", 2130, 1170, false);
  addProp("rest_vip_armchair_back", 2050, 1278, false, true, 1);
  addProp("rest_vip_armchair_back", 2130, 1278, false, true, 1);

  addProp("rest_wine_cellar_rack", 2265, 1020, false);
  addProp("rest_vip_sideboard", 2100, 1488, false);

  // Pantry & Staff Room (Z6)
  addProp("rest_pantry_dry_shelf", 1810, 165, false);
  addProp("rest_walkin_cooler_door", 2160, 165, false);
  addProp("rest_staff_break_table", 2150, 500, false);
  addProp("rest_staff_locker", 2260, 320, false);

  return tiles;
}

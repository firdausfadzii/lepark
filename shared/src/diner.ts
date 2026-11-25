export type DinerCustomerSpriteType =
  | "office_man"
  | "office_lady"
  | "student"
  | "hipster_barista"
  | "senior_gentleman"
  | "gourmet_vip";

export type DinerDirection = "south" | "west" | "east" | "north";

export type DinerCustomerStatus =
  | "entering"
  | "queued"
  | "walking_to_table"
  | "thinking"
  | "ready_to_order"
  | "waiting_for_food"
  | "eating"
  | "leaving";

export type DinerPatiencePhase = "none" | "queue" | "order" | "food";

export type DinerCustomerEmotion =
  | "happy"
  | "neutral"
  | "impatient"
  | "angry"
  | "eating";

export interface DinerCustomerProfile {
  spriteType: DinerCustomerSpriteType;
  label: string;
  names: readonly string[];
  maxFp: number;
  queuePatienceMs: number;
  orderPatienceMs: number;
  foodPatienceMs: number;
  walkSpeed: number;
  spawnWeight: number;
}

export const DINER_CUSTOMER_PROFILES: readonly DinerCustomerProfile[] = [
  {
    spriteType: "office_man",
    label: "Office Man",
    names: ["Marcus", "Daniel", "Kenji", "Farid"],
    maxFp: 3,
    queuePatienceMs: 24000,
    orderPatienceMs: 21000,
    foodPatienceMs: 28000,
    walkSpeed: 132,
    spawnWeight: 22,
  },
  {
    spriteType: "office_lady",
    label: "Office Lady",
    names: ["Claire", "Aina", "Rachel", "Yuna"],
    maxFp: 3,
    queuePatienceMs: 25000,
    orderPatienceMs: 22000,
    foodPatienceMs: 29000,
    walkSpeed: 130,
    spawnWeight: 22,
  },
  {
    spriteType: "student",
    label: "Student",
    names: ["Leo", "Hana", "Zack", "Nadia"],
    maxFp: 2,
    queuePatienceMs: 28000,
    orderPatienceMs: 25000,
    foodPatienceMs: 32000,
    walkSpeed: 145,
    spawnWeight: 22,
  },
  {
    spriteType: "hipster_barista",
    label: "Artist Regular",
    names: ["Jude", "Milo", "Sora", "Tara"],
    maxFp: 2,
    queuePatienceMs: 26000,
    orderPatienceMs: 24000,
    foodPatienceMs: 30000,
    walkSpeed: 128,
    spawnWeight: 16,
  },
  {
    spriteType: "senior_gentleman",
    label: "Gentleman",
    names: ["Arthur", "Pakcik", "Walter", "Hector"],
    maxFp: 3,
    queuePatienceMs: 30000,
    orderPatienceMs: 26000,
    foodPatienceMs: 34000,
    walkSpeed: 105,
    spawnWeight: 10,
  },
  {
    spriteType: "gourmet_vip",
    label: "Gourmet VIP",
    names: ["Lady V", "Chef Julian", "Victoria", "Darius"],
    maxFp: 4,
    queuePatienceMs: 20000,
    orderPatienceMs: 18000,
    foodPatienceMs: 24000,
    walkSpeed: 126,
    spawnWeight: 8,
  },
];

export interface DinerMenuDish {
  id: string;
  name: string;
  shortName: string;
  cookTimeMs: number;
  color: string;
  accentColor: string;
}

export const DINER_MENU_DISHES: readonly DinerMenuDish[] = [
  {
    id: "truffle_pasta",
    name: "Truffle Pasta",
    shortName: "Pasta",
    cookTimeMs: 4800,
    color: "#fbbf24",
    accentColor: "#92400e",
  },
  {
    id: "hearth_pizza",
    name: "Hearth Pizza",
    shortName: "Pizza",
    cookTimeMs: 5600,
    color: "#f97316",
    accentColor: "#dc2626",
  },
  {
    id: "seared_salmon",
    name: "Seared Salmon",
    shortName: "Salmon",
    cookTimeMs: 5400,
    color: "#fb7185",
    accentColor: "#10b981",
  },
  {
    id: "bistro_burger",
    name: "Bistro Burger",
    shortName: "Burger",
    cookTimeMs: 4500,
    color: "#d97706",
    accentColor: "#65a30d",
  },
  {
    id: "caesar_salad",
    name: "Garden Salad",
    shortName: "Salad",
    cookTimeMs: 3800,
    color: "#4ade80",
    accentColor: "#facc15",
  },
  {
    id: "berry_tart",
    name: "Bistro Tart",
    shortName: "Tart",
    cookTimeMs: 4200,
    color: "#e879f9",
    accentColor: "#fef08a",
  },
];

export const DINER_MAX_CARRIED_ITEMS = 2;
export const DINER_MAX_QUEUE_LENGTH = 5;
export const DINER_HOSTESS_INTERACT_RANGE = 88;
export const DINER_KITCHEN_INTERACT_RANGE = 86;
export const DINER_TABLE_INTERACT_RANGE = 82;

export interface DinerPointAnchor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DinerTableState {
  id: string;
  tableNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  seatX: number;
  seatY: number;
  seatDir: DinerDirection;
  occupiedByCustomerId: string | null;
}

export interface DinerCustomerState {
  id: string;
  name: string;
  spriteType: DinerCustomerSpriteType;
  status: DinerCustomerStatus;
  x: number;
  y: number;
  direction: DinerDirection;
  isMoving: boolean;
  queueIndex: number;
  tableId: string | null;
  tableNumber: number | null;
  dishId: string;
  dishName: string;
  maxFp: number;
  expectedFp: number;
  patienceRatio: number;
  patiencePhase: DinerPatiencePhase;
  emotion: DinerCustomerEmotion;
}

export interface DinerCarriedItem {
  id: string;
  kind: "ticket" | "dish";
  customerId: string;
  tableNumber: number;
  dishId: string;
  dishName: string;
}

export interface DinerEmployeeState {
  sessionId: string;
  userId: number;
  name: string;
  color: string;
  carriedItems: DinerCarriedItem[];
  earnedFp: number;
  customersServed: number;
}

export interface DinerKitchenOrder {
  id: string;
  customerId: string;
  tableNumber: number;
  dishId: string;
  dishName: string;
  status: "cooking" | "ready";
  startedAt: number;
  readyAt: number;
  progress: number;
  slotIndex: number;
}

export interface DinerGameState {
  enabled: boolean;
  isPlaying: boolean;
  hostessPodium: DinerPointAnchor | null;
  kitchenCounter: DinerPointAnchor | null;
  entrancePoint: { x: number; y: number };
  employees: Record<string, DinerEmployeeState>;
  tables: DinerTableState[];
  customers: DinerCustomerState[];
  kitchenOrders: DinerKitchenOrder[];
  shiftTotalFp: number;
  shiftServedCount: number;
  shiftLostCount: number;
}

export type DinerActionErrorCode =
  | "NO_EMPTY_TABLE"
  | "HANDS_FULL"
  | "NO_QUEUE"
  | "TOO_FAR"
  | "NOT_EMPLOYEE"
  | "ALREADY_EMPLOYEE"
  | "NOTHING_TO_DO"
  | "NOT_ENABLED";

export interface DinerActionErrorPayload {
  code: DinerActionErrorCode;
  message: string;
}

export type DinerEventKind =
  | "shift_started"
  | "shift_ended"
  | "employee_joined"
  | "employee_left"
  | "seated"
  | "order_taken"
  | "order_submitted"
  | "food_ready"
  | "food_picked_up"
  | "food_delivered"
  | "customer_paid"
  | "customer_left_angry";

export interface DinerEventPayload {
  kind: DinerEventKind;
  message: string;
  x?: number;
  y?: number;
  fp?: number;
  tableNumber?: number;
  customerId?: string;
  actorSessionId?: string;
}

/**
 * Calculates Focus Points (FP) paid by a customer based on their max FP
 * and how much food patience remains when served.
 * Customers waiting for food never leave, instead paying progressively less.
 * Balanced against Pomodoro focus rate (4 FP/min base, 100-250 FP per 25m session).
 */
export function calculateDinerCustomerFp(maxFp: number, foodPatienceRatio: number): number {
  const ratio = Math.max(0, Math.min(1, foodPatienceRatio));
  if (ratio >= 0.65) return maxFp;
  if (ratio >= 0.35) return Math.max(1, maxFp - 1);
  if (ratio >= 0.1) return Math.max(1, Math.floor(maxFp * 0.5));
  return 1;
}

/**
 * Computes shortest Euclidean distance from a point (px, py) to an axis-aligned box.
 */
export function distanceToAnchorBox(
  px: number,
  py: number,
  box: { x: number; y: number; width: number; height: number }
): number {
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  const cx = Math.max(box.x - halfW, Math.min(box.x + halfW, px));
  const cy = Math.max(box.y - halfH, Math.min(box.y + halfH, py));
  return Math.hypot(px - cx, py - cy);
}

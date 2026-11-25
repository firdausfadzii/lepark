"""
Generates crisp, shaded, multi-frame pixel-art spritesheets (RGBA PNGs)
for Netherworld Focus RPG enemies, bosses, special encounters, and squad heroes.
Outputs into client/public/assets/sprites/enemies/.
"""
import os
import struct
import zlib

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "client",
    "public",
    "assets",
    "sprites",
    "enemies",
)


def write_png(path: str, width: int, height: int, rgba_rows: list[bytes]) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack("!I", len(data))
            + tag
            + data
            + struct.pack("!I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b"".join(b"\x00" + row for row in rgba_rows)
    ihdr = struct.pack("!IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)


class Canvas:
    def __init__(self, w: int, h: int):
        self.w = w
        self.h = h
        self.px = [[(0, 0, 0, 0) for _ in range(w)] for _ in range(h)]

    def set(self, x: int, y: int, color: tuple[int, int, int, int]) -> None:
        if 0 <= x < self.w and 0 <= y < self.h and color[3] > 0:
            self.px[y][x] = color

    def rect(self, x: int, y: int, w: int, h: int, color: tuple[int, int, int, int]) -> None:
        for dy in range(h):
            for dx in range(w):
                self.set(x + dx, y + dy, color)

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int]) -> None:
        for y in range(self.h):
            for x in range(self.w):
                nx = (x - cx) / max(0.5, rx)
                ny = (y - cy) / max(0.5, ry)
                if nx * nx + ny * ny <= 1.0:
                    self.set(x, y, color)

    def line(self, x0: int, y0: int, x1: int, y1: int, color: tuple[int, int, int, int]) -> None:
        dx = abs(x1 - x0)
        dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            self.set(x0, y0, color)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def add_outline(self, outline_color=(20, 14, 24, 255)) -> None:
        to_outline = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x][3] == 0:
                    for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + ox, y + oy
                        if 0 <= nx < self.w and 0 <= ny < self.h and self.px[ny][nx][3] > 0:
                            to_outline.append((x, y))
                            break
        for x, y in to_outline:
            self.px[y][x] = outline_color

    def flash_hit(self) -> None:
        for y in range(self.h):
            for x in range(self.w):
                r, g, b, a = self.px[y][x]
                if a > 0:
                    self.px[y][x] = (
                        min(255, int(r * 0.45 + 150)),
                        min(255, int(g * 0.25 + 30)),
                        min(255, int(b * 0.25 + 30)),
                        a,
                    )


def make_strip(frames: list[Canvas], out_path: str) -> None:
    fw = frames[0].w
    fh = frames[0].h
    total_w = fw * len(frames)
    rows: list[bytes] = []
    for y in range(fh):
        row = bytearray()
        for f in frames:
            for x in range(fw):
                r, g, b, a = f.px[y][x]
                row.extend((r, g, b, a))
        rows.append(bytes(row))
    write_png(out_path, total_w, fh, rows)


# Color helpers
C = lambda h, a=255: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), a)

OL = C("#15101b")
WHITE = C("#fff8f0")
RED = C("#ef4444")
GOLD = C("#fbbf24")
GOLD_D = C("#b45309")


# ============================================================
# 1. SMALL ORC (32x32, facing left)
# ============================================================
def draw_small_orc(frame: int) -> Canvas:
    c = Canvas(32, 32)
    bob = 1 if frame == 1 else 0
    lunge = -3 if frame == 2 else (2 if frame == 3 else 0)
    ox = lunge
    oy = bob

    skin = C("#5ea844")
    skin_d = C("#3b7329")
    skin_l = C("#8cd466")
    leather = C("#6b4423")
    leather_d = C("#452911")
    wood = C("#8a5a32")
    wood_d = C("#59361a")
    iron = C("#94a3b8")

    # Feet
    c.rect(12 + ox, 26 + oy, 3, 3, skin_d)
    c.rect(18 + ox, 26 + oy, 3, 3, skin_d)
    # Loincloth & legs
    c.rect(11 + ox, 22 + oy, 11, 4, leather_d)
    c.rect(12 + ox, 21 + oy, 9, 2, leather)
    c.set(16 + ox, 21 + oy, GOLD)  # belt buckle

    # Torso
    c.ellipse(16 + ox, 18 + oy, 5.5, 4.5, skin)
    c.rect(13 + ox, 15 + oy, 5, 3, skin_l)
    c.rect(12 + ox, 20 + oy, 9, 1, leather)

    # Pointed ears (facing left)
    c.line(19 + ox, 10 + oy, 24 + ox, 8 + oy, skin_d)
    c.line(19 + ox, 11 + oy, 23 + ox, 10 + oy, skin)
    c.line(10 + ox, 10 + oy, 7 + ox, 9 + oy, skin_d)

    # Head
    c.ellipse(15 + ox, 11 + oy, 5.5, 4.8, skin)
    c.ellipse(14 + ox, 9 + oy, 3.5, 2.5, skin_l)

    # Angry brow & red eyes
    c.rect(11 + ox, 9 + oy, 4, 1, skin_d)
    c.rect(12 + ox, 10 + oy, 2, 2, RED)
    c.set(12 + ox, 10 + oy, WHITE)

    # Jaw & little ivory tusks
    c.rect(10 + ox, 13 + oy, 6, 2, skin_d)
    c.rect(10 + ox, 12 + oy, 1, 2, WHITE)
    c.rect(13 + ox, 12 + oy, 1, 2, WHITE)

    # Arm + Wooden spiked club
    if frame == 2:
        # Swing forward
        c.rect(7 + ox, 15 + oy, 5, 3, skin)
        c.line(8 + ox, 16 + oy, 2 + ox, 10 + oy, wood)
        c.ellipse(3 + ox, 10 + oy, 2.5, 2.5, wood_d)
        c.set(1 + ox, 9 + oy, iron)
        c.set(3 + ox, 7 + oy, iron)
    else:
        c.rect(9 + ox, 16 + oy, 4, 4, skin)
        c.line(9 + ox, 18 + oy, 5 + ox, 11 + oy, wood)
        c.ellipse(5 + ox, 11 + oy, 2.2, 2.8, wood_d)
        c.set(3 + ox, 10 + oy, iron)
        c.set(6 + ox, 9 + oy, iron)

    # Back arm
    c.rect(19 + ox, 16 + oy, 3, 4, skin_d)

    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


# ============================================================
# 2. BAT (32x32, facing left)
# ============================================================
def draw_bat(frame: int) -> Canvas:
    c = Canvas(32, 32)
    oy = -2 if frame == 0 else (1 if frame == 1 else (-1 if frame == 2 else 2))
    ox = -3 if frame == 2 else (2 if frame == 3 else 0)

    body = C("#6d28d9")
    body_d = C("#4c1d95")
    body_l = C("#8b5cf6")
    wing = C("#3b0764")
    wing_m = C("#581c87")

    # Wings
    if frame in (0, 2):
        # Wings up
        c.line(14 + ox, 13 + oy, 6 + ox, 6 + oy, wing)
        c.line(14 + ox, 14 + oy, 7 + ox, 9 + oy, wing_m)
        c.rect(7 + ox, 8 + oy, 6, 5, wing_m)
        c.line(18 + ox, 13 + oy, 26 + ox, 6 + oy, wing)
        c.line(18 + ox, 14 + oy, 25 + ox, 9 + oy, wing_m)
        c.rect(19 + ox, 8 + oy, 6, 5, wing_m)
    else:
        # Wings down
        c.line(13 + ox, 14 + oy, 5 + ox, 20 + oy, wing)
        c.rect(7 + ox, 14 + oy, 6, 5, wing_m)
        c.line(19 + ox, 14 + oy, 27 + ox, 20 + oy, wing)
        c.rect(19 + ox, 14 + oy, 6, 5, wing_m)

    # Ears
    c.line(13 + ox, 10 + oy, 12 + ox, 6 + oy, body_d)
    c.line(18 + ox, 10 + oy, 19 + ox, 6 + oy, body_d)
    c.set(13 + ox, 8 + oy, C("#f472b6"))
    c.set(18 + ox, 8 + oy, C("#f472b6"))

    # Fuzzy body
    c.ellipse(16 + ox, 15 + oy, 4.5, 5.2, body)
    c.ellipse(15 + ox, 13 + oy, 3.0, 3.0, body_l)
    c.rect(14 + ox, 17 + oy, 4, 3, body_d)

    # Glowing red eyes (shifted slightly left)
    c.rect(12 + ox, 13 + oy, 2, 2, RED)
    c.rect(16 + ox, 13 + oy, 2, 2, RED)
    c.set(12 + ox, 13 + oy, GOLD)
    c.set(16 + ox, 13 + oy, GOLD)

    # Fangs
    c.set(13 + ox, 16 + oy, WHITE)
    c.set(16 + ox, 16 + oy, WHITE)

    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


# ============================================================
# 3. PIG / BOAR (32x32, facing left)
# ============================================================
def draw_pig(frame: int) -> Canvas:
    c = Canvas(32, 32)
    oy = 1 if frame == 1 else 0
    ox = -3 if frame == 2 else (2 if frame == 3 else 0)

    pink = C("#f472b6")
    pink_l = C("#fbcfe8")
    pink_d = C("#db2777")
    snout = C("#be185d")
    hoof = C("#3f2e21")

    # Curly tail
    c.set(24 + ox, 16 + oy, pink_d)
    c.set(25 + ox, 15 + oy, pink)
    c.set(25 + ox, 17 + oy, pink_d)

    # Legs / hooves
    leg_off = 1 if frame == 2 else 0
    c.rect(10 + ox - leg_off, 23 + oy, 3, 4, pink_d)
    c.rect(10 + ox - leg_off, 26 + oy, 3, 1, hoof)
    c.rect(19 + ox + leg_off, 23 + oy, 3, 4, pink_d)
    c.rect(19 + ox + leg_off, 26 + oy, 3, 1, hoof)

    # Chubby body
    c.ellipse(17 + ox, 18 + oy, 7.5, 6.0, pink)
    c.ellipse(16 + ox, 15 + oy, 5.0, 3.0, pink_l)
    c.ellipse(17 + ox, 21 + oy, 6.0, 2.5, pink_d)

    # Head
    c.ellipse(11 + ox, 16 + oy, 5.2, 5.0, pink)
    c.ellipse(11 + ox, 14 + oy, 3.5, 2.5, pink_l)

    # Ears
    c.rect(12 + ox, 10 + oy, 3, 3, pink_d)
    c.set(13 + ox, 11 + oy, pink)

    # Snout
    c.ellipse(6 + ox, 17 + oy, 2.4, 2.2, snout)
    c.set(5 + ox, 17 + oy, OL)
    c.set(7 + ox, 17 + oy, OL)

    # Fierce eye + tiny tusk
    c.rect(9 + ox, 14 + oy, 2, 2, WHITE)
    c.set(9 + ox, 15 + oy, OL)
    c.line(8 + ox, 13 + oy, 11 + ox, 14 + oy, pink_d)
    c.rect(7 + ox, 19 + oy, 2, 1, WHITE)
    c.set(7 + ox, 18 + oy, WHITE)

    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


# ============================================================
# 4. SLIME (32x32, facing left)
# ============================================================
def draw_slime(frame: int) -> Canvas:
    c = Canvas(32, 32)
    ox = -3 if frame == 2 else (2 if frame == 3 else 0)
    rx = 8.5 if frame in (1, 3) else (7.5 if frame == 0 else 8.0)
    ry = 5.5 if frame in (1, 3) else (7.0 if frame == 0 else 6.5)
    cy = 22 if frame in (1, 3) else 20

    gel = C("#10b981")
    gel_l = C("#6ee7b7")
    gel_d = C("#047857")

    c.ellipse(16 + ox, cy, rx, ry, gel)
    c.ellipse(16 + ox, cy + 2, rx - 1, ry - 2, gel_d)
    c.ellipse(15 + ox, cy - 1, rx - 2, ry - 2.5, gel)
    # Glossy shine
    c.rect(12 + ox, int(cy - ry + 2), 3, 2, gel_l)
    c.set(11 + ox, int(cy - ry + 4), WHITE)
    # Crown droplet on top
    if frame != 3:
        c.rect(15 + ox, int(cy - ry - 2), 2, 3, gel)
        c.set(15 + ox, int(cy - ry - 2), gel_l)

    # Eyes (facing left)
    c.rect(11 + ox, cy - 1, 2, 3, OL)
    c.rect(16 + ox, cy - 1, 2, 3, OL)
    c.set(11 + ox, cy - 1, WHITE)
    c.set(16 + ox, cy - 1, WHITE)
    # Mouth
    if frame == 2:
        c.rect(12 + ox, cy + 3, 4, 2, OL)
        c.set(13 + ox, cy + 3, WHITE)

    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


# ============================================================
# 5. BOSS: MINOTAUR (48x48, facing left)
# ============================================================
def draw_minotaur(frame: int) -> Canvas:
    c = Canvas(48, 48)
    oy = 1 if frame == 1 else 0
    ox = -2 if frame == 2 else (2 if frame == 3 else 0)

    fur = C("#92400e")
    fur_d = C("#5c280a")
    fur_l = C("#b45309")
    horn = C("#fef3c7")
    horn_d = C("#d97706")
    steel = C("#cbd5e1")
    steel_d = C("#64748b")
    belt = C("#451a03")

    # Massive legs & hooves
    c.rect(17 + ox, 36 + oy, 5, 8, fur_d)
    c.rect(16 + ox, 42 + oy, 6, 3, OL)
    c.rect(26 + ox, 36 + oy, 5, 8, fur_d)
    c.rect(26 + ox, 42 + oy, 6, 3, OL)

    # Loincloth & spiked belt
    c.rect(16 + ox, 32 + oy, 16, 5, belt)
    c.rect(21 + ox, 33 + oy, 6, 6, C("#7f1d1d"))
    c.rect(22 + ox, 32 + oy, 4, 2, GOLD)

    # Muscular chest & shoulders
    c.ellipse(24 + ox, 24 + oy, 10.5, 9.0, fur)
    c.ellipse(22 + ox, 22 + oy, 6.5, 5.5, fur_l)
    c.rect(23 + ox, 19 + oy, 2, 8, fur_d)  # chest line
    c.ellipse(15 + ox, 19 + oy, 4.0, 4.0, fur_l)
    c.ellipse(33 + ox, 20 + oy, 4.0, 4.0, fur_d)

    # Bull Head
    c.ellipse(21 + ox, 13 + oy, 6.5, 6.0, fur)
    c.ellipse(19 + ox, 11 + oy, 4.0, 3.0, fur_l)
    # Snout + gold nose ring
    c.ellipse(16 + ox, 16 + oy, 4.0, 2.8, fur_d)
    c.rect(13 + ox, 17 + oy, 3, 3, GOLD)
    c.set(14 + ox, 18 + oy, fur_d)

    # Curved Horns
    c.line(18 + ox, 8 + oy, 11 + ox, 4 + oy, horn)
    c.line(18 + ox, 9 + oy, 12 + ox, 5 + oy, horn_d)
    c.set(11 + ox, 3 + oy, WHITE)
    c.line(25 + ox, 8 + oy, 32 + ox, 4 + oy, horn)
    c.line(25 + ox, 9 + oy, 31 + ox, 5 + oy, horn_d)
    c.set(32 + ox, 3 + oy, WHITE)

    # Glowing amber eyes
    c.rect(16 + ox, 12 + oy, 3, 2, GOLD)
    c.set(16 + ox, 12 + oy, WHITE)

    # Giant Double-Headed Battleaxe
    if frame == 2:
        # Sweeping forward slam
        c.rect(12 + ox, 20 + oy, 6, 4, fur)
        c.line(13 + ox, 22 + oy, 8 + ox, 36 + oy, C("#78350f"))
        c.ellipse(8 + ox, 32 + oy, 5.0, 6.0, steel)
        c.ellipse(8 + ox, 32 + oy, 2.5, 3.5, steel_d)
        c.line(4 + ox, 28 + oy, 4 + ox, 36 + oy, WHITE)
    else:
        c.rect(11 + ox, 21 + oy, 5, 6, fur)
        c.line(11 + ox, 25 + oy, 7 + ox, 8 + oy, C("#78350f"))
        c.ellipse(7 + ox, 11 + oy, 5.5, 6.0, steel)
        c.ellipse(8 + ox, 11 + oy, 2.5, 3.5, steel_d)
        c.line(3 + ox, 7 + oy, 2 + ox, 15 + oy, WHITE)

    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


# ============================================================
# 6. BOSS: BIG ORC (48x48, facing left)
# ============================================================
def draw_big_orc(frame: int) -> Canvas:
    c = Canvas(48, 48)
    oy = 1 if frame == 1 else 0
    ox = -2 if frame == 2 else (2 if frame == 3 else 0)

    skin = C("#4d7c0f")
    skin_l = C("#84cc16")
    skin_d = C("#365314")
    armor = C("#475569")
    armor_l = C("#94a3b8")
    armor_d = C("#1e293b")
    crimson = C("#991b1b")

    # Heavy Boots
    c.rect(16 + ox, 37 + oy, 6, 7, armor_d)
    c.rect(26 + ox, 37 + oy, 6, 7, armor_d)
    c.rect(15 + ox, 42 + oy, 7, 2, armor)
    c.rect(26 + ox, 42 + oy, 7, 2, armor)

    # Armored Waist + Crimson War Skirt
    c.rect(15 + ox, 31 + oy, 18, 7, crimson)
    c.rect(15 + ox, 30 + oy, 18, 3, armor_d)
    c.rect(21 + ox, 30 + oy, 6, 3, GOLD_D)
    c.rect(22 + ox, 30 + oy, 4, 2, GOLD)

    # Hulking Torso
    c.ellipse(24 + ox, 23 + oy, 11.0, 9.0, skin)
    c.ellipse(22 + ox, 21 + oy, 7.0, 5.0, skin_l)
    # Shoulder Iron Pauldrons with spikes
    c.ellipse(14 + ox, 18 + oy, 5.0, 4.5, armor)
    c.ellipse(13 + ox, 17 + oy, 3.0, 2.0, armor_l)
    c.line(12 + ox, 14 + oy, 10 + ox, 11 + oy, armor_l)
    c.ellipse(34 + ox, 19 + oy, 4.5, 4.0, armor_d)
    c.line(35 + ox, 15 + oy, 37 + ox, 12 + oy, armor)

    # Head & War Mohawk/Helm
    c.ellipse(22 + ox, 12 + oy, 6.8, 6.0, skin)
    c.ellipse(21 + ox, 10 + oy, 4.5, 3.0, skin_l)
    # Pointed Orc Ears
    c.line(28 + ox, 11 + oy, 34 + ox, 8 + oy, skin_d)
    c.line(28 + ox, 12 + oy, 33 + ox, 10 + oy, skin)
    # Iron Crown / Brow Plate
    c.rect(16 + ox, 8 + oy, 12, 3, armor_d)
    c.rect(18 + ox, 7 + oy, 8, 2, armor_l)
    # Glowing Red Eyes & Scars
    c.rect(17 + ox, 11 + oy, 3, 2, RED)
    c.set(17 + ox, 11 + oy, WHITE)
    # Big Jaw & Jagged Tusks
    c.rect(15 + ox, 14 + oy, 9, 4, skin_d)
    c.rect(15 + ox, 12 + oy, 2, 3, WHITE)
    c.rect(20 + ox, 13 + oy, 2, 2, WHITE)

    # Giant Spiked Iron Cleaver
    if frame == 2:
        c.rect(10 + ox, 21 + oy, 6, 4, skin)
        c.line(10 + ox, 23 + oy, 3 + ox, 34 + oy, C("#57534e"))
        c.rect(1 + ox, 26 + oy, 7, 11, armor)
        c.rect(1 + ox, 26 + oy, 2, 11, armor_l)
        c.set(3 + ox, 29 + oy, RED)
    else:
        c.rect(10 + ox, 22 + oy, 5, 5, skin)
        c.line(10 + ox, 25 + oy, 6 + ox, 9 + oy, C("#57534e"))
        c.rect(3 + ox, 7 + oy, 6, 12, armor)
        c.rect(3 + ox, 7 + oy, 2, 12, armor_l)

    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


# ============================================================
# 7. SPECIAL ENCOUNTERS: SPECIALIST SPIRIT, MIMIC, GEO-CRYSTAL
# ============================================================
def draw_specialist(frame: int) -> Canvas:
    c = Canvas(32, 32)
    oy = -1 if frame == 1 else (1 if frame == 2 else 0)
    aura = C("#38bdf8")
    core = C("#fef08a")
    c.ellipse(16, 16 + oy, 8, 8, aura)
    c.ellipse(16, 16 + oy, 5.5, 5.5, GOLD)
    c.ellipse(15, 15 + oy, 3.5, 3.5, core)
    c.rect(13, 15 + oy, 2, 2, OL)
    c.rect(17, 15 + oy, 2, 2, OL)
    # Orbiting star sparks
    sp = [(6, 10), (25, 12), (8, 24), (24, 23)]
    for i, (sx, sy) in enumerate(sp):
        if (i + frame) % 2 == 0:
            c.set(sx, sy + oy, WHITE)
            c.set(sx + 1, sy + oy, GOLD)
    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


def draw_mimic(frame: int) -> Canvas:
    c = Canvas(32, 32)
    oy = -2 if frame == 2 else (1 if frame == 1 else 0)
    wood = C("#7c2d12")
    wood_d = C("#451a03")
    purple = C("#7e22ce")
    c.rect(7, 14 + oy, 18, 12, wood)
    c.rect(7, 14 + oy, 18, 2, GOLD)
    c.rect(7, 24 + oy, 18, 2, GOLD_D)
    # Lid
    lid_y = 7 + oy if frame in (0, 2) else 9 + oy
    c.rect(7, lid_y, 18, 6, purple)
    c.rect(7, lid_y, 18, 2, GOLD)
    # Teeth & glowing eyes
    c.rect(9, 13 + oy, 14, 3, OL)
    for tx in range(9, 23, 3):
        c.set(tx, 13 + oy, WHITE)
        c.set(tx + 1, 15 + oy, WHITE)
    c.rect(11, lid_y + 3, 2, 2, RED)
    c.rect(19, lid_y + 3, 2, 2, RED)
    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


def draw_geo_crystal(frame: int) -> Canvas:
    c = Canvas(24, 24)
    oy = -1 if frame % 2 == 1 else 0
    cyan = C("#22d3ee")
    cyan_l = C("#cffafe")
    cyan_d = C("#0e7490")
    for dy in range(-8, 9):
        w = max(1, 7 - abs(dy))
        for dx in range(-w, w + 1):
            col = cyan_l if dx < 0 and dy < 0 else (cyan_d if dx > 1 or dy > 2 else cyan)
            c.set(12 + dx, 12 + dy + oy, col)
    c.add_outline(OL)
    return c


# ============================================================
# 8. SQUAD HEROES (32x32, facing right) — All 7 GDD Classes
# ============================================================
def draw_hero(role: str, frame: int) -> Canvas:
    c = Canvas(32, 32)
    oy = 1 if frame == 1 else 0
    ox = 3 if frame == 2 else (-2 if frame == 3 else 0)

    palettes = {
        "heavy_knight": (C("#64748b"), C("#334155"), C("#cbd5e1"), C("#f59e0b")),
        "warrior": (C("#dc2626"), C("#991b1b"), C("#fca5a5"), C("#e2e8f0")),
        "mage": (C("#4f46e5"), C("#312e81"), C("#a5b4fc"), C("#f43f5e")),
        "cleric": (C("#f8fafc"), C("#cbd5e1"), C("#fef08a"), C("#38bdf8")),
        "thief": (C("#0d9488"), C("#115e59"), C("#5eead4"), C("#94a3b8")),
        "magic_knight": (C("#7c3aed"), C("#4c1d95"), C("#ddd6fe"), C("#38bdf8")),
        "professor": (C("#0284c7"), C("#075985"), C("#bae6fd"), C("#a3e635")),
    }
    main_c, dark_c, light_c, weap_c = palettes[role]
    skin = C("#fde68a")

    # Boots
    c.rect(11 + ox, 25 + oy, 3, 4, dark_c)
    c.rect(17 + ox, 25 + oy, 3, 4, dark_c)
    # Body / Armor
    c.ellipse(15 + ox, 19 + oy, 5.5 if role == "heavy_knight" else 5.0, 5.5, main_c)
    c.rect(13 + ox, 16 + oy, 4, 4, light_c)
    c.rect(11 + ox, 22 + oy, 8, 2, dark_c)

    # Head
    c.ellipse(15 + ox, 11 + oy, 4.5, 4.5, skin)
    c.rect(16 + ox, 10 + oy, 2, 2, OL)

    if role == "heavy_knight":
        c.rect(10 + ox, 6 + oy, 10, 5, light_c)
        c.rect(12 + ox, 4 + oy, 6, 2, weap_c)
        # Tower Shield + Lance
        c.rect(20 + ox, 14 + oy, 5, 10, main_c)
        c.rect(21 + ox, 16 + oy, 3, 6, weap_c)
    elif role == "warrior":
        c.rect(10 + ox, 6 + oy, 10, 4, weap_c)
        c.rect(12 + ox, 4 + oy, 5, 2, RED)
        sx = 22 + ox if frame == 2 else 20 + ox
        c.line(18 + ox, 18 + oy, sx + 5, 11 + oy, weap_c)
        c.rect(18 + ox, 17 + oy, 3, 2, GOLD)
    elif role == "mage":
        c.line(10 + ox, 9 + oy, 20 + ox, 9 + oy, dark_c)
        c.ellipse(15 + ox, 6 + oy, 4.0, 3.0, main_c)
        c.set(14 + ox, 3 + oy, main_c)
        c.line(21 + ox, 24 + oy, 21 + ox, 9 + oy, C("#78350f"))
        c.ellipse(21 + ox, 8 + oy, 2.0, 2.0, weap_c)
    elif role == "cleric":
        c.rect(11 + ox, 5 + oy, 8, 2, GOLD)
        c.rect(11 + ox, 7 + oy, 8, 2, light_c)
        c.line(21 + ox, 24 + oy, 21 + ox, 10 + oy, GOLD_D)
        c.ellipse(21 + ox, 9 + oy, 2.2, 2.2, weap_c)
    elif role == "thief":
        c.rect(10 + ox, 7 + oy, 10, 3, dark_c)
        c.rect(12 + ox, 13 + oy, 7, 2, main_c)
        c.line(19 + ox, 18 + oy, 25 + ox, 15 + oy, weap_c)
        c.line(18 + ox, 21 + oy, 24 + ox, 20 + oy, weap_c)
    elif role == "magic_knight":
        c.rect(10 + ox, 6 + oy, 10, 4, main_c)
        c.rect(11 + ox, 4 + oy, 7, 2, weap_c)
        sx = 22 + ox if frame == 2 else 20 + ox
        c.line(18 + ox, 19 + oy, sx + 5, 10 + oy, weap_c)
        c.rect(18 + ox, 17 + oy, 3, 2, GOLD)
    elif role == "professor":
        c.rect(10 + ox, 6 + oy, 10, 3, WHITE)
        c.rect(15 + ox, 9 + oy, 4, 2, C("#38bdf8"))  # goggles
        c.rect(19 + ox, 16 + oy, 4, 5, weap_c)  # potion flask

    c.add_outline(OL)
    if frame == 3:
        c.flash_hit()
    return c


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    specs = [
        ("small_orc.png", draw_small_orc),
        ("bat.png", draw_bat),
        ("pig.png", draw_pig),
        ("slime.png", draw_slime),
        ("minotaur.png", draw_minotaur),
        ("big_orc.png", draw_big_orc),
        ("specialist.png", draw_specialist),
        ("mimic.png", draw_mimic),
        ("geo_crystal.png", draw_geo_crystal),
    ]
    for filename, fn in specs:
        make_strip([fn(i) for i in range(4)], os.path.join(OUT_DIR, filename))

    roles = (
        "heavy_knight",
        "warrior",
        "mage",
        "cleric",
        "thief",
        "magic_knight",
        "professor",
    )
    for role in roles:
        make_strip([draw_hero(role, i) for i in range(4)], os.path.join(OUT_DIR, f"hero_{role}.png"))

    print(f"Generated {len(specs) + len(roles)} pixel-art spritesheets in {OUT_DIR}")


if __name__ == "__main__":
    main()

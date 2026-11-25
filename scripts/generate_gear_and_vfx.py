"""
Generates pixel-art RPG equipment assets (icons + character overlays)
and multi-frame battle VFX spritesheets into client/public/assets/sprites/.
Detail target: 16-bit SNES/GBA RPG style ("in between" — shaded tonal ramps,
crisp 1px dark outlines, wood grain, leather stitching, buckles & edge highlights).
"""
import math
import os
import struct
import zlib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(BASE_DIR, "client", "public", "assets", "sprites")
GEAR_ICON_DIR = os.path.join(SPRITES_DIR, "gear", "icons")
GEAR_OVERLAY_DIR = os.path.join(SPRITES_DIR, "gear", "overlay")
GEAR_SHEET_DIR = os.path.join(SPRITES_DIR, "gear", "sheets")
VFX_DIR = os.path.join(SPRITES_DIR, "vfx")


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

    def blend(self, x: int, y: int, color: tuple[int, int, int, int]) -> None:
        if 0 <= x < self.w and 0 <= y < self.h and color[3] > 0:
            if color[3] == 255 or self.px[y][x][3] == 0:
                self.px[y][x] = color
            else:
                sr, sg, sb, sa = color
                dr, dg, db, da = self.px[y][x]
                a = sa / 255.0
                self.px[y][x] = (
                    int(sr * a + dr * (1 - a)),
                    int(sg * a + dg * (1 - a)),
                    int(sb * a + db * (1 - a)),
                    max(da, sa),
                )

    def rect(self, x: int, y: int, w: int, h: int, color: tuple[int, int, int, int]) -> None:
        for dy in range(h):
            for dx in range(w):
                self.set(x + dx, y + dy, color)

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

    def circle(self, cx: float, cy: float, r: float, color: tuple[int, int, int, int]) -> None:
        for y in range(self.h):
            for x in range(self.w):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    self.set(x, y, color)

    def ring(self, cx: float, cy: float, r_in: float, r_out: float, color: tuple[int, int, int, int]) -> None:
        for y in range(self.h):
            for x in range(self.w):
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if r_in * r_in <= d2 <= r_out * r_out:
                    self.set(x, y, color)

    def add_outline(self, outline_color=(21, 16, 27, 255)) -> None:
        pts = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x][3] == 0:
                    for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + ox, y + oy
                        if 0 <= nx < self.w and 0 <= ny < self.h and self.px[ny][nx][3] > 0:
                            pts.append((x, y))
                            break
        for x, y in pts:
            self.px[y][x] = outline_color

    def save_single(self, path: str) -> None:
        rows = []
        for y in range(self.h):
            row = bytearray()
            for x in range(self.w):
                row.extend(self.px[y][x])
            rows.append(bytes(row))
        write_png(path, self.w, self.h, rows)


def save_strip(frames: list[Canvas], path: str) -> None:
    fw, fh = frames[0].w, frames[0].h
    rows = []
    for y in range(fh):
        row = bytearray()
        for f in frames:
            for x in range(fw):
                row.extend(f.px[y][x])
        rows.append(bytes(row))
    write_png(path, fw * len(frames), fh, rows)


def C(hex_str: str, a: int = 255) -> tuple[int, int, int, int]:
    return (int(hex_str[1:3], 16), int(hex_str[3:5], 16), int(hex_str[5:7], 16), a)


OL = C("#15101b")
WHITE = C("#fff8f0")

# Shared palettes (4-step ramps for balanced "in-between" pixel detail)
WOOD_L = C("#deb072")
WOOD_M = C("#b57c42")
WOOD_D = C("#7c4d24")
WOOD_DD = C("#4f2d12")

LEATH_L = C("#c4844a")
LEATH_M = C("#91572b")
LEATH_D = C("#633718")
LEATH_DD = C("#3e200c")

BRASS_L = C("#fde68a")
BRASS_M = C("#d99a26")
BRASS_D = C("#8a5410")

STEEL_L = C("#f1f5f9")
STEEL_M = C("#94a3b8")
STEEL_D = C("#475569")

CRIM_L = C("#fca5a5")
CRIM_M = C("#dc2626")
CRIM_D = C("#7f1d1d")

GEM_CYAN_L = C("#bae6fd")
GEM_CYAN_M = C("#38bdf8")
GEM_CYAN_D = C("#0369a1")

GEM_EMER_L = C("#a7f3d0")
GEM_EMER_M = C("#10b981")
GEM_EMER_D = C("#047857")


# ============================================================
# 1. GEAR ICONS (32x32)
# ============================================================

def make_icon_wooden_sword() -> Canvas:
    c = Canvas(32, 32)
    # Pommel & grip (bottom-left diagonal)
    c.rect(5, 25, 2, 2, BRASS_M)
    c.set(5, 25, BRASS_L)
    c.line(7, 24, 10, 21, WOOD_DD)
    c.line(8, 24, 10, 22, LEATH_M)
    c.set(8, 23, LEATH_L)

    # Wooden/Bronze crossguard
    c.line(8, 18, 13, 23, WOOD_D)
    c.line(9, 17, 14, 22, WOOD_M)
    c.set(11, 20, BRASS_L)  # center rivet
    c.set(9, 18, WOOD_L)

    # Carved oak blade running diagonally up-right from (12,19) to (26,5)
    for i in range(15):
        bx = 12 + i
        by = 19 - i
        # Smooth beveled oak blade (core + top-left light edge + bottom-right ridge)
        c.set(bx, by, WOOD_D if i in (4, 9) else WOOD_M)
        c.set(bx - 1, by, WOOD_L)
        c.set(bx, by - 1, WOOD_L)
        c.set(bx + 1, by, WOOD_D)
        c.set(bx, by + 1, WOOD_D)
    # Center grain highlight ridge
    for i in range(2, 13, 3):
        c.set(12 + i, 19 - i, WOOD_L)
    # Smooth tapered tip
    c.set(26, 5, WOOD_L)
    c.set(27, 4, WOOD_L)

    c.add_outline(OL)
    return c


def make_icon_sword_metal() -> Canvas:
    c = Canvas(32, 32)
    # Pommel & wrapped hilt
    c.rect(5, 25, 2, 2, BRASS_M)
    c.set(5, 25, BRASS_L)
    c.set(6, 26, CRIM_M)
    c.line(7, 24, 10, 21, CRIM_D)
    c.line(8, 24, 10, 22, CRIM_M)
    # Winged gold crossguard
    c.line(8, 17, 14, 23, BRASS_D)
    c.line(9, 17, 14, 22, BRASS_M)
    c.set(11, 20, BRASS_L)
    c.set(8, 17, BRASS_L)
    c.set(14, 23, BRASS_L)
    # Steel blade with fuller & bright bevel
    for i in range(15):
        bx = 12 + i
        by = 19 - i
        c.set(bx, by, STEEL_D if i % 2 == 0 else STEEL_M)
        c.set(bx - 1, by, STEEL_L)
        c.set(bx, by - 1, STEEL_L)
        c.set(bx + 1, by, STEEL_M)
        c.set(bx, by + 1, STEEL_D)
    c.set(26, 5, WHITE)
    c.set(27, 4, STEEL_L)
    c.add_outline(OL)
    return c


def make_icon_leather_armor() -> Canvas:
    """Detailed chest leather jerkin/armor (straps, stitching, chest seam, brass buckle)."""
    c = Canvas(32, 32)
    # Shoulder straps / light leather pauldrons
    c.rect(7, 7, 5, 4, LEATH_M)
    c.rect(8, 7, 3, 2, LEATH_L)
    c.rect(20, 7, 5, 4, LEATH_M)
    c.rect(21, 7, 3, 2, LEATH_L)
    c.set(9, 9, BRASS_L)  # Left buckle rivet
    c.set(22, 9, BRASS_L)  # Right buckle rivet

    # Neck collar & stitched V-opening
    c.rect(11, 8, 10, 2, LEATH_D)
    c.rect(12, 9, 8, 3, LEATH_DD)  # Inner collar opening
    c.rect(13, 10, 6, 3, WOOD_L)    # Inner tunic / V-lace backing
    c.line(13, 10, 16, 13, LEATH_L)
    c.line(18, 10, 16, 13, LEATH_L)

    # Main fitted chest torso (x=8..23, y=10..21)
    c.rect(8, 10, 16, 11, LEATH_M)
    # Padded chest plates & center seam
    c.rect(9, 11, 6, 7, LEATH_L)
    c.rect(17, 11, 6, 7, LEATH_L)
    c.rect(10, 12, 4, 5, LEATH_M)
    c.rect(18, 12, 4, 5, LEATH_M)
    c.line(15, 13, 15, 19, LEATH_D)
    c.line(16, 13, 16, 19, LEATH_DD)

    # Dark side gussets & stitch ticks
    c.rect(8, 11, 2, 10, LEATH_D)
    c.rect(22, 11, 2, 10, LEATH_D)
    for sy in (12, 14, 16, 18):
        c.set(9, sy, WOOD_L)
        c.set(22, sy, WOOD_L)

    # Waist belt & brass buckle
    c.rect(8, 20, 16, 3, LEATH_DD)
    c.rect(9, 21, 14, 1, LEATH_D)
    c.rect(14, 20, 4, 3, BRASS_M)
    c.rect(15, 20, 2, 1, BRASS_L)
    c.set(15, 21, LEATH_DD)

    # Bottom leather skirt/tassets (split slightly)
    c.rect(8, 23, 7, 3, LEATH_M)
    c.rect(17, 23, 7, 3, LEATH_M)
    c.rect(9, 23, 5, 2, LEATH_L)
    c.rect(18, 23, 5, 2, LEATH_L)
    c.rect(15, 23, 2, 2, LEATH_D)

    c.add_outline(OL)
    return c


def make_icon_plate_armor() -> Canvas:
    c = Canvas(32, 32)
    # Sculpted steel pauldrons
    c.rect(6, 7, 6, 5, STEEL_M)
    c.rect(7, 7, 4, 2, STEEL_L)
    c.rect(20, 7, 6, 5, STEEL_M)
    c.rect(21, 7, 4, 2, STEEL_L)
    c.line(6, 11, 11, 11, BRASS_M)
    c.line(20, 11, 25, 11, BRASS_M)
    # Gorget & chest cuirass
    c.rect(12, 7, 8, 3, STEEL_D)
    c.rect(13, 8, 6, 1, BRASS_L)
    c.rect(9, 10, 14, 10, STEEL_M)
    c.rect(10, 11, 12, 5, STEEL_L)
    c.rect(11, 12, 4, 3, WHITE)
    c.line(15, 11, 15, 19, STEEL_D)
    c.line(16, 11, 16, 19, BRASS_M)
    # Belt & tassets
    c.rect(9, 20, 14, 2, STEEL_D)
    c.rect(14, 19, 4, 3, BRASS_M)
    c.set(15, 20, GEM_CYAN_L)
    c.rect(8, 22, 7, 4, STEEL_M)
    c.rect(17, 22, 7, 4, STEEL_M)
    c.line(8, 25, 14, 25, BRASS_D)
    c.line(17, 25, 23, 25, BRASS_D)
    c.add_outline(OL)
    return c


def make_icon_axe() -> Canvas:
    c = Canvas(32, 32)
    # Ash wood handle diagonal
    for i in range(19):
        c.rect(6 + i, 25 - i, 2, 2, WOOD_M if i % 2 == 0 else WOOD_D)
    c.rect(6, 25, 2, 2, BRASS_M)
    # Crescent steel head
    c.rect(17, 5, 7, 9, STEEL_M)
    c.rect(19, 6, 5, 6, STEEL_D)
    c.line(23, 5, 26, 8, WHITE)
    c.line(26, 8, 24, 13, STEEL_L)
    c.rect(18, 9, 3, 3, BRASS_M)
    c.add_outline(OL)
    return c


def make_icon_spear() -> Canvas:
    c = Canvas(32, 32)
    for i in range(18):
        c.set(5 + i, 26 - i, WOOD_M)
        c.set(6 + i, 26 - i, WOOD_D)
    # Red pennant & brass collar
    c.rect(19, 10, 2, 2, BRASS_L)
    c.line(20, 12, 22, 16, CRIM_M)
    c.line(21, 12, 23, 15, CRIM_L)
    # Leaf spearhead
    for i in range(6):
        c.set(21 + i, 10 - i, STEEL_L)
        c.set(22 + i, 10 - i, STEEL_M)
        c.set(21 + i, 11 - i, STEEL_D)
    c.set(27, 4, WHITE)
    c.add_outline(OL)
    return c


def make_icon_staff() -> Canvas:
    c = Canvas(32, 32)
    for i in range(16):
        c.set(6 + i, 25 - i, WOOD_M)
        c.set(7 + i, 25 - i, WOOD_DD)
    c.rect(19, 10, 3, 3, BRASS_M)
    # Gold crescent & mana orb
    c.line(18, 8, 22, 5, BRASS_L)
    c.line(23, 12, 26, 8, BRASS_L)
    c.circle(23, 7, 2.4, GEM_CYAN_M)
    c.set(22, 6, WHITE)
    c.add_outline(OL)
    return c


def make_icon_bow() -> Canvas:
    c = Canvas(32, 32)
    # Curved laminated limbs
    pts = [(10, 5), (14, 6), (17, 9), (19, 13), (19, 18), (17, 22), (14, 25), (10, 26)]
    for x, y in pts:
        c.rect(x, y, 2, 2, WOOD_M)
        c.set(x, y, WOOD_L)
    c.rect(19, 14, 2, 4, LEATH_D)
    c.line(10, 7, 10, 25, STEEL_L)  # bowstring
    # Nocked arrow
    c.line(9, 15, 25, 15, WOOD_L)
    c.rect(24, 14, 2, 3, STEEL_L)
    c.set(26, 15, WHITE)
    c.line(8, 14, 10, 14, CRIM_M)
    c.line(8, 16, 10, 16, CRIM_M)
    c.add_outline(OL)
    return c


def make_icon_fist() -> Canvas:
    c = Canvas(32, 32)
    c.rect(10, 15, 11, 9, LEATH_M)
    c.rect(11, 16, 9, 6, LEATH_L)
    c.rect(9, 12, 13, 4, STEEL_M)
    for kx in (10, 13, 16, 19):
        c.rect(kx, 10, 2, 3, STEEL_L)
        c.set(kx, 10, WHITE)
    c.rect(11, 23, 9, 3, LEATH_DD)
    c.set(15, 24, BRASS_L)
    c.add_outline(OL)
    return c


def make_icon_gun() -> Canvas:
    c = Canvas(32, 32)
    c.rect(7, 15, 7, 5, WOOD_M)
    c.rect(6, 19, 4, 5, WOOD_D)
    c.rect(12, 13, 14, 3, STEEL_D)
    c.rect(13, 13, 12, 1, STEEL_L)
    c.rect(12, 16, 4, 2, BRASS_M)
    c.set(15, 18, BRASS_L)
    c.add_outline(OL)
    return c


def make_icon_emblem() -> Canvas:
    c = Canvas(32, 32)
    # Winged crest shield
    c.line(5, 11, 10, 14, BRASS_M)
    c.line(6, 9, 11, 12, BRASS_L)
    c.line(26, 11, 21, 14, BRASS_M)
    c.line(25, 9, 20, 12, BRASS_L)
    c.rect(10, 8, 12, 12, BRASS_M)
    c.rect(11, 9, 10, 10, GEM_CYAN_D)
    c.rect(12, 10, 8, 7, GEM_CYAN_M)
    c.rect(12, 20, 8, 3, BRASS_M)
    c.rect(14, 23, 4, 2, BRASS_D)
    c.circle(16, 14, 2.2, GEM_CYAN_L)
    c.set(15, 13, WHITE)
    c.add_outline(OL)
    return c


def make_icon_accessory() -> Canvas:
    c = Canvas(32, 32)
    c.ring(16, 18, 4.2, 7.2, BRASS_M)
    c.ring(16, 17, 4.5, 6.5, BRASS_L)
    c.rect(13, 8, 6, 5, BRASS_M)
    c.rect(14, 9, 4, 3, GEM_EMER_M)
    c.set(15, 9, GEM_EMER_L)
    c.set(14, 9, WHITE)
    c.add_outline(OL)
    return c


# ============================================================
# 2. CHARACTER-FITTED GEAR OVERLAYS
#    Base Map South (0): torso x=13..18 y=19..25, sleeve x=11..12/19..20, hands x=21..22 y=25
#    Base Map East  (2): torso x=14..18 y=19..25, hand x=11..13 y=25
# ============================================================

def make_overlay_leather_armor() -> list[Canvas]:
    # Frame 0: South (facing front)
    f0 = Canvas(32, 32)
    # Shoulder straps
    f0.rect(12, 19, 2, 2, LEATH_M)
    f0.rect(18, 19, 2, 2, LEATH_M)
    f0.set(12, 19, BRASS_L)
    f0.set(19, 19, BRASS_L)
    # Chest vest panels
    f0.rect(13, 20, 6, 4, LEATH_M)
    f0.rect(13, 20, 2, 3, LEATH_L)
    f0.rect(17, 20, 2, 3, LEATH_L)
    f0.line(15, 20, 15, 23, LEATH_D)
    f0.line(16, 20, 16, 23, LEATH_D)
    # Waist belt & brass buckle
    f0.rect(13, 24, 6, 2, LEATH_DD)
    f0.rect(15, 24, 2, 1, BRASS_L)
    f0.add_outline(OL)

    # Frame 1: East (side view facing right)
    f1 = Canvas(32, 32)
    f1.rect(14, 19, 3, 2, LEATH_L)
    f1.rect(14, 20, 4, 4, LEATH_M)
    f1.rect(16, 20, 2, 3, LEATH_L)  # Chest front edge
    f1.rect(13, 20, 2, 2, LEATH_D)  # Side pauldron strap
    f1.set(14, 19, BRASS_L)
    f1.rect(14, 24, 4, 2, LEATH_DD)
    f1.rect(16, 24, 2, 1, BRASS_L)
    f1.add_outline(OL)
    return [f0, f1]


def make_overlay_plate_armor() -> list[Canvas]:
    f0 = Canvas(32, 32)
    # Pauldrons & breastplate
    f0.rect(11, 19, 3, 2, STEEL_L)
    f0.rect(18, 19, 3, 2, STEEL_L)
    f0.rect(13, 20, 6, 4, STEEL_M)
    f0.rect(14, 20, 4, 2, STEEL_L)
    f0.rect(13, 24, 6, 2, STEEL_D)
    f0.rect(15, 24, 2, 1, BRASS_L)
    f0.set(15, 21, GEM_CYAN_L)
    f0.add_outline(OL)

    f1 = Canvas(32, 32)
    f1.rect(13, 19, 4, 2, STEEL_L)
    f1.rect(14, 20, 5, 4, STEEL_M)
    f1.rect(16, 20, 3, 2, STEEL_L)
    f1.rect(14, 24, 5, 2, STEEL_D)
    f1.rect(17, 24, 2, 1, BRASS_L)
    f1.set(17, 21, GEM_CYAN_L)
    f1.add_outline(OL)
    return [f0, f1]


def make_overlay_emblem() -> list[Canvas]:
    def draw_crest(cx: int, cy: int) -> Canvas:
        c = Canvas(32, 32)
        c.rect(cx - 1, cy - 1, 3, 3, BRASS_M)
        c.set(cx, cy, GEM_CYAN_L)
        c.set(cx - 2, cy - 1, BRASS_L)
        c.set(cx + 2, cy - 1, BRASS_L)
        c.add_outline(OL)
        return c

    return [draw_crest(7, 13), draw_crest(7, 13)]


def make_overlay_accessory() -> list[Canvas]:
    f0 = Canvas(32, 32)
    f0.rect(12, 29, 3, 1, GEM_EMER_L)
    f0.rect(17, 29, 3, 1, GEM_EMER_L)
    f0.set(19, 25, BRASS_L)
    f1 = Canvas(32, 32)
    f1.rect(14, 29, 4, 1, GEM_EMER_L)
    f1.set(13, 25, BRASS_L)
    return [f0, f1]


def make_hand_weapon(kind: str) -> Canvas:
    """
    32x32 held weapon sprite anchored cleanly for hand position (x=21, y=24 angled up-right),
    usable both as South overworld overlay and as rotatable hand-weapon in BattleStage!
    """
    c = Canvas(32, 32)
    hx, hy = 21, 24
    if kind == "wooden_sword":
        c.line(hx - 1, hy + 1, hx + 1, hy + 2, LEATH_D)
        c.line(hx - 2, hy, hx + 1, hy - 2, WOOD_D)  # guard
        c.set(hx, hy - 1, BRASS_L)
        for i in range(1, 9):
            c.set(hx + i, hy - i, WOOD_M)
            c.set(hx + i - 1, hy - i, WOOD_L)
            c.set(hx + i, hy - i + 1, WOOD_D)
        c.set(hx + 8, hy - 8, WOOD_L)
    elif kind == "sword_metal":
        c.line(hx - 1, hy + 1, hx + 1, hy + 2, CRIM_M)
        c.line(hx - 2, hy, hx + 1, hy - 2, BRASS_M)
        c.set(hx, hy - 1, BRASS_L)
        for i in range(1, 10):
            c.set(hx + i, hy - i, STEEL_L if i > 6 else STEEL_M)
            c.set(hx + i - 1, hy - i, WHITE if i == 8 else STEEL_L)
            c.set(hx + i, hy - i + 1, STEEL_D)
    elif kind == "axe":
        for i in range(-1, 8):
            c.set(hx + i, hy - i, WOOD_M)
        c.rect(hx + 5, hy - 9, 4, 5, STEEL_M)
        c.rect(hx + 7, hy - 8, 2, 4, STEEL_L)
        c.set(hx + 8, hy - 7, WHITE)
    elif kind == "spear":
        for i in range(-2, 10):
            c.set(hx + i, hy - i, WOOD_M)
        c.set(hx + 8, hy - 7, CRIM_M)
        c.rect(hx + 8, hy - 10, 3, 3, STEEL_L)
        c.set(hx + 10, hy - 11, WHITE)
    elif kind == "staff":
        for i in range(-2, 9):
            c.set(hx + 2, hy - i, WOOD_M)
        c.rect(hx + 1, hy - 10, 3, 3, BRASS_M)
        c.set(hx + 2, hy - 9, GEM_CYAN_L)
    elif kind == "bow":
        for dy in range(-5, 5):
            curve = 2 if abs(dy) < 3 else 1
            c.set(hx + 1 + curve, hy + dy - 2, WOOD_M)
        c.line(hx + 1, hy - 6, hx + 1, hy + 2, STEEL_L)
    elif kind == "fist":
        c.rect(hx - 1, hy - 2, 4, 4, LEATH_M)
        c.rect(hx + 1, hy - 2, 2, 3, STEEL_L)
    elif kind == "gun":
        c.rect(hx - 1, hy - 1, 2, 3, WOOD_M)
        c.rect(hx, hy - 2, 6, 2, STEEL_D)
        c.rect(hx + 1, hy - 2, 5, 1, STEEL_L)
        c.set(hx + 1, hy, BRASS_M)
    c.add_outline(OL)
    return c


def save_sheet_grid(cells: list[list[Canvas]], path: str) -> None:
    """Saves a 2D grid [row][col] of 32x32 Canvases into a single spritesheet PNG."""
    rows_cnt = len(cells)
    cols_cnt = len(cells[0])
    fw, fh = cells[0][0].w, cells[0][0].h
    png_rows = []
    for r in range(rows_cnt):
        for y in range(fh):
            row = bytearray()
            for col in range(cols_cnt):
                f = cells[r][col]
                for x in range(fw):
                    row.extend(f.px[y][x])
            png_rows.append(bytes(row))
    write_png(path, fw * cols_cnt, fh * rows_cnt, png_rows)


# ============================================================
# 4. ANIMATED 4x8 (128x256) GEAR SPRITESHEETS MATCHING character_base_map.png
# ============================================================

def base_bob(row: int, col: int) -> int:
    if row < 4:
        return (0, 1, 1, 0)[col]
    return (0, -1, 0, -1)[col]


def make_sheet_armor(plate: bool = False) -> list[list[Canvas]]:
    c_main = STEEL_M if plate else LEATH_M
    c_light = STEEL_L if plate else LEATH_L
    c_dark = STEEL_D if plate else LEATH_D
    c_belt = STEEL_D if plate else LEATH_DD
    c_trim = BRASS_L

    grid: list[list[Canvas]] = []
    for r in range(8):
        d = r % 4  # 0=S, 1=W, 2=E, 3=N
        row_cells: list[Canvas] = []
        for col in range(4):
            dy = base_bob(r, col)
            c = Canvas(32, 32)
            if d == 0:  # South (front)
                c.rect(11 if plate else 12, 19 + dy, 3 if plate else 2, 2, c_light if plate else c_main)
                c.rect(18, 19 + dy, 3 if plate else 2, 2, c_light if plate else c_main)
                c.set(12, 19 + dy, c_trim)
                c.set(19, 19 + dy, c_trim)
                c.rect(13, 20 + dy, 6, 4, c_main)
                c.rect(13, 20 + dy, 2, 3, c_light)
                c.rect(17, 20 + dy, 2, 3, c_light)
                c.line(15, 20 + dy, 15, 23 + dy, c_dark)
                c.line(16, 20 + dy, 16, 23 + dy, c_dark)
                if plate:
                    c.set(15, 21 + dy, GEM_CYAN_L)
                c.rect(13, 24 + dy, 6, 2, c_belt)
                c.rect(15, 24 + dy, 2, 1, c_trim)
            elif d == 1:  # West (facing left)
                shift = 1 if (r >= 4 and col == 1) else (-1 if (r >= 4 and col == 3) else 0)
                c.rect(14 + shift, 19 + dy, 3, 2, c_light)
                c.rect(13 + shift, 20 + dy, 4, 4, c_main)
                c.rect(13 + shift, 20 + dy, 2, 3, c_light)
                c.rect(16 + shift, 20 + dy, 2, 2, c_dark)
                c.set(16 + shift, 19 + dy, c_trim)
                if plate:
                    c.set(14 + shift, 21 + dy, GEM_CYAN_L)
                c.rect(13 + shift, 24 + dy, 4, 2, c_belt)
                c.rect(13 + shift, 24 + dy, 2, 1, c_trim)
            elif d == 2:  # East (facing right)
                shift = -1 if (r >= 4 and col == 1) else (1 if (r >= 4 and col == 3) else 0)
                c.rect(14 + shift, 19 + dy, 3, 2, c_light)
                c.rect(14 + shift, 20 + dy, 4, 4, c_main)
                c.rect(16 + shift, 20 + dy, 2, 3, c_light)
                c.rect(13 + shift, 20 + dy, 2, 2, c_dark)
                c.set(14 + shift, 19 + dy, c_trim)
                if plate:
                    c.set(17 + shift, 21 + dy, GEM_CYAN_L)
                c.rect(14 + shift, 24 + dy, 4, 2, c_belt)
                c.rect(16 + shift, 24 + dy, 2, 1, c_trim)
            else:  # North (back)
                c.rect(12, 19 + dy, 2, 2, c_main)
                c.rect(18, 19 + dy, 2, 2, c_main)
                c.rect(13, 20 + dy, 6, 4, c_dark)
                c.rect(14, 20 + dy, 4, 3, c_main)
                c.line(13, 20 + dy, 18, 23 + dy, c_belt)
                c.rect(13, 24 + dy, 6, 2, c_belt)
                c.set(15, 24 + dy, c_trim)
            c.add_outline(OL)
            row_cells.append(c)
        grid.append(row_cells)
    return grid


def make_sheet_emblem() -> list[list[Canvas]]:
    grid: list[list[Canvas]] = []
    for r in range(8):
        d = r % 4
        row_cells: list[Canvas] = []
        for col in range(4):
            hover = base_bob(r, col) + (0, -1, 0, 1)[col]
            cx = 24 if d == 1 else 7
            cy = 13 + hover
            c = Canvas(32, 32)
            c.rect(cx - 1, cy - 1, 3, 3, BRASS_M)
            c.set(cx, cy, GEM_CYAN_L)
            c.set(cx - 2, cy - 1, BRASS_L)
            c.set(cx + 2, cy - 1, BRASS_L)
            c.add_outline(OL)
            row_cells.append(c)
        grid.append(row_cells)
    return grid


def make_sheet_accessory() -> list[list[Canvas]]:
    grid: list[list[Canvas]] = []
    for r in range(8):
        d = r % 4
        row_cells: list[Canvas] = []
        for col in range(4):
            c = Canvas(32, 32)
            stride = (-1, 0, 1, 0)[col] if r >= 4 else 0
            if d in (0, 3):
                c.rect(12, 29 + (stride if col == 1 else 0), 3, 1, GEM_EMER_L)
                c.rect(17, 29 + (-stride if col == 3 else 0), 3, 1, GEM_EMER_L)
            elif d == 1:
                c.rect(14 + stride, 29, 4, 1, GEM_EMER_L)
            else:
                c.rect(14 - stride, 29, 4, 1, GEM_EMER_L)
            row_cells.append(c)
        grid.append(row_cells)
    return grid


HAND_POSE_TABLE: dict[int, list[tuple[int, int, int, int]]] = {
    # (hx, hy, dir_x, swing) where swing: -1=back/high, 0=neutral, 1=forward/low
    0: [(21, 25, 1, 0), (21, 26, 1, 0), (21, 25, 1, 0), (21, 25, 1, 0)],   # idle_S
    1: [(18, 25, -1, 0), (18, 26, -1, 0), (19, 26, -1, 0), (18, 25, -1, 0)], # idle_W
    2: [(12, 25, 1, 0), (12, 26, 1, 0), (12, 26, 1, 0), (12, 25, 1, 0)],    # idle_E
    3: [(21, 25, 1, -1), (21, 26, 1, -1), (21, 25, 1, -1), (21, 25, 1, -1)],# idle_N
    4: [(21, 25, 1, 0), (21, 24, 1, 1), (21, 25, 1, 0), (20, 24, 1, -1)],   # walk_S
    5: [(18, 25, -1, 0), (20, 24, -1, -1), (18, 25, -1, 0), (16, 23, -1, 1)], # walk_W
    6: [(12, 25, 1, 0), (11, 24, 1, -1), (12, 25, 1, 0), (14, 23, 1, 1)],   # walk_E
    7: [(21, 25, 1, -1), (21, 24, 1, 0), (21, 25, 1, -1), (20, 24, 1, -1)], # walk_N
}


def make_sheet_weapon(kind: str) -> list[list[Canvas]]:
    grid: list[list[Canvas]] = []
    for r in range(8):
        row_cells: list[Canvas] = []
        for col in range(4):
            hx, hy, dx, swing = HAND_POSE_TABLE[r][col]
            c = Canvas(32, 32)
            # Adjust vertical tip slope based on swing (-1 upright, 0 diagonal 45, 1 forward slash)
            slope_y = -1 if swing == -1 else (0 if swing == 0 else 1)

            if kind in ("wooden_sword", "sword_metal"):
                is_wood = kind == "wooden_sword"
                blade_m = WOOD_M if is_wood else STEEL_M
                blade_l = WOOD_L if is_wood else STEEL_L
                blade_d = WOOD_D if is_wood else STEEL_D
                guard = WOOD_D if is_wood else BRASS_M
                grip = LEATH_D if is_wood else CRIM_M

                c.line(hx - dx, hy + 1, hx, hy + 2, grip)
                c.line(hx - dx * 2, hy, hx + dx, hy - 2, guard)
                c.set(hx, hy - 1, BRASS_L)
                b_len = 8 if is_wood else 9
                tip_dx = dx * (b_len - 2 if swing == -1 else (b_len + 1 if swing == 1 else b_len))
                tip_dy = -(b_len + 1 if swing == -1 else (b_len - 2 if swing == 1 else b_len))
                c.line(hx + dx, hy - 1, hx + tip_dx, hy + tip_dy, blade_m)
                c.line(hx, hy - 1, hx + tip_dx - dx, hy + tip_dy, blade_l)
                c.line(hx + dx, hy, hx + tip_dx, hy + tip_dy + 1, blade_d)
                if not is_wood:
                    c.set(hx + tip_dx - dx, hy + tip_dy, STEEL_L)
            elif kind == "axe":
                for i in range(-1, 8):
                    px = hx + dx * i
                    py = hy - i + int(round((i / 4.0) * slope_y))
                    c.set(px, py, WOOD_M)
                top_x = hx + dx * 6
                top_y = hy - 8 + slope_y
                c.rect(min(top_x, top_x + dx * 2), top_y, 3, 4, STEEL_M)
                c.set(top_x + dx * 2, top_y + 1, WHITE)
            elif kind == "spear":
                for i in range(-2, 10):
                    px = hx + dx * i
                    py = hy - i + int(round((i / 4.0) * slope_y))
                    c.set(px, py, WOOD_M)
                tip_x = hx + dx * 9
                tip_y = hy - 10 + slope_y * 2
                c.set(tip_x - dx, tip_y + 2, CRIM_M)
                c.rect(min(tip_x, tip_x + dx), tip_y, 2, 2, STEEL_L)
                c.set(tip_x + dx, tip_y - 1, WHITE)
            elif kind == "staff":
                tilt = -dx if swing == -1 else (dx if swing == 1 else 0)
                for i in range(-2, 9):
                    c.set(hx + dx * 2 + (tilt if i > 4 else 0), hy - i, WOOD_M)
                ox = hx + dx * 2 + tilt
                oy = hy - 9
                c.rect(ox - 1, oy - 1, 3, 3, BRASS_M)
                c.set(ox, oy, GEM_CYAN_L)
            elif kind == "bow":
                for dy_bow in range(-4, 5):
                    curve = (2 if abs(dy_bow) < 3 else 1) * dx
                    c.set(hx + dx + curve, hy + dy_bow - 2, WOOD_M)
                c.line(hx + dx, hy - 5, hx + dx, hy + 2, STEEL_L)
            elif kind == "fist":
                c.rect(hx - 1, hy - 1, 3, 3, LEATH_M)
                c.rect(hx + (1 if dx > 0 else -1), hy - 1, 2, 2, STEEL_L)
            elif kind == "gun":
                c.rect(hx - dx, hy - 1, 2, 3, WOOD_M)
                gx = hx if dx > 0 else hx - 5
                c.rect(gx, hy - 2 + slope_y, 5, 2, STEEL_D)
                c.rect(gx + (1 if dx > 0 else 0), hy - 2 + slope_y, 4, 1, STEEL_L)
                c.set(hx + dx, hy, BRASS_M)

            c.add_outline(OL)
            row_cells.append(c)
        grid.append(row_cells)
    return grid
# ============================================================

# ============================================================
# 3. BATTLE ANIMATION VFX SPRITESHEETS
# ============================================================

def make_vfx_slash_arc() -> list[Canvas]:
    frames = []
    for f in range(6):
        c = Canvas(48, 48)
        cx, cy = 22, 24
        t0 = -1.2 + f * 0.42
        t1 = t0 + 1.35
        for ang_step in range(55):
            ang = t0 + (t1 - t0) * (ang_step / 54.0)
            for rad in (12, 13, 14, 15, 16, 17, 18):
                px = int(round(cx + math.cos(ang) * rad))
                py = int(round(cy + math.sin(ang) * rad))
                if rad in (15, 16) and ang_step > 18:
                    c.set(px, py, WHITE if f < 4 else GEM_CYAN_L)
                elif rad in (14, 17):
                    c.set(px, py, GEM_CYAN_L if f < 3 else GEM_CYAN_M)
                elif f < 5:
                    c.set(px, py, GEM_CYAN_D)
        # Trailing sparks
        if f in (2, 3, 4):
            c.rect(cx + 12, cy - 8 + f * 4, 2, 2, BRASS_L)
            c.rect(cx + 8, cy + 6, 2, 2, WHITE)
        frames.append(c)
    return frames


def make_vfx_thrust_pierce() -> list[Canvas]:
    frames = []
    for f in range(5):
        c = Canvas(48, 48)
        reach = 6 + f * 7
        cy = 24
        for x in range(8, min(44, 14 + reach)):
            w = max(1, 4 - abs(x - (10 + reach // 2)) // 5)
            c.rect(x, cy - w // 2, 1, w, STEEL_L if w > 1 else GEM_CYAN_L)
        c.rect(min(41, 12 + reach), cy - 2, 4, 4, WHITE)
        if f >= 2:
            c.ring(min(38, 12 + reach), cy, 4 + f * 2, 6 + f * 2, GEM_CYAN_M)
        frames.append(c)
    return frames


def make_vfx_magic_burst() -> list[Canvas]:
    frames = []
    for f in range(6):
        c = Canvas(48, 48)
        cx, cy = 24, 24
        if f == 0:
            c.ring(cx, cy, 5, 7, GEM_CYAN_M)
            c.circle(cx, cy, 3, WHITE)
        elif f in (1, 2):
            r = 6 + f * 4
            c.ring(cx, cy, r - 2, r, C("#a855f7"))
            c.circle(cx, cy, r - 4, GEM_CYAN_L)
            c.circle(cx, cy, 4, WHITE)
        elif f == 3:
            c.circle(cx, cy, 15, C("#6366f1"))
            c.circle(cx, cy, 10, GEM_CYAN_M)
            c.circle(cx, cy, 5, WHITE)
            for k in range(8):
                a = k * math.pi / 4
                c.line(cx, cy, int(cx + math.cos(a) * 20), int(cy + math.sin(a) * 20), BRASS_L)
        else:
            r = 14 + (f - 3) * 3
            c.ring(cx, cy, r - 2, r, GEM_CYAN_L)
            for k in range(6):
                a = k * math.pi / 3 + f * 0.4
                c.rect(int(cx + math.cos(a) * r), int(cy + math.sin(a) * r), 2, 2, WHITE)
        frames.append(c)
    return frames


def make_vfx_impact_hit() -> list[Canvas]:
    frames = []
    for f in range(5):
        c = Canvas(32, 32)
        cx, cy = 16, 16
        r = 3 + f * 2.5
        if f < 3:
            c.circle(cx, cy, max(2, 6 - f), WHITE if f == 0 else BRASS_L)
        c.ring(cx, cy, r - 1.5, r, BRASS_M if f < 3 else C("#fde68a", 180))
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 4
            sx = int(cx + math.cos(a) * (r + 2))
            sy = int(cy + math.sin(a) * (r + 2))
            c.rect(sx, sy, 2, 2, WHITE if f < 2 else BRASS_L)
        frames.append(c)
    return frames


def make_vfx_enemy_claw() -> list[Canvas]:
    frames = []
    for f in range(5):
        c = Canvas(40, 40)
        prog = min(1.0, (f + 1) / 3.5)
        span = int(22 * prog)
        for offset in (-7, 0, 7):
            x0, y0 = 30, 8 + offset + 6
            x1, y1 = 30 - span, 8 + offset + 6 + span
            c.line(x0, y0, x1, y1, CRIM_M if f >= 2 else CRIM_L)
            c.line(x0 - 1, y0, x1 - 1, y1, WHITE if f < 2 else CRIM_D)
        frames.append(c)
    return frames


def make_vfx_crit_flash() -> list[Canvas]:
    frames = []
    for f in range(5):
        c = Canvas(48, 48)
        cx, cy = 24, 24
        arm = 8 + f * 4
        c.line(cx - arm, cy, cx + arm, cy, WHITE if f < 2 else BRASS_L)
        c.line(cx, cy - arm, cx, cy + arm, WHITE if f < 2 else BRASS_L)
        d = int(arm * 0.7)
        c.line(cx - d, cy - d, cx + d, cy + d, CRIM_M)
        c.line(cx - d, cy + d, cx + d, cy - d, CRIM_M)
        if f < 4:
            c.ring(cx, cy, 4 + f * 3, 6 + f * 3, BRASS_M)
        frames.append(c)
    return frames


def make_vfx_heal_sparkle() -> list[Canvas]:
    frames = []
    for f in range(5):
        c = Canvas(32, 32)
        for i, (bx, by) in enumerate([(10, 22), (16, 18), (22, 24), (13, 14)]):
            y = by - f * 3
            if 2 <= y <= 29:
                col = GEM_EMER_L if (i + f) % 2 == 0 else BRASS_L
                c.line(bx - 1, y, bx + 1, y, col)
                c.line(bx, y - 1, bx, y + 1, col)
                c.set(bx, y, WHITE)
        frames.append(c)
    return frames


def make_vfx_shield_guard() -> list[Canvas]:
    frames = []
    for f in range(4):
        c = Canvas(32, 32)
        r = 9 + f
        c.ring(16, 16, r - 2, r, GEM_CYAN_M if f != 1 else GEM_CYAN_L)
        c.line(16, 8, 23, 13, WHITE)
        c.line(23, 13, 21, 22, GEM_CYAN_L)
        c.line(21, 22, 16, 25, GEM_CYAN_M)
        c.line(16, 25, 11, 22, GEM_CYAN_M)
        c.line(11, 22, 9, 13, GEM_CYAN_L)
        c.line(9, 13, 16, 8, WHITE)
        frames.append(c)
    return frames


def make_vfx_projectiles() -> list[Canvas]:
    # Frame 0: Arrow
    p0 = Canvas(24, 24)
    p0.line(3, 12, 19, 12, WOOD_M)
    p0.rect(18, 11, 3, 3, STEEL_L)
    p0.set(21, 12, WHITE)
    p0.line(3, 10, 6, 10, CRIM_M)
    p0.line(3, 14, 6, 14, CRIM_M)
    p0.add_outline(OL)

    # Frame 1: Musket Shot
    p1 = Canvas(24, 24)
    p1.rect(4, 11, 10, 2, BRASS_L)
    p1.circle(16, 12, 3, WHITE)
    p1.circle(16, 12, 2, BRASS_M)
    p1.add_outline(OL)

    # Frame 2: Arcane Bolt
    p2 = Canvas(24, 24)
    p2.circle(15, 12, 4.2, C("#6366f1"))
    p2.circle(15, 12, 2.5, GEM_CYAN_L)
    p2.set(16, 11, WHITE)
    p2.line(4, 11, 12, 11, GEM_CYAN_M)
    p2.line(6, 13, 12, 13, C("#a855f7"))
    p2.add_outline(OL)

    # Frame 3: Monster Shadow Fang
    p3 = Canvas(24, 24)
    p3.circle(9, 12, 3.8, CRIM_D)
    p3.circle(8, 12, 2.2, CRIM_L)
    p3.line(12, 11, 20, 11, CRIM_M)
    p3.add_outline(OL)

    return [p0, p1, p2, p3]


def main() -> None:
    icons = {
        "wooden_sword.png": make_icon_wooden_sword(),
        "sword_metal.png": make_icon_sword_metal(),
        "leather_armor.png": make_icon_leather_armor(),
        "armor_plate.png": make_icon_plate_armor(),
        "axe.png": make_icon_axe(),
        "spear.png": make_icon_spear(),
        "staff.png": make_icon_staff(),
        "bow.png": make_icon_bow(),
        "fist.png": make_icon_fist(),
        "gun.png": make_icon_gun(),
        "emblem.png": make_icon_emblem(),
        "accessory.png": make_icon_accessory(),
    }
    for fname, canvas in icons.items():
        canvas.save_single(os.path.join(GEAR_ICON_DIR, fname))

    overlays = {
        "leather_armor_overlay.png": make_overlay_leather_armor(),
        "plate_armor_overlay.png": make_overlay_plate_armor(),
        "emblem_overlay.png": make_overlay_emblem(),
        "accessory_overlay.png": make_overlay_accessory(),
    }
    for fname, frames in overlays.items():
        save_strip(frames, os.path.join(GEAR_OVERLAY_DIR, fname))

    for kind in ("wooden_sword", "sword_metal", "axe", "spear", "staff", "bow", "fist", "gun"):
        make_hand_weapon(kind).save_single(os.path.join(GEAR_OVERLAY_DIR, f"{kind}_hand.png"))

    # Animated 4x8 (128x256) character-synced gear sheets
    save_sheet_grid(make_sheet_armor(False), os.path.join(GEAR_SHEET_DIR, "leather_armor_sheet.png"))
    save_sheet_grid(make_sheet_armor(True), os.path.join(GEAR_SHEET_DIR, "plate_armor_sheet.png"))
    save_sheet_grid(make_sheet_emblem(), os.path.join(GEAR_SHEET_DIR, "emblem_sheet.png"))
    save_sheet_grid(make_sheet_accessory(), os.path.join(GEAR_SHEET_DIR, "accessory_sheet.png"))
    for kind in ("wooden_sword", "sword_metal", "axe", "spear", "staff", "bow", "fist", "gun"):
        save_sheet_grid(make_sheet_weapon(kind), os.path.join(GEAR_SHEET_DIR, f"{kind}_sheet.png"))

    vfx = {
        "slash_arc.png": make_vfx_slash_arc(),
        "thrust_pierce.png": make_vfx_thrust_pierce(),
        "magic_burst.png": make_vfx_magic_burst(),
        "impact_hit.png": make_vfx_impact_hit(),
        "enemy_claw.png": make_vfx_enemy_claw(),
        "crit_flash.png": make_vfx_crit_flash(),
        "heal_sparkle.png": make_vfx_heal_sparkle(),
        "shield_guard.png": make_vfx_shield_guard(),
        "projectiles.png": make_vfx_projectiles(),
    }
    for fname, frames in vfx.items():
        save_strip(frames, os.path.join(VFX_DIR, fname))

    print("Generated gear icons, gear overlays, and battle VFX spritesheets cleanly.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Generate pixel-accurate part_mask.png sheets for 92x92 player animations
(idle, walking, melee_swing) from grayscale_sheet.png + reference chest sheet.

Mask Color Key (matches guides/fashion_create_guide.md):
  #0000FF (0, 0, 255)     -> FAR_ARM   (behind torso)
  #00FF00 (0, 255, 0)     -> LEGS      (below torso hem)
  #FF0000 (255, 0, 0)     -> TORSO     (chest/back)
  #00FFFF (0, 255, 255)   -> HEAD      (above collar)
  #FFFF00 (255, 255, 0)   -> NEAR_ARM  (in front of torso, stamped over chest)

Zero external dependencies (uses Python stdlib zlib + struct only).
"""

import os
import struct
import zlib

CELL = 92

COLOR_TRANSPARENT = (0, 0, 0, 0)
COLOR_FAR_ARM = (0, 0, 255, 255)
COLOR_LEGS = (0, 255, 0, 255)
COLOR_TORSO = (255, 0, 0, 255)
COLOR_HEAD = (0, 255, 255, 255)
COLOR_NEAR_ARM = (255, 255, 0, 255)
COLOR_FEET = (255, 0, 255, 255)


def paeth(a, b, c):
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png_rgba(path):
    with open(path, "rb") as f:
        data = f.read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {path}"
    pos = 8
    width = height = bit_depth = color_type = 0
    idat = bytearray()
    palette = None
    trns = None

    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        ctype = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if ctype == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
            assert bit_depth == 8 and interlace == 0, f"Unsupported PNG format in {path}: bd={bit_depth}, interlace={interlace}"
        elif ctype == b"PLTE":
            palette = [tuple(chunk[i : i + 3]) for i in range(0, len(chunk), 3)]
        elif ctype == b"tRNS":
            trns = chunk
        elif ctype == b"IDAT":
            idat.extend(chunk)
        elif ctype == b"IEND":
            break

    raw = zlib.decompress(bytes(idat))
    bpp_map = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
    bpp = bpp_map[color_type]
    stride = width * bpp

    recon = bytearray(height * stride)
    in_pos = 0
    for y in range(height):
        flt = raw[in_pos]
        in_pos += 1
        row_start = y * stride
        for i in range(stride):
            x = raw[in_pos]
            in_pos += 1
            a = recon[row_start + i - bpp] if i >= bpp else 0
            b = recon[row_start - stride + i] if y > 0 else 0
            c = recon[row_start - stride + i - bpp] if (y > 0 and i >= bpp) else 0
            if flt == 0:
                val = x
            elif flt == 1:
                val = (x + a) & 0xFF
            elif flt == 2:
                val = (x + b) & 0xFF
            elif flt == 3:
                val = (x + ((a + b) >> 1)) & 0xFF
            elif flt == 4:
                val = (x + paeth(a, b, c)) & 0xFF
            else:
                raise ValueError(f"Unknown PNG filter {flt}")
            recon[row_start + i] = val

    rgba = bytearray(width * height * 4)
    for y in range(height):
        for x in range(width):
            dst = (y * width + x) * 4
            src = y * stride + x * bpp
            if color_type == 6:
                rgba[dst : dst + 4] = recon[src : src + 4]
            elif color_type == 2:
                rgba[dst] = recon[src]
                rgba[dst + 1] = recon[src + 1]
                rgba[dst + 2] = recon[src + 2]
                rgba[dst + 3] = 255
            elif color_type == 4:
                g = recon[src]
                rgba[dst] = g
                rgba[dst + 1] = g
                rgba[dst + 2] = g
                rgba[dst + 3] = recon[src + 1]
            elif color_type == 0:
                g = recon[src]
                rgba[dst] = g
                rgba[dst + 1] = g
                rgba[dst + 2] = g
                rgba[dst + 3] = 255
            elif color_type == 3:
                idx = recon[src]
                r, g, b = palette[idx]
                a = trns[idx] if (trns and idx < len(trns)) else 255
                rgba[dst] = r
                rgba[dst + 1] = g
                rgba[dst + 2] = b
                rgba[dst + 3] = a
    return width, height, rgba


def write_png_rgba(path, width, height, rgba):
    def make_chunk(ctype, payload):
        return (
            struct.pack(">I", len(payload))
            + ctype
            + payload
            + struct.pack(">I", zlib.crc32(ctype + payload) & 0xFFFFFFFF)
        )

    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)  # filter type 0
        raw.extend(rgba[y * stride : (y + 1) * stride])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + make_chunk(b"IHDR", ihdr)
        + make_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + make_chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def generate_mask_for_anim(base_path, chest_path, pants_path, out_path):
    w, h, base = read_png_rgba(base_path)
    cw, ch, chest = read_png_rgba(chest_path)
    assert (w, h) == (cw, ch), f"Size mismatch: {base_path} {(w,h)} vs {chest_path} {(cw,ch)}"

    pants = None
    if pants_path and os.path.exists(pants_path):
        pw, ph, pants = read_png_rgba(pants_path)
        assert (w, h) == (pw, ph), f"Size mismatch: {base_path} {(w,h)} vs {pants_path} {(pw,ph)}"

    cols = w // CELL
    rows = h // CELL
    mask = bytearray(w * h * 4)

    for row in range(rows):
        for col in range(cols):
            ox = col * CELL
            oy = row * CELL

            # Find chest, pants, and body bounds in this cell
            chest_ys = []
            chest_xs = []
            chest_row_bounds = {}
            pants_ys = []
            body_ys = []
            for ly in range(CELL):
                rxs = []
                for lx in range(CELL):
                    idx = ((oy + ly) * w + (ox + lx)) * 4
                    if base[idx + 3] > 127:
                        body_ys.append(ly)
                    if chest[idx + 3] > 127:
                        chest_ys.append(ly)
                        chest_xs.append(lx)
                        rxs.append(lx)
                    if pants is not None and pants[idx + 3] > 127:
                        pants_ys.append(ly)
                if rxs:
                    chest_row_bounds[ly] = (min(rxs), max(rxs))

            y_top = min(chest_ys) if chest_ys else 34
            y_hem = max(chest_ys) if chest_ys else 59
            x_cmin = min(chest_xs) if chest_xs else 38
            x_cmax = max(chest_xs) if chest_xs else 54
            y_body_max = max(body_ys) if body_ys else 74
            y_pants_bottom = max(pants_ys) if pants_ys else (y_body_max - 4)

            # Classify every opaque pixel of base grayscale sheet in this cell
            for ly in range(CELL):
                for lx in range(CELL):
                    idx = ((oy + ly) * w + (ox + lx)) * 4
                    if base[idx + 3] <= 127:
                        continue

                    is_chest = chest[idx + 3] > 127
                    is_pants = pants is not None and pants[idx + 3] > 127

                    if is_chest:
                        color = COLOR_TORSO
                    elif is_pants:
                        color = COLOR_LEGS
                    elif ly < y_top:
                        color = COLOR_HEAD
                    elif ly > y_pants_bottom:
                        # Bare feet below ankle line (tinted with skinColor unless boots equipped)
                        color = COLOR_FEET
                    elif pants is None and ly > y_hem:
                        # Fallback for anims without a reference pants sheet (e.g. melee_swing)
                        color = COLOR_LEGS
                    else:
                        # Inside torso/hip band where neither chest nor pants covers:
                        # Distinguish head/chin cutout, far arm, and near arm (including full hanging fist)
                        if ly <= y_top + 4 and (x_cmin + 2 <= lx <= x_cmax - 2):
                            color = COLOR_HEAD
                        elif row == 1:
                            r_min = chest_row_bounds.get(ly, (x_cmin, x_cmax))[0]
                            if lx < r_min - 1:
                                color = COLOR_FAR_ARM
                            else:
                                color = COLOR_NEAR_ARM
                        elif row == 2:
                            r_max = chest_row_bounds.get(ly, (x_cmin, x_cmax))[1]
                            if lx > r_max + 1:
                                color = COLOR_FAR_ARM
                            else:
                                color = COLOR_NEAR_ARM
                        else:
                            color = COLOR_NEAR_ARM

                    mask[idx : idx + 4] = bytes(color)

    write_png_rgba(out_path, w, h, mask)

    # Report cell 0 bounding box for sizing verification
    min_y, max_y = CELL, 0
    for ly in range(CELL):
        for lx in range(CELL):
            if base[(ly * w + lx) * 4 + 3] > 127:
                min_y = min(min_y, ly)
                max_y = max(max_y, ly)
    print(f"Generated {out_path} ({w}x{h}, {cols}x{rows} grid) | f0 body y={min_y}..{max_y} (h={max_y - min_y + 1}px)")


def main():
    root = "/Users/firdausfadzi/Desktop/game/client/public/assets"
    anims = ["idle", "walking", "melee_swing"]
    for anim in anims:
        base_p = os.path.join(root, "player", anim, "grayscale_sheet.png")
        chest_p = os.path.join(root, "gears", "chest", "leather_cloth", f"{anim}.png")
        pants_p = os.path.join(root, "gears", "pants", "leather_pant", f"{anim}.png")
        out_p = os.path.join(root, "player", anim, "part_mask.png")
        generate_mask_for_anim(base_p, chest_p, pants_p, out_p)


if __name__ == "__main__":
    main()

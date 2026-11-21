#!/usr/bin/env python3
"""
SL Mini Golf Association — logo generator.

Redraws the approved (traced) logo as clean vector geometry. Each glyph is
constructed upright from straight segments and true circular arcs using the
proportions measured from the original trace, then italicised with a single
exact shear transform per line. Outputs SVG sources into public/brand/.

Run:  python3 scripts/brand/build-logo.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "brand"

EMERALD = "#00A86B"
WHITE = "#FFFFFF"
INK = "#081E16"
NEAR_BLACK = "#050807"


def f(n: float) -> str:
    s = f"{n:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def shear(k: float, base: float) -> str:
    """Italicise around a baseline: x' = x + k * (base - y)."""
    return f"matrix(1 0 {f(-k)} 1 {f(k * base)} 0)"


# ---------------------------------------------------------------- primitives
def rrect(x, y, w, h, r):
    return (
        f"M{f(x + r)} {f(y)}H{f(x + w - r)}A{f(r)} {f(r)} 0 0 1 {f(x + w)} {f(y + r)}"
        f"V{f(y + h - r)}A{f(r)} {f(r)} 0 0 1 {f(x + w - r)} {f(y + h)}"
        f"H{f(x + r)}A{f(r)} {f(r)} 0 0 1 {f(x)} {f(y + h - r)}"
        f"V{f(y + r)}A{f(r)} {f(r)} 0 0 1 {f(x + r)} {f(y)}Z"
    )


def rect(x, y, w, h):
    return f"M{f(x)} {f(y)}H{f(x + w)}V{f(y + h)}H{f(x)}Z"


def poly(*pts):
    return "M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"


def glyph_s(x, y, W, H, b, st, R, r, a, term):
    """Point-symmetric geometric S.
    b: bar thickness, st: stem thickness, R/r: outer/inner radius,
    a: stem inset from the bounding box, term: terminal slant offset."""
    mt = y + (H - b) / 2  # middle bar top
    mb = mt + b  # middle bar bottom
    X = lambda v: f(x + v)
    Y = lambda v: f(v)
    return (
        f"M{X(W)} {Y(y)}L{X(W - term)} {Y(y + b)}"
        f"H{X(a + st + r)}A{f(r)} {f(r)} 0 0 0 {X(a + st)} {Y(y + b + r)}"
        f"V{Y(mt - r)}A{f(r)} {f(r)} 0 0 0 {X(a + st + r)} {Y(mt)}"
        f"H{X(W - a - R)}A{f(R)} {f(R)} 0 0 1 {X(W - a)} {Y(mt + R)}"
        f"V{Y(y + H - R)}A{f(R)} {f(R)} 0 0 1 {X(W - a - R)} {Y(y + H)}"
        f"H{X(0)}L{X(term)} {Y(y + H - b)}"
        f"H{X(W - a - st - r)}A{f(r)} {f(r)} 0 0 0 {X(W - a - st)} {Y(y + H - b - r)}"
        f"V{Y(mb + r)}A{f(r)} {f(r)} 0 0 0 {X(W - a - st - r)} {Y(mb)}"
        f"H{X(a + R)}A{f(R)} {f(R)} 0 0 1 {X(a)} {Y(mb - R)}"
        f"V{Y(y + R)}A{f(R)} {f(R)} 0 0 1 {X(a + R)} {Y(y)}Z"
    )


# ---------------------------------------------------------------- SL mark
MARK_K = 0.435  # slant of the SL mark
MARK_BASE = 248


def mark_paths():
    s = glyph_s(0, 0, 337, 248, b=52, st=68, R=62, r=23, a=8, term=15)
    l = (
        "M359 0H427V173A23 23 0 0 0 450 196H605V248H359Z"
    )
    return s + l


SLASH = "M740 2H751L665 248H654Z"


# ---------------------------------------------------------------- MINI GOLF
WORD_K = 0.26
WORD_TOP, WORD_BASE = 14, 114


def word_paths():
    t, bl = WORD_TOP, WORD_BASE
    p = []
    # M
    p.append(
        poly((780, bl), (780, t), (812, t), (858.5, 66), (905, t), (937, t),
             (937, bl), (910, bl), (910, 52), (867, 98), (850, 98), (807, 52), (807, bl))
    )
    # I
    p.append(rect(959, t, 27, 100))
    # N
    p.append(
        poly((1009, bl), (1009, t), (1039, t), (1104, 81), (1104, t), (1131, t),
             (1131, bl), (1100, bl), (1036, 47), (1036, bl))
    )
    # I
    p.append(rect(1153, t, 27, 100))
    # G
    p.append(
        "M1370 14L1363 37H1282A12 12 0 0 0 1270 49V80A12 12 0 0 0 1282 92"
        "H1333A12 12 0 0 0 1345 80V75H1295V55H1372V86A28 28 0 0 1 1344 114"
        "H1271A28 28 0 0 1 1243 86V42A28 28 0 0 1 1271 14Z"
    )
    # O
    p.append(rrect(1388, t, 130, 100, 26) + rrect(1415, 37, 77, 55, 10))
    # L
    p.append("M1537 14H1564V85A6 6 0 0 0 1570 91H1645V114H1537Z")
    # F
    p.append("M1663 114V14H1778L1773 37H1690V114Z")
    p.append(rect(1696, 55, 52, 20))
    return "".join(p)


# ---------------------------------------------------------------- ASSOCIATION
SUB_K = 0.138
SUB_TOP, SUB_BASE = 154, 212


def sub_paths():
    t, bl = SUB_TOP, SUB_BASE
    h = bl - t

    def A(x):
        xl = lambda y: x + 10 + (29 / 58) * (bl - y)
        xr = lambda y: x + 58 - (30 / 58) * (bl - y)
        d = (58 - 10) / (29 / 58 + 30 / 58)
        apex = (x + 10 + (29 / 58) * d, bl - d)
        outer = poly((x + 29, t), (x + 39, t), (x + 69, bl), (x + 58, bl),
                     (xr(197), 197), (xl(197), 197), (x + 10, bl), (x, bl))
        counter = poly((xl(188), 188), (xr(188), 188), apex)
        return outer + counter, 69

    def S(x):
        return glyph_s(x, t - 1, 56, h + 2, b=10, st=10.5, R=14, r=7.5, a=2, term=4), 56

    def O(x):
        return rrect(x, t - 1, 71, h + 2, 18) + rrect(x + 10.5, t + 9, 50, h - 18, 8.5), 71

    def C(x):
        W, top, bot, R, r, s = 63, t - 1, bl + 1, 18, 8.5, 10.5
        return (
            f"M{f(x + W)} {f(top)}V{f(top + 10)}H{f(x + s + r)}"
            f"A{f(r)} {f(r)} 0 0 0 {f(x + s)} {f(top + 10 + r)}V{f(bot - 10 - r)}"
            f"A{f(r)} {f(r)} 0 0 0 {f(x + s + r)} {f(bot - 10)}H{f(x + W)}V{f(bot)}"
            f"H{f(x + R)}A{f(R)} {f(R)} 0 0 1 {f(x)} {f(bot - R)}V{f(top + R)}"
            f"A{f(R)} {f(R)} 0 0 1 {f(x + R)} {f(top)}Z"
        ), W

    def I(x):
        return rect(x, t, 10.5, h), 10.5

    def T(x):
        return poly((x, t), (x + 60, t), (x + 60, t + 9.5), (x + 35.25, t + 9.5),
                    (x + 35.25, bl), (x + 24.75, bl), (x + 24.75, t + 9.5), (x, t + 9.5)), 60

    def N(x):
        return poly((x, bl), (x, t), (x + 11, t), (x + 50.5, 198), (x + 50.5, t),
                    (x + 61, t), (x + 61, bl), (x + 50, bl), (x + 10.5, 168), (x + 10.5, bl)), 61

    letters = [A, S, S, O, C, I, A, T, I, O, N]
    widths = [69, 56, 56, 71, 63, 10.5, 69, 60, 10.5, 71, 61]
    start, end = 758, 1770
    kern = {(6, 7): -14}  # A→T
    total_kern = sum(kern.values())
    gap = (end - start - sum(widths) - total_kern) / (len(letters) - 1)
    x, out = start, []
    for i, g in enumerate(letters):
        d, w = g(x)
        out.append(d)
        x += w + gap + kern.get((i, i + 1), 0)
    return "".join(out)


# ---------------------------------------------------------------- documents
def logo_svg(fg, title):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1806 250" width="1806" height="250" role="img" aria-labelledby="t">
<title id="t">{title}</title>
<path fill="{fg}" transform="{shear(MARK_K, MARK_BASE)}" d="{mark_paths()}"/>
<path fill="{EMERALD}" d="{SLASH}"/>
<path fill="{fg}" fill-rule="evenodd" transform="{shear(WORD_K, WORD_BASE)}" d="{word_paths()}"/>
<path fill="{fg}" fill-rule="evenodd" transform="{shear(SUB_K, SUB_BASE)}" d="{sub_paths()}"/>
</svg>
"""


def icon_svg(fg, with_slash=True):
    w = 760 if with_slash else 640
    slash = f'\n<path fill="{EMERALD}" d="{SLASH}"/>' if with_slash else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -1 {w} 251" width="{w}" height="251" role="img" aria-labelledby="t">
<title id="t">SL Mini Golf Association</title>
<path fill="{fg}" transform="{shear(MARK_K, MARK_BASE)}" d="{mark_paths()}"/>{slash}
</svg>
"""


def favicon_svg():
    # Square app icon: SL mark centred on a near-black rounded square.
    # Mark spans x 0..628 (after shear) and y 0..248.
    size, pad = 1024, 96
    scale = (size - 2 * pad) / 628
    ty = (size - 248 * scale) / 2
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
<rect width="{size}" height="{size}" rx="224" fill="{NEAR_BLACK}"/>
<g transform="translate({f(pad)} {f(ty)}) scale({f(scale)})">
<path fill="{WHITE}" transform="{shear(MARK_K, MARK_BASE)}" d="{mark_paths()}"/>
</g>
</svg>
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "slmga-logo-dark.svg": logo_svg(WHITE, "SL Mini Golf Association"),
        "slmga-logo-light.svg": logo_svg(INK, "SL Mini Golf Association"),
        "slmga-icon-dark.svg": icon_svg(WHITE),
        "slmga-icon-light.svg": icon_svg(INK),
        "slmga-app-icon.svg": favicon_svg(),
    }
    for name, svg in files.items():
        (OUT / name).write_text(svg)
        print("wrote", OUT / name)


if __name__ == "__main__":
    main()

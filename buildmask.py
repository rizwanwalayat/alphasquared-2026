"""Rasterise Natural Earth 110m land -> packed bit mask -> LAND_B64 in main.js.

Self-contained (stdlib only) and idempotent: re-running regenerates the
constant from source rather than editing it in place, so the string can't
drift by a character the way a hand-split one did.
"""
import json, base64, re, os, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LAND = os.path.join(HERE, "land.json")
JS = "/Users/mac/Documents/Alpha Squared/Portfolio/Latest/alphasquared-2026/js/main.js"
URL = ("https://raw.githubusercontent.com/martynafford/natural-earth-geojson/"
       "master/110m/physical/ne_110m_land.json")

COLS, ROWS = 210, 84
LNG0, LNG1 = -180.0, 180.0
LAT0, LAT1 = 83.0, -56.0

if not os.path.exists(LAND):
    print("fetching land geojson...")
    urllib.request.urlretrieve(URL, LAND)

data = json.load(open(LAND))

rings, bounds = [], []
for feat in data["features"]:
    g = feat["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for poly in polys:
        for ring in poly:
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            rings.append(ring)
            bounds.append((min(xs), max(xs), min(ys), max(ys)))
print("rings:", len(rings))


def inside(lng, lat):
    c = False
    for r, (x0, x1, y0, y1) in zip(rings, bounds):
        if lat < y0 or lat > y1 or lng < x0 or lng > x1:
            continue
        n = len(r)
        j = n - 1
        for i in range(n):
            xi, yi = r[i]
            xj, yj = r[j]
            if (yi > lat) != (yj > lat):
                if lng < (xj - xi) * (lat - yi) / (yj - yi) + xi:
                    c = not c
            j = i
    return c


bits = []
for row in range(ROWS):
    lat = LAT0 + (LAT1 - LAT0) * (row + 0.5) / ROWS
    for col in range(COLS):
        lng = LNG0 + (LNG1 - LNG0) * (col + 0.5) / COLS
        bits.append(1 if inside(lng, lat) else 0)

by = bytearray()
for i in range(0, len(bits), 8):
    chunk = bits[i:i + 8] + [0] * max(0, 8 - len(bits[i:i + 8]))
    v = 0
    for b in chunk:
        v = (v << 1) | b
    by.append(v)

b64 = base64.b64encode(bytes(by)).decode()
assert len(b64) % 4 == 0
assert len(base64.b64decode(b64)) == len(by)
print(f"land dots {sum(bits)}/{len(bits)}  bytes {len(by)}  b64 {len(b64)}")

W = 96
chunks = [b64[i:i + W] for i in range(0, len(b64), W)]
block = "  var LAND_B64 =\n" + " +\n".join(f"    '{c}'" for c in chunks) + ";\n"

src = open(JS).read()
new, n = re.subn(r"  var LAND_B64 =\n(?:.*\n)*?.*?;\n", block, src, count=1)
assert n == 1, "LAND_B64 block not found in main.js"
open(JS, "w").write(new)

# verify what landed on disk round-trips to the same bytes
m = re.search(r"var LAND_B64 =\s*([\s\S]*?);\n", open(JS).read())
joined = "".join(re.findall(r"'([^']*)'", m.group(1)))
assert joined == b64, "round-trip mismatch"
assert len(base64.b64decode(joined)) == 2205
print("main.js updated and verified:", len(joined), "chars,", len(chunks), "lines")

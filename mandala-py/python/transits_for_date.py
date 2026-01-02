import json
import sys
from datetime import datetime, timezone

import swisseph as swe

PLANETS = {
    "Pluto": swe.PLUTO,
    "Neptune": swe.NEPTUNE,
    "Uranus": swe.URANUS,
    "Saturn": swe.SATURN,
}

FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED

# --- Human Design gate mapping (tropical) ---
GATE_SIZE_DEG = 5.625  # 5°37'30" per gate
GATE25_START_DEG = 358.25  # 28°15' Pisces (tropical)

# Gate order around the mandala starting at Gate 25 start.
# Derived from the standard gate-by-degree sequence (Aries→Pisces).
GATE_ORDER = [
    25, 17, 21, 51, 42, 3,
    27, 24, 2, 23, 8, 20,
    16, 35, 45, 12, 15, 52,
    39, 53, 62, 56, 31, 33,
    7, 4, 29, 59, 40, 64,
    47, 6, 46, 18, 48, 57,
    32, 50, 28, 44, 1, 43,
    14, 34, 9, 5, 26, 11,
    10, 58, 38, 54, 61, 60,
    41, 19, 13, 49, 30, 55,
    37, 63, 22, 36
]

def lon_to_gate(lon_deg: float) -> int:
    """Map tropical ecliptic longitude (0..360) to Human Design gate number."""
    lon = lon_deg % 360.0
    # shift so that Gate 25 starts at 0.0 in our indexing space
    shifted = (lon - GATE25_START_DEG) % 360.0
    idx = int(shifted // GATE_SIZE_DEG)  # 0..63
    return GATE_ORDER[idx]


def jd_ut_from_iso(date_iso: str) -> float:
    # date_iso can be "2026-01-01" or full ISO string
    if len(date_iso) == 10:
        dt = datetime.fromisoformat(date_iso).replace(tzinfo=timezone.utc)
        # choose noon UT to avoid DST weirdness and day-boundary ambiguity
        dt = dt.replace(hour=12, minute=0, second=0, microsecond=0)
    else:
        dt = datetime.fromisoformat(date_iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)

    hour = dt.hour + dt.minute/60 + dt.second/3600
    return swe.julday(dt.year, dt.month, dt.day, hour)

def main():
    date_iso = sys.argv[1] if len(sys.argv) > 1 else datetime.now(timezone.utc).date().isoformat()
    jd = jd_ut_from_iso(date_iso)

    out = {"date": date_iso, "jd_ut": jd, "bodies": {}}

    for name, p in PLANETS.items():
        vals, _ = swe.calc_ut(jd, p, FLAGS)
        lon = float(vals[0]) % 360.0
        speed = float(vals[3])
        
        gate = lon_to_gate(lon)

        out["bodies"][name] = {
            "lon": lon,
            "gate": gate,
            "retrograde": speed < 0,
            "speed_lon": speed,
        }

    print(json.dumps(out))

if __name__ == "__main__":
    main()

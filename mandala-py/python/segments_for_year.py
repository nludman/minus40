import json
import sys
from datetime import datetime, timedelta, timezone

import swisseph as swe

# --- planets you want in the mandala ---
# Note: Earth and SouthNode are derived (oppositions) for HD-style mapping.
PLANETS = {
    "Moon": swe.MOON,
    "Sun": swe.SUN,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
    "NorthNode": swe.TRUE_NODE,  # swap to MEAN_NODE later if you decide
}


FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED

# --- Human Design gate mapping (tropical) ---
GATE_SIZE_DEG = 5.625
GATE25_START_DEG = 358.25  # 28°15' Pisces

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

def iso_z(dt: datetime) -> str:
    # Convert +00:00 to Z for cleaner JS parsing
    return dt.isoformat().replace("+00:00", "Z")

def lon_to_gate(lon_deg: float) -> int:
    lon = lon_deg % 360.0
    shifted = (lon - GATE25_START_DEG) % 360.0
    idx = int(shifted // GATE_SIZE_DEG)
    return GATE_ORDER[idx]

def jd_ut(dt_utc: datetime) -> float:
    hour = dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, hour)

def planet_gate_at(dt_utc: datetime, planet_const: int) -> int:
    jd = jd_ut(dt_utc)
    vals, _ = swe.calc_ut(jd, planet_const, FLAGS)
    lon = float(vals[0]) % 360.0
    return lon_to_gate(lon)

def opposite_gate(g: int) -> int:
    # Not used directly; we'll compute via longitude, not gate math.
    return g

def lon_at(dt_utc: datetime, planet_const: int) -> float:
    jd = jd_ut(dt_utc)
    vals, _ = swe.calc_ut(jd, planet_const, FLAGS)
    return float(vals[0]) % 360.0

def planet_gate_at_name(dt_utc: datetime, planet_name: str, planet_const: int) -> int:
    # Derived bodies
    if planet_name == "Earth":
        # Earth = Sun + 180 (geocentric opposition)
        lon = (lon_at(dt_utc, swe.SUN) + 180.0) % 360.0
        return lon_to_gate(lon)

    if planet_name == "SouthNode":
        # South Node = North Node + 180
        lon = (lon_at(dt_utc, swe.TRUE_NODE) + 180.0) % 360.0
        return lon_to_gate(lon)

    # Normal bodies
    lon = lon_at(dt_utc, planet_const)
    return lon_to_gate(lon)


def refine_transition(planet_name: str, planet_const: int, t0: datetime, g0: int, t1: datetime, g1: int, max_iters: int = 24) -> datetime:
    """
    Binary search the boundary between gates to ~second-level. Good enough for MVP.
    Assumes g0 != g1.
    """
    lo, hi = t0, t1
    for _ in range(max_iters):
        mid = lo + (hi - lo) / 2
        gm = planet_gate_at_name(mid, planet_name, planet_const)
        if gm == g0:
            lo = mid
        else:
            hi = mid
        # stop if window <= 1 second
        if (hi - lo).total_seconds() <= 1:
            break
    return hi  # first time we observe new gate

def build_segments_for_planet(year: int, planet_name: str, planet_const: int, step_hours: int = 6):
    start = datetime(year, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)  # exclusive end

    step = timedelta(hours=step_hours)

    t = start
    g_prev = planet_gate_at_name(t, planet_name, planet_const)
    seg_start = t
    segments = []

    # iterate strictly inside [start, end)
    t_next = t + step
    while t_next < end:
        g_next = planet_gate_at_name(t_next, planet_name, planet_const)

        if g_next != g_prev:
            # gate changed somewhere between t and t_next; refine boundary
            boundary = refine_transition(planet_name, planet_const, t, g_prev, t_next, g_next)

            # HARD CUT: clamp boundary to [start, end]
            if boundary < start:
                boundary = start
            if boundary > end:
                boundary = end

            # Append the finished segment, clamped to year
            seg_a = max(seg_start, start)
            seg_b = min(boundary, end)

            if seg_b > seg_a:
                segments.append({
                    "start": iso_z(seg_a),
                    "end": iso_z(seg_b),
                    "gate": g_prev
                })

            # Start next segment at the boundary (also clamped)
            seg_start = boundary
            g_prev = g_next

        t = t_next
        t_next = t + step

    # Final segment: clamp to end (hard cut)
    seg_a = max(seg_start, start)
    seg_b = end
    if seg_b > seg_a:
        segments.append({
            "start": iso_z(seg_a),
            "end": iso_z(seg_b),
            "gate": g_prev
        })

    return segments


def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2026

    out = {
        "year": year,
        "year_start_utc": iso_z(datetime(year, 1, 1, 0, 0, 0, tzinfo=timezone.utc)),
        "year_end_utc": iso_z(datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)),
        "transits": {}
    }

    for name, p in PLANETS.items():
        out["transits"][name] = {
            "segments": build_segments_for_planet(year, name, p, step_hours=6)
        }

        # --- Derived bodies (oppositions) ---
        out["transits"]["Earth"] = {
            "segments": build_segments_for_planet(year, "Earth", swe.SUN, step_hours=6)
        }

        out["transits"]["SouthNode"] = {
            "segments": build_segments_for_planet(year, "SouthNode", swe.TRUE_NODE, step_hours=24)
        }

    print(json.dumps(out))


if __name__ == "__main__":
    main()

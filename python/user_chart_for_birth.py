# PATH: python/user_chart_for_birth.py
import json
import sys
from datetime import datetime, timedelta, timezone

import swisseph as swe

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

PLANET_ORDER = [
    "Sun",
    "Earth",
    "North Node",
    "South Node",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
]

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
    "North Node": swe.TRUE_NODE,
}

def iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

def lon_to_gate(lon_deg: float) -> int:
    lon = lon_deg % 360.0
    shifted = (lon - GATE25_START_DEG) % 360.0
    idx = int(shifted // GATE_SIZE_DEG)
    return GATE_ORDER[idx]

def lon_to_gate_line_color_tone_base(lon_deg: float):
    """
    Returns (gate, line, color, tone, base) using HD substructure:
    6 Lines, 6 Colors, 6 Tones, 5 Bases. :contentReference[oaicite:1]{index=1}
    """
    lon = lon_deg % 360.0
    shifted = (lon - GATE25_START_DEG) % 360.0

    gate_idx = int(shifted // GATE_SIZE_DEG)
    gate = GATE_ORDER[gate_idx]

    # Remainder inside the gate wedge
    r_gate = shifted - gate_idx * GATE_SIZE_DEG  # [0, 5.625)

    # Subdivision sizes
    line_size = GATE_SIZE_DEG / 6.0
    color_size = line_size / 6.0
    tone_size = color_size / 6.0
    base_size = tone_size / 5.0

    # Guard against float edge cases (e.g. exact boundary)
    eps = 1e-12
    r_gate = max(0.0, min(r_gate, GATE_SIZE_DEG - eps))

    line_idx = int(r_gate // line_size)  # 0..5
    r_line = r_gate - line_idx * line_size
    r_line = max(0.0, min(r_line, line_size - eps))

    color_idx = int(r_line // color_size)  # 0..5
    r_color = r_line - color_idx * color_size
    r_color = max(0.0, min(r_color, color_size - eps))

    tone_idx = int(r_color // tone_size)  # 0..5
    r_tone = r_color - tone_idx * tone_size
    r_tone = max(0.0, min(r_tone, tone_size - eps))

    base_idx = int(r_tone // base_size)  # 0..4

    # Convert to 1-based
    line = line_idx + 1
    color = color_idx + 1
    tone = tone_idx + 1
    base = base_idx + 1

    return gate, line, color, tone, base


def jd_ut(dt_utc: datetime) -> float:
    dt_utc = dt_utc.astimezone(timezone.utc)
    hour = dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, hour)

def lon_at(dt_utc: datetime, planet_const: int) -> float:
    jd = jd_ut(dt_utc)
    vals, _ = swe.calc_ut(jd, planet_const, FLAGS)
    return float(vals[0]) % 360.0

def sun_lon(dt_utc: datetime) -> float:
    return lon_at(dt_utc, swe.SUN)

def ang_diff_deg(a: float, b: float) -> float:
    """
    Smallest signed angular difference a-b in degrees in [-180, 180).
    """
    d = (a - b) % 360.0
    if d >= 180.0:
        d -= 360.0
    return d

def find_design_time(birth_utc: datetime) -> datetime:
    """
    Find the UTC datetime when the Sun is ~88 degrees of longitude behind the birth Sun.
    This is the HD design moment. Uses bracket + binary search.
    """
    birth_utc = birth_utc.astimezone(timezone.utc)

    birth_sun = sun_lon(birth_utc) % 360.0
    target = (birth_sun - 88.0) % 360.0

    # Initial guess window: around 88 days back
    # We'll bracket by stepping until we cross the target.
    guess = birth_utc - timedelta(days=88)

    # We want to find t such that sun_lon(t) == target (mod 360).
    # Define f(t) = signed angular difference sun_lon(t) - target.
    def f(dt: datetime) -> float:
        return ang_diff_deg(sun_lon(dt), target)

    # Bracket search: find lo, hi such that f(lo) and f(hi) have opposite signs.
    # Use small steps because Sun motion is monotonic-ish over this window.
    step = timedelta(hours=6)

    lo = guess - timedelta(days=2)
    hi = guess + timedelta(days=2)

    flo = f(lo)
    fhi = f(hi)

    # Expand window if needed (rare but safe)
    expand_iters = 0
    while flo * fhi > 0 and expand_iters < 40:
        lo -= step * 4
        hi += step * 4
        flo = f(lo)
        fhi = f(hi)
        expand_iters += 1

    if flo * fhi > 0:
        # Fallback: if we couldn't bracket, revert to approx
        return guess

    # Binary search to ~1 second
    for _ in range(40):
        mid = lo + (hi - lo) / 2
        fmid = f(mid)

        if flo * fmid <= 0:
            hi = mid
            fhi = fmid
        else:
            lo = mid
            flo = fmid

        if (hi - lo).total_seconds() <= 1:
            break

    return hi


def gate_for_body(dt_utc: datetime, name: str):
    if name == "Earth":
        lon = (lon_at(dt_utc, swe.SUN) + 180.0) % 360.0
        gate, line, color, tone, base = lon_to_gate_line_color_tone_base(lon)
        return {"gate": gate, "line": line, "color": color, "tone": tone, "base": base}

    if name == "South Node":
        lon = (lon_at(dt_utc, swe.TRUE_NODE) + 180.0) % 360.0
        gate, line, color, tone, base = lon_to_gate_line_color_tone_base(lon)
        return {"gate": gate, "line": line, "color": color, "tone": tone, "base": base}

    if name not in PLANETS:
        raise ValueError(f"Unknown body: {name}")

    lon = lon_at(dt_utc, PLANETS[name])
    gate, line, color, tone, base = lon_to_gate_line_color_tone_base(lon)
    return {"gate": gate, "line": line, "color": color, "tone": tone, "base": base}



def parse_iso_to_utc(s: str) -> datetime:
    # Accepts "YYYY-MM-DDTHH:MM:SS(.sss)Z" or with offset
    s = s.strip()
    if s.endswith("Z"):
        s = s.replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        # assume UTC if missing
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def compute_chart(birth_utc: datetime):
    # HD design time: exact “Sun 88° before birth Sun” solve
    design_utc = find_design_time(birth_utc)

    personality = {}
    design = {}
    for name in PLANET_ORDER:
        personality[name] = gate_for_body(birth_utc, name)
        design[name] = gate_for_body(design_utc, name)

    return {
        "kind": "hd_chart_v1",
        "birth_utc": iso_z(birth_utc),
        "design_utc": iso_z(design_utc),
        "planetOrder": PLANET_ORDER,
        "personalityByPlanet": personality,
        "designByPlanet": design,
    }

def main():
    # Usage: python user_chart_for_birth.py "<birth_utc_iso>"
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing_arg", "details": "Expected birth UTC ISO string arg"}))
        sys.exit(1)

    birth_utc = parse_iso_to_utc(sys.argv[1])
    out = compute_chart(birth_utc)
    print(json.dumps(out))

if __name__ == "__main__":
    main()

/**
 * PATH: src/app/api/segments-year/route.ts
 *
 * Segments endpoint (disk-cached per YEAR, server-sliced per requested range).
 *
 * Calendar mode (seam at top, clockwise):
 * - GET /api/segments-year?year=2026
 * - GET /api/segments-year?year=2026&view=calendar&span=year
 * - GET /api/segments-year?year=2026&view=calendar&span=quarter&q=1
 * - GET /api/segments-year?year=2026&view=calendar&span=month&m=0          (0=Jan)
 * - GET /api/segments-year?year=2026&view=calendar&span=week&start=ISO&end=ISO
 *
 * Tracker mode (anchor at bottom, counter-clockwise, centered around anchor):
 * - GET /api/segments-year?year=2026&view=tracker                          (default anchor=now, +/- 7d)
 * - GET /api/segments-year?year=2026&view=tracker&anchor=ISO&backDays=7&forwardDays=7
 * - GET /api/segments-year?year=2026&view=tracker&anchor=ISO&start=ISO&end=ISO   (explicit)
 *
 * Cache:
 * - We cache FULL YEAR output at ../.cache/segments/<year>.json
 * - Requests for spans/ranges slice that cached year payload (or recompute if missing/reset).
 */

import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

function getRepoRoot() {
  return path.resolve(process.cwd(), "..");
}

function getPythonExe(repoRoot: string) {
  const winVenv = path.join(repoRoot, "python", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(winVenv)) return winVenv;
  return "python";
}

function safeParseJson(stdout: string) {
  const text = String(stdout).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in stdout");
  return JSON.parse(text.slice(start, end + 1));
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

type PlanetSeg = { start: string; end: string; gate: number };
type YearPayload = {
  year: number;
  year_start_utc: string;
  year_end_utc: string;
  transits: Record<string, { segments: PlanetSeg[] }>;
};

function parseBool(v: string | null) {
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes";
}

function toIso(ms: number) {
  return new Date(ms).toISOString();
}

function clampMs(ms: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, ms));
}

function sliceSegmentsToRange(payload: YearPayload, rangeStartMs: number, rangeEndMs: number) {
  const out: YearPayload & {
    range_start_utc: string;
    range_end_utc: string;
  } = {
    ...payload,
    range_start_utc: toIso(rangeStartMs),
    range_end_utc: toIso(rangeEndMs),
    // transits replaced below
    transits: {} as any,
  };

  for (const [body, planet] of Object.entries(payload.transits)) {
    const segs = planet?.segments;
    if (!Array.isArray(segs)) continue;

    const sliced: PlanetSeg[] = [];

    for (const s of segs) {
      const a = Date.parse(s.start);
      const b = Date.parse(s.end);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      if (b <= rangeStartMs || a >= rangeEndMs) continue; // no overlap

      const cs = clampMs(a, rangeStartMs, rangeEndMs);
      const ce = clampMs(b, rangeStartMs, rangeEndMs);
      if (ce <= cs) continue;

      sliced.push({
        gate: s.gate,
        start: toIso(cs),
        end: toIso(ce),
      });
    }

    out.transits[body] = { segments: sliced };
  }

  return out;
}

function computeCalendarRange(params: URLSearchParams, year: number) {
  const span = (params.get("span") ?? "year").toLowerCase();

  // Full year by default
  if (span === "year") {
    const start = Date.UTC(year, 0, 1, 0, 0, 0);
    const end = Date.UTC(year + 1, 0, 1, 0, 0, 0);
    return { span: "year", rangeStartMs: start, rangeEndMs: end };
  }

  if (span === "quarter") {
    const qRaw = Number(params.get("q") ?? "1"); // 1..4
    const q = Number.isFinite(qRaw) ? Math.max(1, Math.min(4, Math.floor(qRaw))) : 1;
    const m0 = (q - 1) * 3;
    const start = Date.UTC(year, m0, 1, 0, 0, 0);
    const end = Date.UTC(year, m0 + 3, 1, 0, 0, 0);
    return { span: "quarter", rangeStartMs: start, rangeEndMs: end, q };
  }

  if (span === "month") {
    const mRaw = Number(params.get("m") ?? "0"); // 0..11
    const m = Number.isFinite(mRaw) ? Math.max(0, Math.min(11, Math.floor(mRaw))) : 0;
    const start = Date.UTC(year, m, 1, 0, 0, 0);
    const end = Date.UTC(year, m + 1, 1, 0, 0, 0);
    return { span: "month", rangeStartMs: start, rangeEndMs: end, m };
  }

  // Week: require explicit start/end; otherwise default to first 7 days of year.
  if (span === "week") {
    const startIso = params.get("start");
    const endIso = params.get("end");

    let start = startIso ? Date.parse(startIso) : Date.UTC(year, 0, 1, 0, 0, 0);
    let end = endIso ? Date.parse(endIso) : start + 7 * 24 * 60 * 60 * 1000;

    if (!Number.isFinite(start)) start = Date.UTC(year, 0, 1, 0, 0, 0);
    if (!Number.isFinite(end) || end <= start) end = start + 7 * 24 * 60 * 60 * 1000;

    return { span: "week", rangeStartMs: start, rangeEndMs: end };
  }

  // Fallback: treat unknown spans as year
  const start = Date.UTC(year, 0, 1, 0, 0, 0);
  const end = Date.UTC(year + 1, 0, 1, 0, 0, 0);
  return { span: "year", rangeStartMs: start, rangeEndMs: end };
}

function computeTrackerRange(params: URLSearchParams, fallbackYear: number) {
  const nowMs = Date.now();

  // Anchor defaults to "now"
  const anchorIso = params.get("anchor");
  let anchorMs = anchorIso ? Date.parse(anchorIso) : nowMs;
  if (!Number.isFinite(anchorMs)) anchorMs = nowMs;

  // If explicit start/end provided, honor them (still tracker view)
  const startIso = params.get("start");
  const endIso = params.get("end");
  if (startIso && endIso) {
    const s = Date.parse(startIso);
    const e = Date.parse(endIso);
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
      return {
        span: "custom",
        anchorMs,
        rangeStartMs: s,
        rangeEndMs: e,
      };
    }
  }

  // Otherwise use back/forward days, default +/- 7
  const backDaysRaw = Number(params.get("backDays") ?? "7");
  const forwardDaysRaw = Number(params.get("forwardDays") ?? "7");
  const backDays = Number.isFinite(backDaysRaw) ? Math.max(0, backDaysRaw) : 7;
  const forwardDays = Number.isFinite(forwardDaysRaw) ? Math.max(0, forwardDaysRaw) : 7;

  const dayMs = 24 * 60 * 60 * 1000;
  const start = anchorMs - backDays * dayMs;
  const end = anchorMs + forwardDays * dayMs;

  // If somehow degenerate, fallback to a 14-day window around Jan 1
  if (!(end > start)) {
    const jan1 = Date.UTC(fallbackYear, 0, 1, 0, 0, 0);
    return {
      span: "custom",
      anchorMs,
      rangeStartMs: jan1 - 7 * dayMs,
      rangeEndMs: jan1 + 7 * dayMs,
    };
  }

  return { span: "custom", anchorMs, rangeStartMs: start, rangeEndMs: end, backDays, forwardDays };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const yearRaw = searchParams.get("year");
  const year = Number(yearRaw);

  if (!Number.isFinite(year) || year < 1900 || year > 2200) {
    return NextResponse.json(
      { error: "bad_year", details: `Expected ?year=YYYY, got ${String(yearRaw)}` },
      { status: 400 }
    );
  }

  const reset = parseBool(searchParams.get("reset"));

  const view = (searchParams.get("view") ?? "calendar").toLowerCase() as "calendar" | "tracker";

  // Always compute a requested range (defaults: calendar/year; tracker/+/-7d around now)
  const calendarRange = computeCalendarRange(searchParams, year);
  const trackerRange = computeTrackerRange(searchParams, year);

  const range =
    view === "tracker"
      ? trackerRange
      : calendarRange;

  const repoRoot = getRepoRoot();
  const pythonExe = getPythonExe(repoRoot);
  const script = path.join(repoRoot, "python", "segments_for_year.py");

  // Disk cache for FULL YEAR only
  const cacheDir = path.join(repoRoot, ".cache", "segments");
  ensureDir(cacheDir);
  const cacheFile = path.join(cacheDir, `${year}.json`);

  // Load or compute full-year payload
  let full: YearPayload | null = null;

  // Cache HIT (unless reset)
  try {
    if (!reset && fs.existsSync(cacheFile)) {
      full = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    }
  } catch {
    full = null;
  }

  // If no cache or reset, recompute via python
  if (!full) {
    const computed = await new Promise<YearPayload | null>((resolve) => {
      execFile(
        pythonExe,
        [script, String(year)],
        { maxBuffer: 50 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            console.error(stderr || err);
            resolve(null);
            return;
          }
          try {
            resolve(safeParseJson(String(stdout)));
          } catch (e) {
            console.error(e);
            resolve(null);
          }
        }
      );
    });

    if (!computed) {
      return NextResponse.json(
        { error: "python_failed", details: "Failed to compute segments payload" },
        { status: 500 }
      );
    }

    full = computed;

    // Write cache (best-effort)
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(full));
    } catch { }
  }

  // Slice to requested range
  const sliced = sliceSegmentsToRange(full, range.rangeStartMs, range.rangeEndMs);

  // Attach view metadata (non-breaking additions)
  const response = {
    ...sliced,
    view,
    span: range.span,
    // In tracker mode, echo anchor for client mapping / marker
    ...(view === "tracker"
      ? { anchor_utc: toIso((range as any).anchorMs) }
      : {}),
  };

  return NextResponse.json(response, {
    headers: {
      "x-mandala-cache": reset ? "BYPASS" : (fs.existsSync(cacheFile) ? "HIT" : "MISS"),
      "x-mandala-slice": "1",
    },
  });
}

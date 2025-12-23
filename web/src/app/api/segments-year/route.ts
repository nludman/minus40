/**
 * PATH: src/app/api/segments-year/route.ts
 *
 * Year segments endpoint (disk-cached).
 * - GET /api/segments-year?year=2026
 * - GET /api/segments-year?year=2026&reset=1   (force recompute + overwrite cache)
 */

import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

/**
 * Next runs with process.cwd() = /VSCodeTest/web
 * We want the repo root = /VSCodeTest
 */
function getRepoRoot() {
  return path.resolve(process.cwd(), "..");
}

function getPythonExe(repoRoot: string) {
  // Windows venv
  const winVenv = path.join(repoRoot, "python", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(winVenv)) return winVenv;

  // Fallback (mac/linux or if venv path changes)
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

  const reset =
    searchParams.get("reset") === "1" ||
    searchParams.get("reset") === "true" ||
    searchParams.get("reset") === "yes";

  const repoRoot = getRepoRoot();
  const pythonExe = getPythonExe(repoRoot);
  const script = path.join(repoRoot, "python", "segments_for_year.py");

  // Disk cache: ../.cache/segments/<year>.json
  const cacheDir = path.join(repoRoot, ".cache", "segments");
  ensureDir(cacheDir);
  const cacheFile = path.join(cacheDir, `${year}.json`);

  // Cache HIT (unless reset)
  try {
    if (!reset && fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      return NextResponse.json(cached, {
        headers: { "x-mandala-cache": "HIT" },
      });
    }
  } catch {
    // Corrupt cache: fall through to recompute
  }

  // Recompute via python
  return await new Promise<NextResponse>((resolve) => {
    execFile(
      pythonExe,
      [script, String(year)],
      { maxBuffer: 50 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          resolve(
            NextResponse.json(
              { error: "python_failed", details: String(stderr || err) },
              { status: 500 }
            )
          );
          return;
        }

        try {
          const parsed = safeParseJson(String(stdout));

          // Write cache (best-effort)
          try {
            fs.writeFileSync(cacheFile, JSON.stringify(parsed));
          } catch { }

          resolve(
            NextResponse.json(parsed, {
              headers: { "x-mandala-cache": reset ? "BYPASS" : "MISS" },
            })
          );
        } catch (e) {
          resolve(
            NextResponse.json(
              {
                error: "bad_json",
                details: String(e),
                raw: String(stdout),
                stderr: String(stderr),
              },
              { status: 500 }
            )
          );
        }
      }
    );
  });
}

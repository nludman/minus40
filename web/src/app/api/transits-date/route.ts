//app/api/transits-date/route.ts

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = String(searchParams.get("date") ?? "2026-01-01");

  const MANDALA_PY_URL = process.env.MANDALA_PY_URL || "";
  const MANDALA_API_KEY = process.env.MANDALA_API_KEY || "";

  if (!MANDALA_PY_URL) {
    return NextResponse.json(
      { error: "missing_env", details: "Set MANDALA_PY_URL" },
      { status: 500 }
    );
  }

  const res = await fetch(
    `${MANDALA_PY_URL}/transits/date?date=${encodeURIComponent(date)}`,
    {
      headers: { "x-api-key": MANDALA_API_KEY },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "python_failed", details: text || `Cloud Run ${res.status}` },
      { status: 500 }
    );
  }

  const payload = await res.json();
  return NextResponse.json(payload);
}


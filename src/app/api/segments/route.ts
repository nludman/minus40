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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = String(searchParams.get("year") ?? "2026");

  const repoRoot = getRepoRoot();
  const pythonExe = getPythonExe(repoRoot);
  const script = path.join(repoRoot, "python", "segments_for_year.py");

  return await new Promise<NextResponse>((resolve) => {
    execFile(
      pythonExe,
      [script, year],
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
          resolve(NextResponse.json(safeParseJson(String(stdout))));
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

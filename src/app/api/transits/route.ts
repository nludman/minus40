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

  const repoRoot = getRepoRoot();
  const pythonExe = getPythonExe(repoRoot);
  const script = path.join(repoRoot, "python", "transits_for_date.py");

  return await new Promise<NextResponse>((resolve) => {
    execFile(
      pythonExe,
      [script, date],
      { maxBuffer: 10 * 1024 * 1024 },
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

/**
 * PATH: src/app/api/user-chart/route.ts
 *
 * POST /api/user-chart
 * Body: { birth_utc: string }
 * Returns: { kind, birth_utc, design_utc, planetOrder, personalityByPlanet, designByPlanet }
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

export async function POST(req: Request) {
    let body: any = null;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }

    const birthUtc = String(body?.birth_utc ?? "");
    if (!birthUtc) {
        return NextResponse.json({ error: "missing_birth_utc" }, { status: 400 });
    }

    const repoRoot = getRepoRoot();
    const pythonExe = getPythonExe(repoRoot);
    const script = path.join(repoRoot, "python", "user_chart_for_birth.py");

    return await new Promise<NextResponse>((resolve) => {
        execFile(
            pythonExe,
            [script, birthUtc],
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
                    const parsed = safeParseJson(String(stdout));
                    resolve(NextResponse.json(parsed));
                } catch (e) {
                    resolve(
                        NextResponse.json(
                            { error: "bad_json", details: String(e), raw: String(stdout), stderr: String(stderr) },
                            { status: 500 }
                        )
                    );
                }
            }
        );
    });
}

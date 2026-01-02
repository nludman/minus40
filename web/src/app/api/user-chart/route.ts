/**
 * PATH: src/app/api/user-chart/route.ts
 *
 * POST /api/user-chart
 * Body: { birth_utc: string }
 * Returns: { kind, birth_utc, design_utc, planetOrder, personalityByPlanet, designByPlanet }
 */

import { NextResponse } from "next/server";

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

    const MANDALA_PY_URL = process.env.MANDALA_PY_URL || "";
    const MANDALA_API_KEY = process.env.MANDALA_API_KEY || "";

    if (!MANDALA_PY_URL) {
        return NextResponse.json(
            { error: "missing_env", details: "Set MANDALA_PY_URL" },
            { status: 500 }
        );
    }

    if (!MANDALA_API_KEY) {
        return NextResponse.json(
            { error: "missing_env", details: "Set MANDALA_API_KEY" },
            { status: 500 }
        );
    }

    const res = await fetch(`${MANDALA_PY_URL}/chart/generate`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-api-key": MANDALA_API_KEY,
        },
        body: JSON.stringify({ birth_utc: birthUtc }),
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
            { error: "python_failed", details: text || `Cloud Run ${res.status}` },
            { status: 500 }
        );
    }

    return NextResponse.json(await res.json());
}

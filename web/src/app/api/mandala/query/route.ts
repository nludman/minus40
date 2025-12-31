import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Payload = {
    q: string;
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Payload;
        const q = (body?.q ?? "").trim();
        if (!q) {
            return NextResponse.json({ error: "Missing q" }, { status: 400 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
        }

        // Keep it cheap: only resolve "highlight gate N" for now.
        const system = `
You are a router for a Human Design mandala UI.
Your job: read the user's query and decide whether they want to highlight a gate.

Rules:
- If the query implies showing/highlighting a specific gate, return action "highlight_gate" and a gate number 1..64.
- If you cannot confidently find a gate number, return action "noop".
- Do not hallucinate dates, planets, or schedules.
- Keep output minimal.

Respond ONLY as JSON with keys:
- action: "highlight_gate" | "noop"
- gate?: number
`;

        const r = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0.2,
                max_tokens: 120,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: system.trim() },
                    { role: "user", content: JSON.stringify({ q }) },
                ],
            }),
        });

        if (!r.ok) {
            return NextResponse.json({ error: "OpenAI request failed" }, { status: 502 });
        }

        const data = await r.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
            return NextResponse.json({ error: "Bad OpenAI response" }, { status: 502 });
        }

        let parsed: any = null;
        try {
            parsed = JSON.parse(content);
        } catch {
            return NextResponse.json({ error: "Invalid JSON from model" }, { status: 502 });
        }

        const action = parsed?.action;
        const gate = parsed?.gate;

        if (action === "highlight_gate" && typeof gate === "number" && gate >= 1 && gate <= 64) {
            return NextResponse.json({ action: "highlight_gate", gate });
        }

        return NextResponse.json({ action: "noop" });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

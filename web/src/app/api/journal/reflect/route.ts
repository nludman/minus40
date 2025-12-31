import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Payload = {
    text: string;
    nav?: any;
    selected?: any;
    year?: number;
    appPage?: string;
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Payload;
        const text = (body?.text ?? "").trim();
        if (!text) {
            return NextResponse.json({ error: "Missing text" }, { status: 400 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
        }

        // Keep it cheap: small output, lightweight model, single call.
        const system = `
You are a gentle journal companion.
Do NOT give medical/legal advice.
Do NOT be long-winded.
Return:
1) a short reflection (3-8 sentences)
2) lightweight metadata: mood, tags (<=5), and 1-2 key themes
Respond ONLY as JSON with keys: reflection, metadata
`;

        const user = {
            text,
            context: {
                year: body.year,
                appPage: body.appPage,
                nav: body.nav,
                selected: body.selected,
            },
        };

        const r = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0.7,
                max_tokens: 250,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: system.trim() },
                    { role: "user", content: JSON.stringify(user) },
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

        return NextResponse.json({
            reflection: typeof parsed?.reflection === "string" ? parsed.reflection : "",
            metadata: parsed?.metadata ?? null,
        });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

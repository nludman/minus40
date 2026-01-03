// PATH: src/lib/mandala/userOverlay.ts


export function extractUserGates(userChart?: any): Set<number> {
    const out = new Set<number>();
    const d = userChart?.data;

    const derivedGates = d?.derived?.userGates;
    if (Array.isArray(derivedGates)) {
        return new Set<number>(derivedGates.filter((g: any) => typeof g === "number"));
    }


    // Preferred structure (what your UserChartVisual normalizes)
    const designByPlanet = d?.designByPlanet;
    const personalityByPlanet = d?.personalityByPlanet;

    for (const src of [designByPlanet, personalityByPlanet]) {
        if (!src) continue;
        for (const k of Object.keys(src)) {
            const v = src[k];
            if (typeof v === "number") out.add(v);
            else if (v && typeof v.gate === "number") out.add(v.gate);
        }
    }

    // Fallback if someone uploads arrays
    const designArr: unknown = d?.designGates;
    const persArr: unknown = d?.personalityGates;
    if (Array.isArray(designArr)) designArr.forEach((g) => typeof g === "number" && out.add(g));
    if (Array.isArray(persArr)) persArr.forEach((g) => typeof g === "number" && out.add(g));

    return out;
}

export function extractUserDefinedChannelKeys(userChart?: any): Set<string> {
    const out = new Set<string>();
    const d = userChart?.data;

    // Accept a few possible shapes:
    // - d.definedChannels = [[21,45], [37,40]] or ["21-45", "37-40"]
    // - d.channels / d.definedChannelPairs similar
    const candidates =
        d?.definedChannels ??
        d?.definedChannelPairs ??
        d?.channels ??
        null;

    if (!candidates) return out;

    const addPair = (a: number, b: number) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        out.add(`${lo}-${hi}`);
    };

    if (Array.isArray(candidates)) {
        for (const item of candidates) {
            if (Array.isArray(item) && item.length === 2) {
                const a = Number(item[0]);
                const b = Number(item[1]);
                if (Number.isFinite(a) && Number.isFinite(b)) addPair(a, b);
            } else if (typeof item === "string") {
                const m = item.match(/(\d+)\s*[-–]\s*(\d+)/);
                if (m) addPair(Number(m[1]), Number(m[2]));
            } else if (item && typeof item === "object") {
                // e.g. { a: 21, b: 45 } or { gateA, gateB }
                const a = Number((item as any).a ?? (item as any).gateA);
                const b = Number((item as any).b ?? (item as any).gateB);
                if (Number.isFinite(a) && Number.isFinite(b)) addPair(a, b);
            }
        }
    }

    return out;
}
// PATH: src/lib/userChartCache.ts
import { definedChannelsFromGates } from "@/lib/hd/channels";



export type UserChartPayload = {
    version: 1;
    label?: string;

    // New: identify where the chart came from
    source?: "upload" | "paste" | "generator";

    // Flexible body: either "test" format or later "real" format
    data: any;
};

const KEY_CHART = "mandala:userChart";
const KEY_META = "mandala:userChartMeta";

function extractAllUserGates(payload: UserChartPayload): number[] {
    const d = payload?.data;

    const out: number[] = [];
    const addVal = (v: any) => {
        if (typeof v === "number") out.push(v);
        else if (v && typeof v.gate === "number") out.push(v.gate);
    };

    // Your current normalized structure (from UserChartVisual / panel tooling)
    const designByPlanet = d?.designByPlanet;
    const personalityByPlanet = d?.personalityByPlanet;

    if (designByPlanet) Object.values(designByPlanet).forEach(addVal);
    if (personalityByPlanet) Object.values(personalityByPlanet).forEach(addVal);

    // Optional fallbacks if you ever store arrays
    if (Array.isArray(d?.designGates)) d.designGates.forEach(addVal);
    if (Array.isArray(d?.personalityGates)) d.personalityGates.forEach(addVal);

    // Dedup and clamp to valid gates
    return Array.from(new Set(out)).filter((g) => Number.isFinite(g) && g >= 1 && g <= 64);
}

function enrichUserChart(payload: UserChartPayload): UserChartPayload {
    try {
        const gates = extractAllUserGates(payload);
        const { pairs, keys } = definedChannelsFromGates(gates);

        return {
            ...payload,
            data: {
                ...payload.data,
                derived: {
                    ...(payload.data?.derived ?? {}),
                    userGates: gates,
                    definedChannels: pairs,       // [[21,45], ...]
                    definedChannelKeys: keys,     // ["21-45", ...]
                },
            },
        };
    } catch {
        return payload;
    }
}


export function loadUserChart(): UserChartPayload | null {
    try {
        const raw = localStorage.getItem(KEY_CHART);
        if (!raw) return null;
        return enrichUserChart(JSON.parse(raw) as UserChartPayload);
    } catch {
        return null;
    }
}


export function saveUserChart(payload: UserChartPayload) {
    const enriched = enrichUserChart(payload);

    localStorage.setItem(KEY_CHART, JSON.stringify(enriched));
    localStorage.setItem(
        KEY_META,
        JSON.stringify({ savedAt: new Date().toISOString(), version: enriched.version })
    );
}


export function clearUserChart() {
    localStorage.removeItem(KEY_CHART);
    localStorage.removeItem(KEY_META);
}

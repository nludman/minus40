// PATH: src/lib/chartGenerator.ts
import type { UserChartPayload } from "@/lib/userChartCache";

// (leave your existing imports and other functions as-is)

const PLANET_ORDER = [
    "Sun",
    "Earth",
    "North Node",
    "South Node",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
] as const;

type PlanetName = (typeof PLANET_ORDER)[number];

function pickUnique(nums: number[], n: number) {
    const copy = [...nums];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

export function generateTestChart(label = "test-chart"): UserChartPayload {
    const gates = Array.from({ length: 64 }, (_, i) => i + 1);

    const personality = pickUnique(gates, PLANET_ORDER.length);
    const design = pickUnique(gates.filter((g) => !personality.includes(g)), PLANET_ORDER.length);

    const personalityByPlanet: Record<PlanetName, number> = {} as any;
    const designByPlanet: Record<PlanetName, number> = {} as any;

    PLANET_ORDER.forEach((p, i) => {
        personalityByPlanet[p] = personality[i];
        designByPlanet[p] = design[i];
    });

    return {
        version: 1,
        label,
        source: "generator",
        data: {
            kind: "test",
            createdAt: new Date().toISOString(),
            planetOrder: PLANET_ORDER,
            personalityByPlanet,
            designByPlanet,
        },
    };
}


export function generateBirthDataSkeleton(input: {
    label?: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM (24h)
    location: string; // free text for now
}): UserChartPayload {
    return {
        version: 1,
        label: input.label ?? "birthdata",
        source: "generator",
        data: {
            kind: "birthdata",
            createdAt: new Date().toISOString(),
            birth: {
                date: input.date,
                time: input.time,
                location: input.location,
            },
            // placeholder for future computed results:
            computed: null,
        },
    };
}

export async function generateChartFromInputs(input: {
    label?: string;
    date: string;     // YYYY-MM-DD
    time: string;     // HH:MM
    location: string; // optional text
}): Promise<UserChartPayload> {
    const local = new Date(`${input.date}T${input.time}:00`);
    if (Number.isNaN(local.getTime())) throw new Error("Invalid birth date/time.");
    const birth_utc = local.toISOString();

    const res = await fetch("/api/user-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth_utc }),
    });

    if (!res.ok) throw new Error(await res.text());

    const computed = await res.json();

    // ✅ IMPORTANT: store computed at data root (same as UserChartPanel)
    return {
        version: 1,
        label: input.label ?? "New Chart",
        source: "generator",
        data: computed,
    };
}


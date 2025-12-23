// PATH: src/lib/chartGenerator.ts
import type { UserChartPayload } from "@/lib/userChartCache";

function pickUnique(nums: number[], n: number) {
    const copy = [...nums];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

export function generateTestChart(label = "test-chart"): UserChartPayload {
    // Human Design gates are 1..64
    const gates = Array.from({ length: 64 }, (_, i) => i + 1);

    // Pick some “activations” just to have something deterministic-ish
    const personality = pickUnique(gates, 13);
    const design = pickUnique(gates.filter((g) => !personality.includes(g)), 13);

    return {
        version: 1,
        label,
        source: "generator",
        data: {
            kind: "test",
            createdAt: new Date().toISOString(),
            personalityGates: personality.sort((a, b) => a - b),
            designGates: design.sort((a, b) => a - b),
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

// PATH: src/components/mandala/UserChartVisual.tsx
"use client";

import type { UserChartPayload } from "@/lib/userChartCache";
import { useState } from "react";


const DEFAULT_PLANET_ORDER = [
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

type PlanetName = (typeof DEFAULT_PLANET_ORDER)[number];

type Activation = {
    gate: number;
    line?: number;
    color?: number;
    tone?: number;
    base?: number;
};

function formatActivation(a: Activation | number | undefined, showSub: boolean) {
    if (a == null) return "—";
    if (typeof a === "number") return String(a);

    if (!showSub) return String(a.gate);

    const parts = [a.gate, a.line, a.color, a.tone, a.base].filter(
        (v) => typeof v === "number"
    ) as number[];

    return parts.join(".");
}


function normalizeToPlanetMap(
    chart: UserChartPayload | null
): {
    order: readonly PlanetName[];
    design: Partial<Record<PlanetName, Activation | number>>;
    personality: Partial<Record<PlanetName, Activation | number>>;
} {
    if (!chart) return { order: DEFAULT_PLANET_ORDER, design: {}, personality: {} };

    const d = chart.data;

    // Preferred shape (what our generator now produces)
    if (d?.designByPlanet && d?.personalityByPlanet) {
        const order = (d.planetOrder ?? DEFAULT_PLANET_ORDER) as readonly PlanetName[];
        return {
            order,
            design: d.designByPlanet as Partial<Record<PlanetName, Activation>>,
            personality: d.personalityByPlanet as Partial<Record<PlanetName, Activation>>,

        };
    }

    // Fallback: if someone uploaded arrays, map sequentially into the planet order
    const order = DEFAULT_PLANET_ORDER;
    const designArr: number[] = Array.isArray(d?.designGates) ? d.designGates : [];
    const persArr: number[] = Array.isArray(d?.personalityGates) ? d.personalityGates : [];

    const design: Partial<Record<PlanetName, Activation | number>> = {};
    const personality: Partial<Record<PlanetName, Activation | number>> = {};


    order.forEach((p, i) => {
        if (typeof designArr[i] === "number") design[p] = designArr[i];
        if (typeof persArr[i] === "number") personality[p] = persArr[i];
    });

    return { order, design, personality };
}

function Row({
    planet,
    text,
}: {
    planet: PlanetName;
    text: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/10">
            <div className="text-xs text-white/60">{planet}</div>
            <div className="text-sm font-semibold text-white/90 tabular-nums">{text}</div>
        </div>
    );
}


export default function UserChartVisual({ userChart }: { userChart: UserChartPayload | null }) {
    const { order, design, personality } = normalizeToPlanetMap(userChart);
    const [showSubstructure, setShowSubstructure] = useState(false);


    return (
        <div className="w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur overflow-hidden">
            <div className="flex items-center justify-end px-3 py-2 border-b border-white/10">
                <button
                    onClick={() => setShowSubstructure((v) => !v)}
                    className="h-8 rounded-xl px-3 text-xs bg-white/10 text-white hover:bg-white/20"
                    title="Toggle Gate vs Gate.Line.Color.Tone.Base"
                >
                    {showSubstructure ? "Gate only" : "Full substructure"}
                </button>
            </div>

            <div className="grid grid-cols-[260px_1fr_260px] min-h-[420px]">

                {/* Left: Design */}
                <div className="border-r border-white/10">
                    <div className="px-3 py-2 text-xs font-semibold tracking-wide text-white/80 bg-white/5">
                        Design
                    </div>
                    <div>
                        {order.map((p) => (
                            <Row
                                key={`d-${p}`}
                                planet={p}
                                text={formatActivation(design[p], showSubstructure)}
                            />
                        ))}

                    </div>
                </div>

                {/* Center: Bodygraph placeholder */}
                <div className="flex items-center justify-center p-6">
                    <div className="w-full h-full rounded-2xl border border-dashed border-white/15 flex items-center justify-center">
                        <div className="text-xs text-white/60 text-center leading-relaxed">
                            Bodygraph SVG placeholder
                            <br />
                            (we’ll mount + animate your SVG here later)
                        </div>
                    </div>
                </div>

                {/* Right: Personality */}
                <div className="border-l border-white/10">
                    <div className="px-3 py-2 text-xs font-semibold tracking-wide text-white/80 bg-white/5">
                        Personality
                    </div>
                    <div>
                        {order.map((p) => (
                            <Row
                                key={`p-${p}`}
                                planet={p}
                                text={formatActivation(personality[p], showSubstructure)}
                            />
                        ))}

                    </div>
                </div>
            </div>
        </div>
    );
}

// src/lib/mandala/rings/registry.ts

import type { RingModule, RingModuleDescriptor } from "./types";
import { trackForInstance } from "@/lib/mandala/rings/tracks";
import { makeCenterModule } from "@/lib/mandala/rings/modules/makeCenterModule";
import { makeChannelModule } from "@/lib/mandala/rings/modules/makeChannelModule";
import { makeGateModule } from "@/lib/mandala/rings/modules/makeGateModule";


const SacralRing = makeCenterModule({
    center: "Sacral",
    id: "center:sacral",
    label: "Sacral Activations",
});

const SolarPlexusRing = makeCenterModule({
    center: "SolarPlexus",
    id: "center:solarplexus",
    label: "Solar Plexus Activations",
});

const baseRegistry: Record<string, RingModule> = {
    [SacralRing.id]: SacralRing,
    [SolarPlexusRing.id]: SolarPlexusRing,
};


export function getRingModule(moduleId: string): RingModule | undefined {
    const hit = baseRegistry[moduleId];
    if (hit) return hit;

    if (moduleId.startsWith("channel:")) {
        const rest = moduleId.slice("channel:".length);
        const [aRaw, bRaw] = rest.split("-");
        const a = Number(aRaw);
        const b = Number(bRaw);
        if (Number.isFinite(a) && Number.isFinite(b)) return makeChannelModule({ a, b });
    }


    if (moduleId.startsWith("gate:")) {
        const rest = moduleId.slice("gate:".length);
        const g = Number(rest);
        if (Number.isFinite(g)) return makeGateModule({ gate: g });
    }


    return undefined;
}


// kept for palette iteration / debugging
export const ringRegistry = baseRegistry;

export const ringPalette: RingModuleDescriptor[] = [
    { id: "center:sacral", label: "Sacral Activations", kind: "center" },
    { id: "center:solarplexus", label: "Solar Plexus Activations", kind: "center" },
    { id: "channel:37-40", label: "Channel 37–40", kind: "channel" },
    { id: "gate:37", label: "Gate 37", kind: "gate" }

];




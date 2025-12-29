// src/lib/mandala/rings/expand.ts

import { CHANNELS, channelKey } from "@/lib/hd/channels";

// Minimal Sacral gate set (same seed list you're already using)
const SACRAL_GATES = new Set<number>([3, 5, 9, 14, 27, 29, 34, 42, 59]);

type ExpandResult = {
    add: string[]; // moduleIds to add
};

export function expandModule(moduleId: string): ExpandResult {
    // Center → Channels
    if (moduleId === "center:sacral") {
        const add: string[] = [];

        for (const [a, b] of CHANNELS) {
            if (SACRAL_GATES.has(a) || SACRAL_GATES.has(b)) {
                add.push(`channel:${channelKey(a, b)}`);
            }
        }

        return { add };
    }

    // Channel → Gates (next step, but we'll stub cleanly now)
    if (moduleId.startsWith("channel:")) {
        const rest = moduleId.slice("channel:".length);
        const [aRaw, bRaw] = rest.split("-");
        const a = Number(aRaw);
        const b = Number(bRaw);

        if (Number.isFinite(a) && Number.isFinite(b)) {
            return { add: [`gate:${a}`, `gate:${b}`] };
        }
    }

    return { add: [] };
}

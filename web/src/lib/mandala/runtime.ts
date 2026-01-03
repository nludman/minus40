// PATH: src/lib/mandala/runtime.ts
import type { SegmentsPayload } from "@/lib/mandala/constants";

export type MandalaRuntime = {
    svg: SVGSVGElement | null;

    transits: SegmentsPayload["transits"] | null;

    rangeStart: Date | null;
    rangeEnd: Date | null;

    timeView: "calendar" | "tracker";
    anchorMs: number | null;
    span: "year" | "quarter" | "month" | "week";

    allIds: string[];
    activeIds: string[];

    prevRadius: Map<string, number>;

    userGates: Set<number>;
    userDefinedChannelKeys: Set<string>;
};

export function createMandalaRuntime(): MandalaRuntime {
    return {
        svg: null,
        transits: null,
        rangeStart: null,
        rangeEnd: null,
        timeView: "calendar",
        anchorMs: null,
        span: "year",
        allIds: [],
        activeIds: [],
        prevRadius: new Map(),
        userGates: new Set(),
        userDefinedChannelKeys: new Set(),
    };
}

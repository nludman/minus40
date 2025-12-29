// src/lib/mandala/rings/types.ts

import type { RingLayoutKnobs } from "@/lib/mandala/ringLayout";

export type MandalaLayers = {
    underlays: SVGGElement;
    rings: SVGGElement;
    overlays: SVGGElement;
    labels: SVGGElement;
};

export type RingTimeRange = {
    startMs: number;
    endMs: number;
};

export type RingBuildContext = {
    svg: SVGSVGElement;
    layers: MandalaLayers;

    layout: RingLayoutKnobs;
    range: RingTimeRange;

    // NEW: current ring stack (for radius assignment, ordering, etc.)
    rings: RingInstance[];

    getRoot?: (inst: RingInstance) => SVGGElement;

    data?: unknown;
};



export type RingModuleKind = "center" | "channel" | "gate" | "custom";

export type RingModuleDescriptor = {
    id: string;     // stable module ID, used in registry + DOM group ids
    label: string;  // shown in UI
    kind: RingModuleKind;
};

export type RingInstance = {
    instanceId: string;
    moduleId: string;
    label?: string;

    // NEW: hierarchy
    parentInstanceId?: string | null;
};


export type RingClick =
    | { type: "ring"; instanceId: string; moduleId: string }
    | { type: "segment"; instanceId: string; moduleId: string; payload: unknown };

export type RingModule = RingModuleDescriptor & {
    /**
     * Ensure any defs / groups exist (called before build).
     * Must only create inside your own root <g>.
     */
    ensure?: (ctx: RingBuildContext, inst: RingInstance) => void;

    /**
     * Build/update your visuals. Must be idempotent.
     */
    build: (ctx: RingBuildContext, inst: RingInstance) => void;

    /**
     * Cleanup only your subtree.
     */
    destroy?: (ctx: RingBuildContext, inst: RingInstance) => void;

    /**
     * Optional: allow module to interpret click targets.
     * (We’ll wire this later.)
     */
    onClick?: (ctx: RingBuildContext, inst: RingInstance, e: MouseEvent) => RingClick | null;
};

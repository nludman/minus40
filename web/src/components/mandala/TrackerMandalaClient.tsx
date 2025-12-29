// src/components/mandala/TrackerMandalaClient.tsx

"use client";

import { useEffect } from "react";
import { getRingModule } from "@/lib/mandala/rings/registry";
import type { RingInstance, RingBuildContext, MandalaLayers } from "@/lib/mandala/rings/types";
import type { RingLayoutKnobs } from "@/lib/mandala/ringLayout";


function getLayers(svg: SVGSVGElement): MandalaLayers | null {
    const underlays = svg.querySelector("#Layer-Underlays");
    const rings = svg.querySelector("#Layer-Rings");
    const overlays = svg.querySelector("#Layer-Overlays");
    const labels = svg.querySelector("#Layer-Labels");

    if (
        !(underlays instanceof SVGGElement) ||
        !(rings instanceof SVGGElement) ||
        !(overlays instanceof SVGGElement) ||
        !(labels instanceof SVGGElement)
    ) {
        return null;
    }

    return { underlays, rings, overlays, labels };
}

function ensureInstanceRoot(layers: MandalaLayers, inst: RingInstance): SVGGElement {
    const rootId = `RingInst__${inst.instanceId.replaceAll(":", "_").replaceAll(".", "_")}`;

    const found: Element | null = layers.rings.querySelector(`#${CSS.escape(rootId)}`);

    let g: SVGGElement;
    if (found instanceof SVGGElement) {
        g = found;
    } else {
        g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("id", rootId);
        g.setAttribute("data-ring-instance", inst.instanceId);
        g.setAttribute("data-ring-module", inst.moduleId);
        layers.rings.appendChild(g);
    }

    return g;
}


type Props = {
    rings: RingInstance[];
    year: number;
    ringLayout: RingLayoutKnobs;

    focusInstanceId?: string | null;
    maxVisible?: number; // e.g. 12
    fadeCount?: number;  // e.g. 4

    onRingClick?: (e: { instanceId: string; moduleId: string }) => void;
};



export default function TrackerMandalaClient({
    rings,
    year,
    ringLayout,
    focusInstanceId,
    maxVisible = 12,
    fadeCount = 4,
    onRingClick,
}: Props) {
    useEffect(() => {
        let cancelled = false;

        // Keep these in the effect scope so cleanup can see them
        let svgEl: SVGSVGElement | null = null;

        const onClick = (ev: MouseEvent) => {
            const target = ev.target as Element | null;
            if (!target) return;

            const g = target.closest("[data-ring-instance]");
            if (!(g instanceof SVGGElement)) return;

            const instanceId = g.getAttribute("data-ring-instance");
            const moduleId = g.getAttribute("data-ring-module");
            if (!instanceId || !moduleId) return;

            ev.stopPropagation();

            onRingClick?.({ instanceId, moduleId });
        };

        async function run() {
            const svg = document.querySelector("#TrackerMandalaSvg");
            if (!(svg instanceof SVGSVGElement)) return;
            svgEl = svg;

            const layers = getLayers(svg);
            if (!layers) return;

            const startMs = Date.UTC(year, 0, 1, 0, 0, 0, 0);
            const endMs = Date.UTC(year + 1, 0, 1, 0, 0, 0, 0);

            // ✅ Fetch yearly segments payload
            let payload: unknown = null;
            try {
                const res = await fetch(
                    `/api/segments-year?year=${year}&view=calendar&span=year`,
                    { cache: "no-store" }
                );
                if (!res.ok) throw new Error(`segments-year fetch failed: ${res.status}`);
                payload = await res.json();
            } catch {
                payload = null;
            }

            if (cancelled) return;

            const ctx: RingBuildContext = {
                svg,
                layers,
                layout: ringLayout,
                range: { startMs, endMs },
                rings,
                getRoot: (inst) => ensureInstanceRoot(layers, inst),
                data: payload,
            };

            // ---- Focus / window / fade logic ----
            const focusIdx = (() => {
                if (!focusInstanceId) return rings.length ? Math.floor(rings.length / 2) : 0;
                const i = rings.findIndex((r) => r.instanceId === focusInstanceId);
                return i >= 0 ? i : 0;
            })();

            const half = Math.floor(maxVisible / 2);
            let winStart = Math.max(0, focusIdx - half);
            let winEnd = Math.min(rings.length - 1, winStart + maxVisible - 1);
            winStart = Math.max(0, winEnd - maxVisible + 1);

            const visibleSet = new Set<string>();
            const styleById = new Map<string, { opacity: number; strokeMul: number; isRelevant: boolean }>();

            // Build "relevance": focus ring + ancestors + descendants (same tree)
            const parentById = new Map(rings.map((r) => [r.instanceId, r.parentInstanceId ?? null]));
            const childrenById = new Map<string, string[]>();
            for (const r of rings) {
                const p = r.parentInstanceId;
                if (p) {
                    const arr = childrenById.get(p) ?? [];
                    arr.push(r.instanceId);
                    childrenById.set(p, arr);
                }
            }

            const relevant = new Set<string>();
            if (focusInstanceId) {
                // ancestors
                let cur: string | null = focusInstanceId;
                while (cur) {
                    relevant.add(cur);
                    cur = parentById.get(cur) ?? null;
                }
                // descendants
                const stack = [focusInstanceId];
                while (stack.length) {
                    const x = stack.pop()!;
                    relevant.add(x);
                    const kids = childrenById.get(x) ?? [];
                    for (const k of kids) stack.push(k);
                }
            } else {
                for (const r of rings) relevant.add(r.instanceId);
            }

            for (let i = winStart; i <= winEnd; i++) {
                const r = rings[i];
                const dist = Math.abs(i - focusIdx);

                // hard cull beyond fadeCount
                if (dist > fadeCount) continue;

                const isRelevant = relevant.has(r.instanceId);

                // Gradient fade: 0..fadeCount
                const t = dist / Math.max(1, fadeCount);
                const baseOpacity = 1 - t * 0.75; // 1.0 -> 0.25
                const baseStrokeMul = dist === 0 ? 1.25 : 1 - t * 0.4; // focus thicker

                const opacity = isRelevant ? baseOpacity : baseOpacity * 0.35;
                const strokeMul = isRelevant ? baseStrokeMul : baseStrokeMul * 0.7;

                visibleSet.add(r.instanceId);
                styleById.set(r.instanceId, { opacity, strokeMul, isRelevant });
            }


            // remove any instance roots that no longer exist in state
            const live = new Set(rings.map((r) => r.instanceId));
            Array.from(layers.rings.querySelectorAll("[data-ring-instance]")).forEach((node) => {
                if (!(node instanceof SVGGElement)) return;
                const id = node.getAttribute("data-ring-instance");
                if (id && !live.has(id)) node.remove();
            });

            // build visible rings only (focused window)
            for (const inst of rings) {
                if (!visibleSet.has(inst.instanceId)) {
                    // remove DOM if it exists
                    const root = layers.rings.querySelector(
                        `[data-ring-instance="${CSS.escape(inst.instanceId)}"]`
                    );
                    if (root instanceof SVGGElement) root.remove();
                    continue;
                }

                const mod = getRingModule(inst.moduleId);
                if (!mod) continue;

                const root = ensureInstanceRoot(layers, inst);

                const style = styleById.get(inst.instanceId);
                root.style.opacity = String(style?.opacity ?? 1);
                root.dataset.strokeMul = String(style?.strokeMul ?? 1);

                mod.ensure?.(ctx, inst);
                mod.build(ctx, inst);
            }


            // attach click handler once per effect run
            svg.addEventListener("click", onClick);
        }

        run();

        return () => {
            cancelled = true;
            if (svgEl) svgEl.removeEventListener("click", onClick);
        };
    }, [rings, year, ringLayout, focusInstanceId, maxVisible, fadeCount, onRingClick]);



    return null;
}

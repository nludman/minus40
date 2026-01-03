// src/lib/mandala/domInteractions.ts

import { HoverInfo } from "./constants";


export function wireYearLabelNav(
    svg: SVGSVGElement,
    onClick?: () => void
) {
    const el = svg.querySelector("#YearLabel") as SVGGElement | null;
    if (!el) return () => { };

    el.style.cursor = "pointer";
    el.style.pointerEvents = "all";

    const onEnter = () => el.classList.add("is-hovered");
    const onLeave = () => el.classList.remove("is-hovered");
    const onTap = (e: Event) => {
        e.stopPropagation();
        onClick?.();
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onTap);

    return () => {
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
        el.removeEventListener("click", onTap);
    };
}


export function applySelectedClass(svg: SVGSVGElement, selected: HoverInfo | null) {
    svg.querySelectorAll(".seg-wrap.is-selected").forEach((el) => el.classList.remove("is-selected"));
    if (!selected) return;

    const { key } = selected;
    const selector = `.seg-wrap[data-seg-key="${key}"]`;
    const el = svg.querySelector(selector);


    if (el) el.classList.add("is-selected");
}
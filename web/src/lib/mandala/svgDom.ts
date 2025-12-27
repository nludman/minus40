// src/lib/mandala/svgDom.ts

export function ensureLabelLayer(svg: SVGSVGElement): SVGGElement {
  // Prefer the canonical layer if present
  const canonical = svg.querySelector("#Layer-Labels");
  if (canonical instanceof SVGGElement) return canonical;

  // Fallback legacy id (if you still have it)
  const legacy = svg.querySelector("#GateLabels");
  if (legacy instanceof SVGGElement) return legacy;

  // Create fallback group
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("id", "GateLabels");
  svg.appendChild(g);
  return g;
}

export function ensureTodayLayer(svg: SVGSVGElement) {
  const NS = "http://www.w3.org/2000/svg";
  let g = svg.querySelector("#TodayMarker") as SVGGElement | null;
  if (!g) {
    g = document.createElementNS(NS, "g");
    g.setAttribute("id", "TodayMarker");
    // put it on top of rings; if you want it behind, use insertBefore like calendar overlay
    svg.appendChild(g);
  }
  return g;
}


export function createGateLabel(textContent: string) {
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("fill", "white");
  t.setAttribute("font-size", "12");
  t.setAttribute(
    "font-family",
    "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
  );
  t.setAttribute("font-weight", "700");
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("dominant-baseline", "central");
  (t as any).style.pointerEvents = "none";
  t.textContent = textContent;
  return t;
}

export function makeCircleLike(base: SVGCircleElement) {
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", base.getAttribute("cx") || "0");
  c.setAttribute("cy", base.getAttribute("cy") || "0");
  c.setAttribute("r", base.getAttribute("r") || "0");
  c.setAttribute("fill", "none");
  c.setAttribute("stroke-width", base.getAttribute("stroke-width") || "20");
  c.setAttribute("vector-effect", "non-scaling-stroke");
  return c;
}

export function ensureBaseCircle(svg: SVGSVGElement, id: string, cx: number, cy: number) {
  const existing = svg.querySelector(`#${id}`);
  if (existing instanceof SVGCircleElement) {
    existing.setAttribute("pointer-events", "none");
    return existing;
  }

  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("id", id);
  c.setAttribute("cx", String(cx));
  c.setAttribute("cy", String(cy));
  c.setAttribute("fill", "none");

  // 🔑 base circles are geometry guides only — never intercept hover/click
  c.setAttribute("pointer-events", "none");

  svg.appendChild(c);
  return c;
}


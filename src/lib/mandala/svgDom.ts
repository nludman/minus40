// src/lib/mandala/svgDom.ts
export function ensureLabelLayer(svg: SVGSVGElement) {
  let g = svg.querySelector("#GateLabels") as SVGGElement | null;
  if (g) return g;

  g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("id", "GateLabels");
  svg.appendChild(g); // on top
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
  if (existing instanceof SVGCircleElement) return existing;

  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("id", id);
  c.setAttribute("cx", String(cx));
  c.setAttribute("cy", String(cy));
  c.setAttribute("fill", "none");
  svg.appendChild(c);
  return c;
}

// src/lib/mandala/styles.ts
export function injectArcStyles() {
  if (document.getElementById("mandala-arc-styles")) return;

  const style = document.createElement("style");
  style.id = "mandala-arc-styles";
  style.textContent = `
    .seg-wrap { cursor: pointer; }

    /* Color layer reveals on hover */
    .seg-wrap .seg-color { opacity: 0; transition: opacity 180ms ease; }
    .seg-wrap:hover .seg-color { opacity: 1; }

    /* Base fades back slightly on hover so color reads */
    .seg-wrap .seg-base { opacity: 0.92; transition: opacity 180ms ease; }
    .seg-wrap:hover .seg-base { opacity: 0.25; }

    /* Outline is its own programmable semantic channel */
    .seg-wrap .seg-outline { opacity: 0.24; transition: opacity 180ms ease, stroke 180ms ease; }
    .seg-wrap:hover .seg-outline { opacity: 0.5; }
  `;
  document.head.appendChild(style);
}

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

  /* Outline */
  .seg-wrap .seg-outline { opacity: 0.24; transition: opacity 180ms ease, stroke 180ms ease; }
  .seg-wrap:hover .seg-outline { opacity: 0.5; }

  /* selected = sticky highlight */
  .seg-wrap.is-selected .seg-color { opacity: 1; }
  .seg-wrap.is-selected .seg-base { opacity: 0.15; }
  .seg-wrap.is-selected .seg-outline { opacity: 0.7; }

  /* ============================
     Month wheel label hover
     ============================ */
  .month-label {
    transition: transform 140ms ease, opacity 140ms ease;
    transform-box: fill-box;
    transform-origin: center;
  }

  .month-label.is-hovered {
    transform: scale(1.12);
    opacity: 0.95;
  }

  /* Active month ignores hover scaling (belt + suspenders) */
  .month-label[data-active="1"].is-hovered {
    transform: none;
    opacity: 1;
  }

  /* ============================
     Center Year label hover
     ============================ */
  #YearLabel {
    transition: transform 160ms ease, opacity 160ms ease;
    transform-box: fill-box;
    transform-origin: center;
  }

  #YearLabel.is-hovered {
    transform: scale(1.08);
    opacity: 0.95;
  }
`;

  document.head.appendChild(style);
}

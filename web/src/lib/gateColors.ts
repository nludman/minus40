/**
 * Gate → color mapping
 * Centralized visual language for mandala rendering
 *
 * For now: purely aesthetic (diverse + pleasing), no symbolic system yet.
 * Uses a "golden-angle" hue spread so adjacent gate numbers don't cluster in color.
 */

function hslToHex(h: number, s: number, l: number): string {
  // h: 0..360, s/l: 0..100
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));

  let r = 0, g = 0, b = 0;
  if (0 <= hh && hh < 1) [r, g, b] = [c, x, 0];
  else if (1 <= hh && hh < 2) [r, g, b] = [x, c, 0];
  else if (2 <= hh && hh < 3) [r, g, b] = [0, c, x];
  else if (3 <= hh && hh < 4) [r, g, b] = [0, x, c];
  else if (4 <= hh && hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const m = l - c / 2;
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Golden angle (approx) to distribute hues nicely
const GOLDEN_ANGLE = 137.508;

export const gateColors: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  for (let gate = 1; gate <= 64; gate++) {
    // Hue spread + slight lightness variation so the palette feels "alive"
    const hue = (gate * GOLDEN_ANGLE) % 360;
    const sat = 72;
    const light = 52 + ((gate % 4) - 1.5) * 4; // 46..58-ish
    map[gate] = hslToHex(hue, sat, light);
  }
  return map;
})();

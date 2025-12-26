export default function MandalaSvg() {
  return (
    <svg
      id="MandalaSvg"
      width="1200"
      height="1200"
      viewBox="-120 -120 1440 1440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      style={{ width: 800, height: 800 }}
    >
      {/* Static authored geometry (guide circles, etc.) */}
      <g id="MandalaCoded">
        <circle id="Pluto" cx="600" cy="600" r="440" strokeWidth="20" />
        <circle id="Neptune" cx="600" cy="600" r="407.5" strokeWidth="20" />
        <circle id="Uranus" cx="600" cy="600" r="375" strokeWidth="20" />
        <circle id="Saturn" cx="600" cy="600" r="342.5" strokeWidth="20" />
      </g>

      {/* Dynamic layers: modules render into these only */}
      <g id="Layer-Underlays" />
      <g id="Layer-Rings" />
      <g id="Layer-Overlays" />
      <g id="Layer-Labels" />

      {/* Static label (can stay static for now) */}
      <text
        id="YearLabel"
        fill="white"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
        fontSize="96"
        fontWeight={700}
        letterSpacing="0.18em"
        textAnchor="middle"
      >
        <tspan x="600" y="620">2026</tspan>
      </text>
    </svg>
  );
}

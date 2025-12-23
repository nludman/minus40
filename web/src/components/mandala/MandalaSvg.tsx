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
      <g id="MandalaCoded">

        <circle id="Pluto" cx="600" cy="600" r="440" strokeWidth="20" />
        <circle id="Neptune" cx="600" cy="600" r="407.5" strokeWidth="20" />
        <circle id="Uranus" cx="600" cy="600" r="375" strokeWidth="20" />
        <circle id="Saturn" cx="600" cy="600" r="342.5" strokeWidth="20" />

        {/* DEBUG: true seam lines */}
        <line
          id="SeamLine12"
          x1="600"
          y1="600"
          x2="600"
          y2="40"
          stroke="rgba(0,255,255,0.9)"
          strokeWidth="2"
        />

        <line
          id="SeamLine3"
          x1="600"
          y1="600"
          x2="1160"
          y2="600"
          stroke="rgba(255,0,255,0.9)"
          strokeWidth="2"
        />

      </g>

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

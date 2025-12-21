export default function MandalaSvg() {
  return (
    <svg
      id="MandalaSvg"
      width="1200"
      height="1200"
      viewBox="0 0 1200 1200"
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

        <line
          id="StartLine"
          x1="598.5"
          y1="524.993"
          x2="599.51"
          y2="99.994"
          stroke="white"
          strokeWidth="5"
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

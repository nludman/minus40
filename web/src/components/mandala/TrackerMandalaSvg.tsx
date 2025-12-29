// src/components/mandala/TrackerMandalaSvg.tsx

export default function TrackerMandalaSvg() {
    return (
        <svg
            id="TrackerMandalaSvg"
            width="1200"
            height="1200"
            viewBox="-120 -120 1440 1440"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 800, height: 800 }}
        >
            {/* Optional static authored geometry (can be empty for now) */}
            <g id="MandalaCoded">
                <circle cx="600" cy="600" r="440" stroke="rgba(255,255,255,0.06)" strokeWidth="20" />
                <circle cx="600" cy="600" r="407.5" stroke="rgba(255,255,255,0.04)" strokeWidth="20" />
                <circle cx="600" cy="600" r="375" stroke="rgba(255,255,255,0.03)" strokeWidth="20" />
                <circle cx="600" cy="600" r="342.5" stroke="rgba(255,255,255,0.02)" strokeWidth="20" />
            </g>

            {/* Dynamic layers: modules render into these only */}
            <g id="Layer-Underlays" />
            <g id="Layer-Rings" />
            <g id="Layer-Overlays" />
            <g id="Layer-Labels" />
        </svg>
    );
}

"use client";

type Props = {
  year: number;
  setYear: (y: number) => void;
  visiblePlanets: Record<string, boolean>;
  togglePlanet: (planet: string) => void;
  hoverInfo?: { planet: string; gate: number } | null;
};

const PLANETS = ["Pluto", "Neptune", "Uranus", "Saturn"];

export default function ControlPanel({
  year,
  setYear,
  visiblePlanets,
  togglePlanet,
  hoverInfo,
}: Props) {
  return (
    <div className="fixed left-4 top-4 z-50 w-[260px] rounded-2xl bg-black/60 p-4 text-white backdrop-blur border border-white/10">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide">Mandala Controls</div>
        <div className="text-xs opacity-70">v0</div>
      </div>

      <div className="mt-4">
        <label className="text-xs opacity-70">Year</label>
        <div className="mt-2 flex items-center gap-2">
          <button
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setYear(year - 1)}
          >
            −
          </button>
          <input
            className="h-9 w-full rounded-xl bg-white/10 px-3 text-center text-sm outline-none"
            value={year}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setYear(v);
            }}
          />
          <button
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setYear(year + 1)}
          >
            +
          </button>
        </div>
        <div className="mt-1 text-[11px] opacity-60">
          Tip: type a year, or use +/-.
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs opacity-70">Planets</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PLANETS.map((p) => {
            const on = visiblePlanets[p] !== false;
            return (
              <button
                key={p}
                onClick={() => togglePlanet(p)}
                className={[
                  "h-9 rounded-xl text-sm",
                  on ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
                ].join(" ")}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white/5 p-3">
        <div className="text-xs opacity-70">Hover</div>
        <div className="mt-1 text-sm">
          {hoverInfo ? (
            <span>
              {hoverInfo.planet} — Gate <b>{hoverInfo.gate}</b>
            </span>
          ) : (
            <span className="opacity-60">Hover a segment</span>
          )}
        </div>
      </div>
    </div>
  );
}

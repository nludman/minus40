"use client";

import { BODY_ORDER, type HoverInfo } from "@/lib/mandala/constants";


type Props = {
  year: number;
  setYear: (y: number) => void;
  visiblePlanets: Record<string, boolean>;
  togglePlanet: (planet: string) => void;
  toggleGroup: (group: "Inner" | "Outer") => void;
  hoverInfo?: HoverInfo;
  arcCap: "round" | "butt";
  setArcCap: (cap: "round" | "butt") => void;
  ringLayout: import("@/lib/mandala/ringLayout").RingLayoutKnobs;
  setRingLayout: (k: import("@/lib/mandala/ringLayout").RingLayoutKnobs) => void;
  showCalendar: boolean;
  setShowCalendar: (v: boolean) => void;

};


export default function ControlPanel({
  year,
  setYear,
  visiblePlanets,
  togglePlanet,
  toggleGroup,
  hoverInfo,
  arcCap,
  setArcCap,
  ringLayout,
  setRingLayout,
  showCalendar,
  setShowCalendar,

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
          <button
            onClick={() => toggleGroup("Inner")}
            className="h-9 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
            title="Toggle Mercury, Venus, Mars"
          >
            Inner
          </button>

          <button
            onClick={() => toggleGroup("Outer")}
            className="h-9 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
            title="Toggle Jupiter, Saturn, Uranus, Neptune, Pluto"
          >
            Outer
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {BODY_ORDER.map((p) => {
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
                {p === "NorthNode" ? "North Node" : p === "SouthNode" ? "South Node" : p}
              </button>
            );
          })}

        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs opacity-70">Segment caps</div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setArcCap("butt")}
            className={[
              "h-9 rounded-xl text-sm",
              arcCap === "butt" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
            ].join(" ")}
          >
            Butt
          </button>

          <button
            onClick={() => setArcCap("round")}
            className={[
              "h-9 rounded-xl text-sm",
              arcCap === "round" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
            ].join(" ")}
          >
            Round
          </button>
        </div>
      </div>

      <div className="mt-2">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className={[
            "h-9 w-full rounded-xl text-sm",
            showCalendar ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
          ].join(" ")}
        >
          {showCalendar ? "Calendar overlay: On" : "Calendar overlay: Off"}
        </button>
      </div>


      <div className="mt-4 rounded-xl bg-white/5 p-3">
        <div className="text-xs opacity-70">Layout Lab</div>

        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span>Center radius</span>
              <span>{Math.round(ringLayout.centerR ?? 391.25)}</span>
            </div>
            <input
              type="range"
              min={280}
              max={460}
              value={ringLayout.centerR ?? 391.25}
              onChange={(e) =>
                setRingLayout({ ...ringLayout, centerR: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span>Band</span>
              <span>{Math.round(ringLayout.band ?? 120)}</span>
            </div>
            <input
              type="range"
              min={60}
              max={260}
              value={ringLayout.band ?? 120}
              onChange={(e) =>
                setRingLayout({ ...ringLayout, band: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span>Gap ratio</span>
              <span>{(ringLayout.gapRatio ?? 0.35).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.8}
              step={0.01}
              value={ringLayout.gapRatio ?? 0.35}
              onChange={(e) =>
                setRingLayout({ ...ringLayout, gapRatio: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>
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

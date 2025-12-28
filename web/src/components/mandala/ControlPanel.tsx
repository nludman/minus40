"use client";

import { BODY_ORDER } from "@/lib/mandala/constants";
import { useState } from "react";



type Props = {
  year: number;
  setYear: (y: number) => void;
  visiblePlanets: Record<string, boolean>;
  togglePlanet: (planet: string) => void;
  toggleGroup: (group: "Inner" | "Outer") => void;
  arcCap: "round" | "butt";
  setArcCap: (cap: "round" | "butt") => void;
  ringLayout: import("@/lib/mandala/ringLayout").RingLayoutKnobs;
  setRingLayout: (k: import("@/lib/mandala/ringLayout").RingLayoutKnobs) => void;
  showCalendar: boolean;
  setShowCalendar: (v: boolean) => void;
  resetYearCache?: () => void;
  resetUserCache?: () => void;
  gapPxRound: number;
  setGapPxRound: (v: number) => void;
  gapPxButt: number;
  setGapPxButt: (v: number) => void;
  variant?: "floating" | "embedded";


};


export default function ControlPanel({
  year,
  setYear,
  resetYearCache,
  resetUserCache,
  visiblePlanets,
  togglePlanet,
  toggleGroup,
  arcCap,
  setArcCap,
  ringLayout,
  setRingLayout,
  showCalendar,
  setShowCalendar,
  gapPxRound,
  setGapPxRound,
  gapPxButt,
  setGapPxButt,
  variant = "floating",


}: Props) {

  const [panelOpen, setPanelOpen] = useState(true);
  const [openYear, setOpenYear] = useState(true);
  const [openPlanets, setOpenPlanets] = useState(true);
  const [openCaps, setOpenCaps] = useState(true);
  const [openCalendar, setOpenCalendar] = useState(true);
  const [openLayout, setOpenLayout] = useState(false);
  const [openHover, setOpenHover] = useState(true);
  const [openGaps, setOpenGaps] = useState(true); // for the new gap sliders block
  const [layoutLabOpen, setLayoutLabOpen] = useState(true);



  const isEmbedded = variant === "embedded";

  return (
    <div
      className={[
        isEmbedded
          ? "w-full rounded-2xl bg-black/60 p-4 text-white backdrop-blur border border-white/10"
          : [
            "fixed top-4 z-50 w-[260px] rounded-2xl bg-black/60 p-4 text-white backdrop-blur border border-white/10 transition-transform duration-200",
            panelOpen ? "left-4 translate-x-0" : "left-0 -translate-x-[230px]",
          ].join(" "),
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide">Mandala Controls</div>
        {!isEmbedded ? (
          <button
            className="text-xs opacity-80 hover:opacity-100 rounded-lg bg-white/10 px-2 py-1"
            onClick={() => setPanelOpen((v) => !v)}
            title="Collapse panel"
          >
            {panelOpen ? "Hide" : "Show"}
          </button>
        ) : null}


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
        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            onClick={() => resetYearCache?.()}
            className="h-9 w-full rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
            title="Forces the server to recompute the year segments and overwrite disk cache"
          >
            Reset year cache
          </button>
        </div>

      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs opacity-70">Planets</div>
          <button
            className="text-[11px] opacity-70 hover:opacity-100"
            onClick={() => setOpenPlanets((v) => !v)}
            type="button"
          >
            {openPlanets ? "Hide" : "Show"}
          </button>
        </div>

        {openPlanets && (
          <div className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleGroup("Inner")}
                className="h-9 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
                title="Toggle Mercury, Venus, Mars"
                type="button"
              >
                Inner
              </button>

              <button
                onClick={() => toggleGroup("Outer")}
                className="h-9 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
                title="Toggle Jupiter, Saturn, Uranus, Neptune, Pluto"
                type="button"
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
                    type="button"
                  >
                    {p === "NorthNode" ? "North Node" : p === "SouthNode" ? "South Node" : p}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/70">Layout Lab</div>
          <button
            className="text-[11px] text-white/60 hover:text-white/80 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1"
            onClick={() => setLayoutLabOpen((v) => !v)}
            title={layoutLabOpen ? "Hide Layout Lab" : "Show Layout Lab"}
          >
            {layoutLabOpen ? "Hide" : "Show"}
          </button>
        </div>

        {layoutLabOpen ? (
          <>
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
              <div className="mt-4 rounded-xl bg-white/5 p-3">
                <div className="text-xs opacity-70">Segment gaps</div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] opacity-70">
                      <span>Round gap (px/edge)</span>
                      <span>{gapPxRound.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={0.05}
                      value={gapPxRound}
                      onChange={(e) => setGapPxRound(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] opacity-70">
                      <span>Butt gap (px/edge)</span>
                      <span>{gapPxButt.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={gapPxButt}
                      onChange={(e) => setGapPxButt(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

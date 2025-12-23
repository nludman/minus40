"use client";

import { useMemo, useState } from "react";
import { MandalaClient, ControlPanel, MandalaSvg, RightSidebar } from "@/components/mandala";
import { useEffect } from "react";
import UserChartPanel from "@/components/mandala/UserChartPanel";
import { clearUserChart, loadUserChart, saveUserChart, type UserChartPayload } from "@/lib/userChartCache";


export default function Home() {

  const [arcCap, setArcCap] = useState<"round" | "butt">("butt");
  const [showCalendar, setShowCalendar] = useState(true);
  const [year, setYear] = useState(2026);
  const [visiblePlanets, setVisiblePlanets] = useState<Record<string, boolean>>({
    Moon: true,
    Sun: true,
    Earth: true,
    Mercury: true,
    Venus: true,
    Mars: true,
    Jupiter: true,
    Saturn: true,
    Uranus: true,
    Neptune: true,
    Pluto: true,
    NorthNode: true,
    SouthNode: true,
  });

  const [yearReloadKey, setYearReloadKey] = useState(0);
  const [yearReloadMode, setYearReloadMode] = useState<"normal" | "reset">("normal");

  const [userReloadKey, setUserReloadKey] = useState(0);
  const [userChart, setUserChart] = useState<UserChartPayload | null>(null);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(true);

  useEffect(() => {
    setUserChart(loadUserChart());
  }, [userReloadKey]);


  useEffect(() => {
    // client-only (localStorage)
    setUserChart(loadUserChart());
  }, [userReloadKey]);


  const [ringLayout, setRingLayout] = useState<import("@/lib/mandala/ringLayout").RingLayoutKnobs>({
    centerR: 391.25,
    band: 120,
    gapRatio: 0.35,
    strokeMin: 14,
    strokeMax: 44,
  });


  const [hoverInfo, setHoverInfo] = useState<import("@/lib/mandala/constants").HoverInfo>(null);
  const [selectedInfo, setSelectedInfo] = useState<import("@/lib/mandala/constants").HoverInfo>(null);

  const INNER_PLANETS = ["Mercury", "Venus", "Mars"] as const;
  const OUTER_PLANETS = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] as const;

  type PlanetId = keyof typeof visiblePlanets;

  const toggleGroup = (group: "Inner" | "Outer") => {
    const ids = group === "Inner" ? INNER_PLANETS : OUTER_PLANETS;

    setVisiblePlanets((prev) => {
      // If ALL are currently ON, turn them OFF. Otherwise turn them ON.
      const allOn = ids.every((p) => prev[p] !== false);
      const nextOn = !allOn;

      const next = { ...prev };
      for (const p of ids) next[p] = nextOn;
      return next;
    });
  };

  const togglePlanet = (planet: string) => {
    setVisiblePlanets((prev) => ({ ...prev, [planet]: !(prev[planet] !== false) }));
  };

  const visiblePlanetsStable = useMemo(() => visiblePlanets, [visiblePlanets]);

  const resetYearCache = () => {
    setYearReloadMode("reset");
    setYearReloadKey((k) => k + 1);
  };

  const onUserChartUploaded = (payload: UserChartPayload) => {
    saveUserChart(payload);
    setUserChart(payload);
    setUserReloadKey((k) => k + 1);
  };

  const resetUserCache = () => {
    try {
      clearUserChart();
    } catch { }
    setUserReloadKey((k) => k + 1);
    setUserChart(null);
  };


  useEffect(() => {
    const svg = document.querySelector("#MandalaSvg");
    if (!(svg instanceof SVGSVGElement)) return;

    const onBgClick = () => setSelectedInfo(null);
    svg.addEventListener("click", onBgClick);

    return () => svg.removeEventListener("click", onBgClick);
  }, []);

  return (
    <main className="min-h-screen grid place-items-center bg-zinc-950">
      <MandalaSvg />
      <MandalaClient
        year={year}
        yearReloadKey={yearReloadKey}
        yearReloadMode={yearReloadMode}
        onYearReloadConsumed={() => setYearReloadMode("normal")}
        userReloadKey={userReloadKey}
        visiblePlanets={visiblePlanetsStable}
        ringLayout={ringLayout}
        onHover={setHoverInfo}
        onSelect={setSelectedInfo}
        selected={selectedInfo}
        arcCap={arcCap}
        showCalendar={showCalendar}
      />

      <ControlPanel
        year={year}
        setYear={setYear}
        resetYearCache={resetYearCache}
        resetUserCache={resetUserCache}
        visiblePlanets={visiblePlanetsStable}
        togglePlanet={togglePlanet}
        toggleGroup={toggleGroup}
        hoverInfo={hoverInfo}
        arcCap={arcCap}
        setArcCap={setArcCap}
        ringLayout={ringLayout}
        setRingLayout={setRingLayout}
        showCalendar={showCalendar}
        setShowCalendar={setShowCalendar}

      />

      <RightSidebar
        hovered={hoverInfo}
        selected={selectedInfo}
        clearSelected={() => setSelectedInfo(null)}
      />

      <UserChartPanel
        userChart={userChart}
        onUserChartUploaded={onUserChartUploaded}
        onResetUserCache={resetUserCache}
        isOpen={isUserPanelOpen}
        onToggleOpen={() => setIsUserPanelOpen((v) => !v)}
      />

    </main>
  );
}

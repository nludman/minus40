"use client";

import { useMemo, useState } from "react";
import { MandalaClient, ControlPanel, MandalaSvg } from "@/components/mandala";


export default function Home() {
  const [year, setYear] = useState(2026);
  const [visiblePlanets, setVisiblePlanets] = useState<Record<string, boolean>>({
    Pluto: true,
    Neptune: true,
    Uranus: true,
    Saturn: true,
  });
  const [hoverInfo, setHoverInfo] = useState<{ planet: string; gate: number } | null>(null);

  const togglePlanet = (planet: string) => {
    setVisiblePlanets((prev) => ({ ...prev, [planet]: !(prev[planet] !== false) }));
  };

  // keep object identity stable (helps effect dependencies)
  const visiblePlanetsStable = useMemo(() => visiblePlanets, [visiblePlanets]);

  return (
    <main className="min-h-screen grid place-items-center bg-zinc-950">
      <MandalaSvg />
      <MandalaClient
        year={year}
        visiblePlanets={visiblePlanetsStable}
        onHover={setHoverInfo}
      />
      <ControlPanel
        year={year}
        setYear={setYear}
        visiblePlanets={visiblePlanetsStable}
        togglePlanet={togglePlanet}
        hoverInfo={hoverInfo}
      />
    </main>
  );
}

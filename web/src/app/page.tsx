"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MandalaClient, ControlPanel, MandalaSvg, RightSidebar } from "@/components/mandala";
import UserChartPanel from "@/components/mandala/UserChartPanel";
import UserChartVisual from "@/components/mandala/UserChartVisual";

import { clearUserChart, loadUserChart, saveUserChart, type UserChartPayload } from "@/lib/userChartCache";
import type { HoverInfo } from "@/lib/mandala/constants";

export default function Home() {
  // =========================
  // URL navigation state
  // =========================
  type NavState = {
    view: "calendar" | "tracker";
    span: "year" | "quarter" | "month" | "week";
    m?: number; // 0..11 for month view
  };

  const router = useRouter();
  const searchParams = useSearchParams();

  const navFromUrl = useMemo<NavState>(() => {
    const viewRaw = searchParams.get("view");
    const spanRaw = searchParams.get("span");
    const mRaw = searchParams.get("m");

    const view: NavState["view"] = viewRaw === "tracker" ? "tracker" : "calendar";
    const span: NavState["span"] =
      spanRaw === "quarter" || spanRaw === "month" || spanRaw === "week" ? spanRaw : "year";

    const mNum = mRaw != null ? Number(mRaw) : undefined;

    return {
      view,
      span,
      m: Number.isFinite(mNum) ? mNum : undefined,
    };
  }, [searchParams]);

  const yearFromUrl = useMemo(() => {
    const y = Number(searchParams.get("y"));
    // default: current year if URL missing/invalid
    return Number.isFinite(y) ? y : new Date().getFullYear();
  }, [searchParams]);

  const [year, setYear] = useState(yearFromUrl);
  const [nav, setNav] = useState<NavState>(navFromUrl);

  // keep local state in sync with back/forward navigation
  useEffect(() => setYear(yearFromUrl), [yearFromUrl]);
  useEffect(() => setNav(navFromUrl), [navFromUrl]);

  function pushNav(nextYear: number, nextNav: NavState) {
    const p = new URLSearchParams();
    p.set("y", String(nextYear));
    p.set("view", nextNav.view);
    p.set("span", nextNav.span);

    if (nextNav.span === "month" && typeof nextNav.m === "number") {
      p.set("m", String(nextNav.m));
    }

    router.push(`/?${p.toString()}`);
  }


  // =========================
  // UI state (NOT URL)
  // =========================
  const [arcCap, setArcCap] = useState<"round" | "butt">("butt");
  const [gapPxRound, setGapPxRound] = useState(0.5);
  const [gapPxButt, setGapPxButt] = useState(0.35);

  const [showCalendar, setShowCalendar] = useState(true);

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

  const [hoverInfo, setHoverInfo] = useState<HoverInfo>(null);
  const [selectedInfo, setSelectedInfo] = useState<HoverInfo>(null);

  const INNER_PLANETS = ["Mercury", "Venus", "Mars"] as const;
  const OUTER_PLANETS = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] as const;

  const toggleGroup = (group: "Inner" | "Outer") => {
    const ids = group === "Inner" ? INNER_PLANETS : OUTER_PLANETS;
    setVisiblePlanets((prev) => {
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

  // click background clears selection
  useEffect(() => {
    const svg = document.querySelector("#MandalaSvg");
    if (!(svg instanceof SVGSVGElement)) return;

    const onBgClick = () => setSelectedInfo(null);
    svg.addEventListener("click", onBgClick);

    return () => svg.removeEventListener("click", onBgClick);
  }, []);

  function normalizeNav(next: NavState): NavState {
    // default month if needed
    if (next.span === "month") {
      const m = typeof next.m === "number" ? next.m : new Date().getMonth();
      return { ...next, m: Math.max(0, Math.min(11, m)) };
    }
    // remove month when not in month span
    const { m: _m, ...rest } = next;
    return rest;
  }

  function commitNav(nextYear: number, nextNav: NavState) {
    const normalized = normalizeNav(nextNav);
    setNav(normalized);
    pushNav(nextYear, normalized);
  }

  function handleNavigate(patch: Partial<NavState>) {
    commitNav(year, { ...nav, ...patch });
  }

  function commitYear(nextYear: number) {
    setYear(nextYear);
    pushNav(nextYear, nav);
  }


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
        userChart={userChart}
        gapPx={{ round: gapPxRound, butt: gapPxButt }}
        nav={nav}
        onNavigate={handleNavigate}
      />

      <div className="mt-6">
        <UserChartVisual userChart={userChart} />
      </div>

      <ControlPanel
        year={year}
        setYear={commitYear}
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
        gapPxRound={gapPxRound}
        setGapPxRound={setGapPxRound}
        gapPxButt={gapPxButt}
        setGapPxButt={setGapPxButt}
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

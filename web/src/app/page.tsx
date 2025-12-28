"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MandalaClient, ControlPanel, MandalaSvg, RightSidebar } from "@/components/mandala";
import UserChartPanel from "@/components/mandala/UserChartPanel";
import UserChartVisual from "@/components/mandala/UserChartVisual";

import { clearUserChart, loadUserChart, saveUserChart, type UserChartPayload } from "@/lib/userChartCache";
import type { HoverInfo } from "@/lib/mandala/constants";
import TransitJournalViews from "@/components/mandala/TransitJournalViews";
import AppSidebar from "@/components/shell/AppSidebar";
import BodygraphSvg from "@/components/bodygraph/BodygraphSvg";



export default function Home() {

  type AppPage = "transits" | "journal" | "trackers" | "account";
  const [appPage, setAppPage] = useState<AppPage>("transits");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);


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

  const [journalReloadKey, setJournalReloadKey] = useState(0);

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
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        {/* Left shell */}
        <div className="w-[56px] shrink-0">
          <AppSidebar
            active={appPage}
            onSelect={(p) => {
              setAppPage(p);
              // auto-expand when entering Transits (per your request)
              if (p === "transits") setSidebarExpanded(true);
            }}
            isExpanded={sidebarExpanded}
            setExpanded={setSidebarExpanded}
          />
        </div>

        {/* Main area */}
        <div className="flex-1 relative min-h-screen">
          {/* If Transits: render mandala + side controls */}
          {appPage === "transits" ? (
            <>
              {/* Middle scroll column */}
              <div className="h-screen overflow-y-auto">
                <div className="pt-6 pb-24 flex flex-col items-center">
                  <MandalaSvg />
                  <MandalaClient
                    year={year}
                    visiblePlanets={visiblePlanets}
                    onHover={setHoverInfo}
                    onSelect={setSelectedInfo}
                    selected={selectedInfo}
                    arcCap={arcCap}
                    ringLayout={ringLayout}
                    showCalendar={showCalendar}
                    userChart={userChart}
                    gapPx={{ round: gapPxRound, butt: gapPxButt }}
                    nav={nav}
                    onNavigate={handleNavigate}
                    yearReloadKey={yearReloadKey}
                    yearReloadMode={yearReloadMode}
                    onYearReloadConsumed={() => setYearReloadMode("normal")}
                  />

                  {/* Bodygraph goes BELOW mandala (scrolls with column) */}
                  <div className="mt-8 w-full flex justify-center">
                    <div className="w-[860px] max-w-[calc(100vw-2rem)]">
                      <UserChartVisual userChart={userChart} />
                    </div>
                  </div>

                </div>
              </div>

              {/* Keep these as overlays (can stay fixed) */}
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
                year={year}
                selected={selectedInfo}
                onJournalSaved={() => setJournalReloadKey((k) => k + 1)}
              />

              {/* Mandala controls overlay (fixed; must NEVER affect layout flow) */}

              {sidebarExpanded ? (
                <div className="fixed left-[56px] top-0 h-screen w-[340px] bg-black/30 border-r border-white/10 p-3 overflow-auto z-40">
                  <div className="text-xs text-white/60 px-2 pb-2">Mandala Controls</div>

                  <ControlPanel
                    variant="embedded"
                    year={year}
                    setYear={(y) => {
                      setYear(y);
                      pushNav(y, nav);
                    }}
                    visiblePlanets={visiblePlanets}
                    togglePlanet={togglePlanet}
                    toggleGroup={toggleGroup}
                    arcCap={arcCap}
                    setArcCap={setArcCap}
                    ringLayout={ringLayout}
                    setRingLayout={setRingLayout}
                    showCalendar={showCalendar}
                    setShowCalendar={setShowCalendar}
                    resetYearCache={() => {
                      setYearReloadMode("reset");
                      setYearReloadKey((k) => k + 1);
                    }}
                    resetUserCache={() => {
                      clearUserChart();
                      setUserChart(null);
                    }}
                    gapPxRound={gapPxRound}
                    setGapPxRound={setGapPxRound}
                    gapPxButt={gapPxButt}
                    setGapPxButt={setGapPxButt}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {/* Journal page */}
          {appPage === "journal" ? (
            <div className="p-6">
              <div className="text-xl font-semibold mb-4">Journal</div>
              <TransitJournalViews reloadKey={journalReloadKey} variant="embedded" />
            </div>
          ) : null}

          {/* Trackers page */}
          {appPage === "trackers" ? (
            <div className="p-6">
              <div className="text-xl font-semibold mb-2">Trackers</div>
              <div className="text-white/60">(Placeholder — your custom mix rings will live here.)</div>
            </div>
          ) : null}

          {/* Account page */}
          {appPage === "account" ? (
            <div className="p-6">
              <div className="text-xl font-semibold mb-2">Account</div>
              <div className="text-white/60">(Placeholder.)</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

}

"use client";


import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MandalaClient, ControlPanel, MandalaSvg, RightSidebar } from "@/components/mandala";
import UserChartPanel from "@/components/mandala/UserChartPanel";
import UserChartVisual from "@/components/mandala/UserChartVisual";

import { clearUserChart, loadUserChart, saveUserChart, type UserChartPayload } from "@/lib/userChartCache";
import type { HoverInfo } from "@/lib/mandala/constants";
import TransitJournalViews from "@/components/mandala/TransitJournalViews";
import AppSidebar from "@/components/shell/AppSidebar";
import BodygraphSvg from "@/components/bodygraph/BodygraphSvg";

import { ringPalette, ringRegistry } from "@/lib/mandala/rings/registry";
import type { RingInstance } from "@/lib/mandala/rings/types";

import TrackerMandalaSvg from "@/components/mandala/TrackerMandalaSvg";
import TrackerMandalaClient from "@/components/mandala/TrackerMandalaClient";
import { expandModule } from "@/lib/mandala/rings/expand";
import { getRingModule } from "@/lib/mandala/rings/registry";

import { supabaseBrowser } from "@/lib/supabase/browser";




type AppPage = "transits" | "trackers" | "journal" | "account";

type LeftExpandedPanelProps = {
    appPage: AppPage;

    // transits props
    year: number;
    setYear: (y: number) => void;
    nav: { view: "calendar" | "tracker"; span: "year" | "quarter" | "month" | "week"; m?: number };
    pushNav: (nextYear: number, nextNav: any) => void;

    visiblePlanets: Record<string, boolean>;
    togglePlanet: (planet: string) => void;
    toggleGroup: (group: "Inner" | "Outer") => void;

    arcCap: "round" | "butt";
    setArcCap: (v: "round" | "butt") => void;

    ringLayout: import("@/lib/mandala/ringLayout").RingLayoutKnobs;
    setRingLayout: (v: import("@/lib/mandala/ringLayout").RingLayoutKnobs) => void;

    showCalendar: boolean;
    setShowCalendar: (v: boolean) => void;

    resetYearCache: () => void;
    resetUserCache: () => void;

    gapPxRound: number;
    setGapPxRound: (v: number) => void;
    gapPxButt: number;
    setGapPxButt: (v: number) => void;

    // trackers props
    trackerRings: RingInstance[];
    addTrackerRing: (moduleId: string) => void;
    removeTrackerRing: (instanceId: string) => void;
};

function LeftExpandedPanel(props: LeftExpandedPanelProps) {
    const {
        appPage,

        year,
        setYear,
        nav,
        pushNav,

        visiblePlanets,
        togglePlanet,
        toggleGroup,

        arcCap,
        setArcCap,

        ringLayout,
        setRingLayout,

        showCalendar,
        setShowCalendar,

        resetYearCache,
        resetUserCache,

        gapPxRound,
        setGapPxRound,
        gapPxButt,
        setGapPxButt,

        trackerRings,
        addTrackerRing,
        removeTrackerRing,
    } = props;

    return (
        <div className="fixed left-[56px] top-0 h-screen w-[340px] bg-black/30 border-r border-white/10 p-3 overflow-auto z-40">
            {appPage === "transits" ? (
                <>
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
                        resetYearCache={resetYearCache}
                        resetUserCache={resetUserCache}
                        gapPxRound={gapPxRound}
                        setGapPxRound={setGapPxRound}
                        gapPxButt={gapPxButt}
                        setGapPxButt={setGapPxButt}
                    />
                </>
            ) : appPage === "trackers" ? (
                <>
                    <div className="text-xs text-white/60 px-2 pb-2">Tracker Controls</div>

                    {/* Ring selection UI */}
                    <div className="mt-4 border-t border-white/10 pt-4">
                        <div className="text-xs text-white/60 px-2 pb-2">Tracker Rings</div>

                        <div className="px-2 py-2">
                            <div className="text-sm font-semibold mb-2">Add rings</div>
                            <div className="space-y-2">
                                {ringPalette.map((r) => (
                                    <button
                                        key={r.id}
                                        className="w-full text-left rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2"
                                        onClick={() => addTrackerRing(r.id)}
                                    >
                                        <div className="text-sm">{r.label}</div>
                                        <div className="text-xs text-white/50">{r.kind}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 px-2 py-2 border-t border-white/10">
                            <div className="text-sm font-semibold mb-2">Current rings</div>

                            {trackerRings.length === 0 ? (
                                <div className="text-xs text-white/60">No rings yet. Add one from above.</div>
                            ) : (
                                <div className="space-y-2">
                                    {trackerRings.map((inst) => (
                                        <div
                                            key={inst.instanceId}
                                            className="rounded-md bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between gap-2"
                                        >
                                            <div className="min-w-0">
                                                <div className="text-sm truncate">{inst.label ?? inst.moduleId}</div>
                                                <div className="text-xs text-white/50 truncate">{inst.moduleId}</div>
                                            </div>
                                            <button
                                                className="text-xs text-white/60 hover:text-white"
                                                onClick={() => removeTrackerRing(inst.instanceId)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Mandala layout controls (same knobs that affect tracker mandala) */}
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
                        resetYearCache={resetYearCache}
                        resetUserCache={resetUserCache}
                        gapPxRound={gapPxRound}
                        setGapPxRound={setGapPxRound}
                        gapPxButt={gapPxButt}
                        setGapPxButt={setGapPxButt}
                    />


                </>
            ) : (

                <>
                    <div className="text-xs text-white/60 px-2 pb-2">Panel</div>
                    <div className="text-white/60 text-sm px-2">
                        No controls for this page yet.
                    </div>
                </>
            )}
        </div>
    );
}


export default function Home() {

    const SESSION_KEY = "mandala.session.v1";

    type MandalaSession = {
        year: number;
        nav: { view: "calendar" | "tracker"; span: "year" | "quarter" | "month" | "week"; m?: number };
        visiblePlanets: Record<string, boolean>;
        arcCap: "round" | "butt";
        gapPxRound: number;
        gapPxButt: number;
        showCalendar: boolean;
        ringLayout: import("@/lib/mandala/ringLayout").RingLayoutKnobs;
        sidebarExpanded: boolean;
        isUserPanelOpen: boolean;
    };

    function safeParseSession(): MandalaSession | null {
        if (typeof window === "undefined") return null;
        try {
            const raw = window.localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as MandalaSession;
        } catch {
            return null;
        }
    }

    function safeWriteSession(s: MandalaSession) {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        } catch { }
    }


    // =========================
    // Trackers: ring stack (starts empty)
    // =========================
    const [trackerRings, setTrackerRings] = useState<RingInstance[]>([]);
    const [trackerFocusId, setTrackerFocusId] = useState<string | null>(null);

    const handleTrackerRingClick = useCallback(
        ({ instanceId, moduleId }: { instanceId: string; moduleId: string }) => {
            setTrackerFocusId(instanceId);

            const { add } = expandModule(moduleId);
            for (const childModuleId of add) {
                addTrackerRingIfMissing(childModuleId, {
                    parentInstanceId: instanceId,
                    insertBeforeInstanceId: instanceId,
                });
            }
        },
        []
    );



    const addTrackerRing = (
        moduleId: string,
        opts?: { parentInstanceId?: string | null; insertBeforeInstanceId?: string }
    ) => {
        setTrackerRings((prev) => {
            const mod = getRingModule(moduleId); // (we’ll import this below)
            const instanceId = `${moduleId}::${crypto.randomUUID()}`;

            const nextInst: RingInstance = {
                instanceId,
                moduleId,
                label: mod?.label ?? moduleId,
                parentInstanceId: opts?.parentInstanceId ?? null,
            };

            // Insert before a specific ring (this makes “children spawn inward”)
            if (opts?.insertBeforeInstanceId) {
                const i = prev.findIndex((r) => r.instanceId === opts.insertBeforeInstanceId);
                if (i >= 0) {
                    const copy = prev.slice();
                    copy.splice(i, 0, nextInst);
                    return copy;
                }
            }

            return [...prev, nextInst];
        });
    };


    function addTrackerRingIfMissing(
        moduleId: string,
        opts?: { parentInstanceId?: string | null; insertBeforeInstanceId?: string }
    ) {
        setTrackerRings((prev) => {

            if (prev.some((r) => r.moduleId === moduleId)) return prev;

            const mod = getRingModule(moduleId);
            const instanceId = `${moduleId}::${crypto.randomUUID()}`;

            const nextInst = {
                instanceId,
                moduleId,
                label: mod?.label ?? moduleId,
                parentInstanceId: opts?.parentInstanceId ?? null,
            };

            // Inward spawn (insert before parent)
            if (opts?.insertBeforeInstanceId) {
                const i = prev.findIndex((r) => r.instanceId === opts.insertBeforeInstanceId);
                if (i >= 0) {
                    const copy = prev.slice();
                    copy.splice(i, 0, nextInst);
                    return copy;
                }
            }

            // Default: append (same behavior as before)
            return [...prev, nextInst];
        });
    }



    const removeTrackerRing = (instanceId: string) => {
        setTrackerRings((prev) => prev.filter((r) => r.instanceId !== instanceId));
    };



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
    const [arcCap, setArcCap] = useState<"round" | "butt">("round");
    const [gapPxRound, setGapPxRound] = useState(0.5);
    const [gapPxButt, setGapPxButt] = useState(0.35);

    const [showCalendar, setShowCalendar] = useState(true);

    const [visiblePlanets, setVisiblePlanets] = useState<Record<string, boolean>>({
        Moon: true,
        Sun: true,
        Earth: true,
        NorthNode: true,
        SouthNode: true,

        Mercury: false,
        Venus: false,
        Mars: false,
        Jupiter: false,
        Saturn: false,
        Uranus: false,
        Neptune: false,
        Pluto: false,
    });

    const [ringLayout, setRingLayout] = useState<import("@/lib/mandala/ringLayout").RingLayoutKnobs>({
        centerR: 391.25,
        band: 120,
        gapRatio: 0.35,
        strokeMin: 14,
        strokeMax: 44,
        showInactive: false,
    });

    const [yearReloadKey, setYearReloadKey] = useState(0);
    const [yearReloadMode, setYearReloadMode] = useState<"normal" | "reset">("normal");

    const [userReloadKey, setUserReloadKey] = useState(0);
    const [userChart, setUserChart] = useState<UserChartPayload | null>(null);
    const [chartSource, setChartSource] = useState<"cloud" | "local" | null>(null);

    const [isUserPanelOpen, setIsUserPanelOpen] = useState(true);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

    // =========================
    // Auth (Supabase magic link)
    // =========================
    const [authEmail, setAuthEmail] = useState("");
    const [authMsg, setAuthMsg] = useState<string | null>(null);

    const sendMagicLink = async () => {
        setAuthMsg(null);

        const email = authEmail.trim();
        if (!email) return;

        const supabase = supabaseBrowser();
        const origin = window.location.origin;

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${origin}/auth/callback`,
            },
        });

        if (error) setAuthMsg(error.message);
        else setAuthMsg("Check your email for the sign-in link.");
    };

    const signOut = async () => {
        const supabase = supabaseBrowser();
        const { error } = await supabase.auth.signOut();

        if (error) setAuthMsg(error.message);

        else {
            setAuthMsg("Signed out.");
            setUserChart(null);
            setChartSource(null);
        }

    };

    const [currentUser, setCurrentUser] = useState<{
        id: string;
        email: string | null;
    } | null>(null);

    useEffect(() => {
        const supabase = supabaseBrowser();

        const upsertProfile = async (u: { id: string; email?: string | null }) => {
            // Upsert your profile row (RLS ensures only the authed user can write their own id)
            const { error } = await supabase.from("profiles").upsert(
                {
                    id: u.id,
                    email: u.email ?? null,
                },
                { onConflict: "id" }
            );

            if (error) {
                console.warn("profiles upsert failed:", error.message);
            }
        };


        // 1) initial load
        supabase.auth.getUser().then(({ data }) => {

            if (data.user) {
                const u = { id: data.user.id, email: data.user.email ?? null };
                setCurrentUser(u);
                void upsertProfile(u);
                void refreshUserChart(u.id);
            } else {
                setCurrentUser(null);
            }

        });

        // 2) live updates (login/logout/refresh)
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;

            if (u) {
                const userObj = { id: u.id, email: u.email ?? null };
                setCurrentUser(userObj);
                void upsertProfile(userObj);
                void refreshUserChart(u.id);
            } else {
                setCurrentUser(null);

                // ✅ Clear in-memory chart on sign out
                setUserChart(null);

                // Optional: also clear any selected/hover UI if you want
                // setSelectedInfo(null);
                // setHoverInfo(null);
            }


        });

        return () => {
            sub.subscription.unsubscribe();
        };
    }, []);

    const loadChartForUser = async (userId: string) => {
        const supabase = supabaseBrowser();

        const { data, error } = await supabase
            .from("charts")
            .select("id,label,payload")
            .eq("owner_id", userId)
            .order("updated_at", { ascending: false })
            .limit(1);

        if (error) {
            console.warn("loadChartForUser failed:", error.message);
            return null;
        }

        return data?.[0] ?? null;
    };

    const saveChartForUser = async (userId: string, payload: UserChartPayload, label = "Me") => {
        const supabase = supabaseBrowser();

        const { error } = await supabase.from("charts").upsert(
            {
                owner_id: userId,
                label,
                payload,
            },
            // We want ONE “primary chart” row for now.
            // So we upsert by (owner_id, label) — but that requires a unique constraint.
            // We'll add that constraint next if you want.
            {}
        );

        if (error) {
            console.warn("saveChartForUser failed:", error.message);
        }
    };

    const refreshUserChart = async (userId: string) => {
        const row = await loadChartForUser(userId);
        if (row?.payload) {
            setUserChart(row.payload as UserChartPayload);
            setChartSource("cloud");
            return true;
        }
        setUserChart(null);
        setChartSource(null);
        return false;
    };




    // =========================
    // Session restore (runs once)
    // =========================
    useEffect(() => {
        // If URL has explicit nav, do NOT override with session
        const hasUrlNav =
            searchParams.has("y") ||
            searchParams.has("view") ||
            searchParams.has("span") ||
            searchParams.has("m");

        if (hasUrlNav) return;

        const s = safeParseSession();
        if (!s) return;

        setSidebarExpanded(s.sidebarExpanded);
        setIsUserPanelOpen(s.isUserPanelOpen);

        setArcCap(s.arcCap);
        setGapPxRound(s.gapPxRound);
        setGapPxButt(s.gapPxButt);
        setShowCalendar(s.showCalendar);
        setRingLayout(s.ringLayout);
        setVisiblePlanets(s.visiblePlanets);

        setYear(s.year);
        setNav(s.nav);

        // Keep URL shareable + consistent with restored session
        pushNav(s.year, s.nav);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =========================
    // Session persist
    // =========================
    useEffect(() => {
        const s: MandalaSession = {
            year,
            nav,
            visiblePlanets,
            arcCap,
            gapPxRound,
            gapPxButt,
            showCalendar,
            ringLayout,
            sidebarExpanded,
            isUserPanelOpen,
        };
        safeWriteSession(s);
    }, [
        year,
        nav,
        visiblePlanets,
        arcCap,
        gapPxRound,
        gapPxButt,
        showCalendar,
        ringLayout,
        sidebarExpanded,
        isUserPanelOpen,
    ]);

    useEffect(() => {
        if (currentUser?.id) {
            loadChartForUser(currentUser.id).then((row) => {
                if (row?.payload) {
                    setUserChart(row.payload as UserChartPayload);
                    setChartSource("cloud");
                } else {
                    setUserChart(null);
                    setChartSource(null);
                }
            });
        } else {
            // ✅ Signed out:
            // - if user is working with a local chart, keep it
            // - otherwise clear
            if (chartSource !== "local") {
                setUserChart(null);
                setChartSource(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userReloadKey, currentUser?.id, chartSource]);




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
        // Always keep local cache for fast boot / offline-ish
        saveUserChart(payload);
        setUserChart(payload);
        setUserReloadKey((k) => k + 1);

        if (currentUser?.id) {
            setChartSource("cloud");
            void saveChartForUser(currentUser.id, payload, "Me");
        } else {
            // ✅ signed out upload = local working session
            setChartSource("local");
        }
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
        <div className="min-h-screen">
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

                    {/* Left sidebar expansion panel (one panel; content switches by appPage) */}
                    {sidebarExpanded ? (
                        <LeftExpandedPanel
                            appPage={appPage}
                            year={year}
                            setYear={setYear}
                            nav={nav}
                            pushNav={pushNav}
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
                            trackerRings={trackerRings}
                            addTrackerRing={addTrackerRing}
                            removeTrackerRing={removeTrackerRing}
                        />
                    ) : null}


                    {/* If Transits: render mandala + side controls */}
                    {appPage === "transits" ? (
                        <>
                            {/* Middle scroll column */}
                            <div className="h-screen overflow-y-auto">
                                <div className="pt-6 pb-24 flex flex-col items-center">
                                    <MandalaSvg />
                                    <MandalaClient
                                        key={currentUser?.id ?? "anon"}
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
                                            <UserChartVisual key={currentUser?.id ?? "anon"} userChart={userChart} />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Right sidebar toggle tab (always visible) */}
                            <button
                                className="fixed right-0 top-1/2 -translate-y-1/2 z-50 rounded-l-lg bg-black/60 border border-white/15 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-black/75"
                                onClick={() => setIsRightSidebarOpen((v) => !v)}
                                aria-label={isRightSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                            >
                                {isRightSidebarOpen ? "Hide" : "Show"}
                            </button>

                            {/* Right sidebar (conditionally visible) */}
                            {isRightSidebarOpen ? (
                                <RightSidebar
                                    hovered={hoverInfo}
                                    selected={selectedInfo}
                                    clearSelected={() => setSelectedInfo(null)}
                                />
                            ) : null}


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
                        <div className="h-screen overflow-y-auto">
                            <div className="pt-6 pb-24 flex flex-col items-center">
                                <TrackerMandalaSvg />
                                <TrackerMandalaClient
                                    rings={trackerRings}
                                    year={year}
                                    ringLayout={ringLayout}
                                    focusInstanceId={trackerFocusId}
                                    maxVisible={12}
                                    fadeCount={4}
                                    onRingClick={handleTrackerRingClick}
                                />



                                <div className="mt-4 text-white/60 text-sm">
                                    Add rings from the left expansion panel to see them mount here.
                                </div>
                            </div>
                        </div>
                    ) : null}


                    {/* Account page */}
                    {appPage === "account" ? (
                        <div className="p-6 max-w-md">
                            <div className="text-xl font-semibold mb-4">Account</div>

                            {currentUser ? (
                                <div className="text-sm text-white/70 mb-3">
                                    Signed in as <span className="text-white">{currentUser.email}</span>
                                </div>
                            ) : (
                                <div className="text-sm text-white/40 mb-3">
                                    Not signed in
                                </div>
                            )}


                            <div className="space-y-3">
                                <label className="block text-xs text-white/60">Email</label>

                                <input
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    placeholder="you@email.com"
                                    className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
                                />

                                <div className="flex gap-3">
                                    <button
                                        className="rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-sm disabled:opacity-50"
                                        onClick={sendMagicLink}
                                        disabled={!authEmail.trim()}
                                    >
                                        Email me a login link
                                    </button>

                                    <button
                                        className="rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm text-white/70"
                                        onClick={signOut}
                                    >
                                        Sign out
                                    </button>
                                </div>

                                {authMsg ? <div className="text-sm text-white/60">{authMsg}</div> : null}

                                <div className="text-xs text-white/40 pt-2">
                                    (Beta auth: magic link.)
                                </div>
                            </div>
                        </div>
                    ) : null}

                </div>
            </div>
        </div>
    );

}

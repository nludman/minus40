"use client";


import { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
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




type AppPage = "transits" | "charts" | "trackers" | "journal" | "account";
type LeftPanelMode = AppPage | "settings";


type LeftExpandedPanelProps = {
    panelMode: LeftPanelMode;


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

    // settings props
    userChart: UserChartPayload | null;
    selectedInfo: HoverInfo;
    onUserChartUploaded: (payload: UserChartPayload) => void;
    onJournalSaved: () => void;

};

function LeftExpandedPanel(props: LeftExpandedPanelProps) {
    const {
        panelMode,

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
            {panelMode === "transits" ? (
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
            ) : panelMode === "trackers" ? (
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
            ) : panelMode === "settings" ? (
                <>
                    <div className="text-xs text-white/60 px-2 pb-2">Settings</div>
                    <UserChartPanel
                        userChart={props.userChart}
                        onUserChartUploaded={props.onUserChartUploaded}
                        onResetUserCache={props.resetUserCache}
                        isOpen={true}
                        onToggleOpen={() => { }}
                        year={props.year}
                        selected={props.selectedInfo}
                        onJournalSaved={props.onJournalSaved}
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

    const RIGHT_SLIVER = 14;         // visible edge when "closed"
    const RIGHT_MIN_OPEN = 280;      // smallest usable open width
    const RIGHT_MAX = 520;

    const RIGHT_SNAP_CLOSE_AT = 140; // drag below this => snap closed
    const RIGHT_SNAP_OPEN_AT = 200;  // drag above this => snap open
    const RIGHT_RENDER_MIN = 220;    // only render sidebar contents above this
    const RIGHT_OPEN_DRAG_DELTA = 24; // drag ~24px left from the sliver to open


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

    };


    // NOTE: Drag open/close behavior works but needs refinement.
    // Leaving as-is to move forward with Charts implementation.

    function startRightResize(e: React.MouseEvent) {
        e.preventDefault();
        setRightIsDragging(true);

        // internal drag-mode for this gesture
        let mode: "closed" | "open" = isRightSidebarOpen ? "open" : "closed";

        let baseX = e.clientX;
        let baseW = mode === "open" ? rightW : RIGHT_SLIVER;

        const OPEN_DELTA = 18; // drag ~18px left from sliver to open

        function cleanup() {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        }

        function snapClose() {
            // enable transition for the snap
            setRightIsDragging(false);
            setIsRightSidebarOpen(false);
            cleanup();
        }

        function onMove(ev: MouseEvent) {
            const dx = ev.clientX - baseX;
            const proposed = baseW - dx; // drag left => wider

            // ✅ ONLY snap-close if we are currently OPEN
            if (mode === "open" && proposed < RIGHT_SNAP_CLOSE_AT) {
                snapClose();
                return;
            }

            // If currently closed, open after a small drag
            if (mode === "closed") {
                if (proposed >= RIGHT_SLIVER + OPEN_DELTA) {
                    mode = "open";
                    setIsRightSidebarOpen(true);

                    const next = Math.max(RIGHT_MIN_OPEN, Math.min(RIGHT_MAX, proposed));
                    setRightW(next);

                    // reset baseline so it feels continuous
                    baseX = ev.clientX;
                    baseW = next;
                }
                return;
            }

            // mode === "open": live resize (no transition during drag)
            const next = Math.max(RIGHT_MIN_OPEN, Math.min(RIGHT_MAX, proposed));
            setRightW(next);
        }

        function onUp() {
            cleanup();
            setRightIsDragging(false);
        }

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }



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
    // Floating Journal Composer (Phase 1: UI only)
    // =========================
    const [journalDraft, setJournalDraft] = useState("");
    const [journalSending, setJournalSending] = useState(false);
    //const [forceJournalFail, setForceJournalFail] = useState(false);
    const [journalError, setJournalError] = useState<string | null>(null);
    const journalBoxRef = useRef<HTMLDivElement | null>(null);
    const [journalBoxH, setJournalBoxH] = useState(0);

    // matches your sticky bottom offset (bottom-12 = 48px)
    const JOURNAL_BOTTOM_OFFSET_PX = 48;


    const journalTaRef = useRef<HTMLTextAreaElement | null>(null);

    const JOURNAL_MIN_H = 56;   // px
    const JOURNAL_MAX_H = 220;  // px

    useLayoutEffect(() => {
        const el = journalTaRef.current;
        if (!el) return;

        // reset then measure
        el.style.height = "0px";
        const next = Math.max(JOURNAL_MIN_H, Math.min(JOURNAL_MAX_H, el.scrollHeight));
        el.style.height = `${next}px`;
    }, [journalDraft]);

    useLayoutEffect(() => {
        const box = journalBoxRef.current;
        if (!box) return;

        const h = Math.ceil(box.getBoundingClientRect().height);
        setJournalBoxH(h);
    }, [journalDraft, journalSending]);


    async function sendJournalEntry() {
        const text = journalDraft.trim();
        if (!text) return;

        //if (forceJournalFail) {
        //    setJournalError("Couldn’t save entry. Try again.");
        //    return;
        //}


        // If not signed in, keep the UI behavior but don't write to DB yet
        if (!currentUser?.id) {
            setJournalDraft("");
            setJournalReloadKey((k) => k + 1);
            return;
        }

        setJournalSending(true);
        try {
            const supabase = supabaseBrowser();

            const { error } = await supabase.from("journal_entries").insert({
                owner_id: currentUser.id,
                chart_id: activeChartId,   // nullable; ties entry to current chart if selected
                content: text,
                nav: nav,                  // snapshot of current view/span/month
                selected: selectedInfo,    // snapshot of selected segment/gate/channel
                meta: {
                    year,
                    appPage: appPage,
                },
            });

            if (error) {
                setJournalError("Couldn’t save entry. Try again.");
                return;
            }

            setJournalError(null);
            setJournalDraft("");
        } finally {
            setJournalSending(false);
        }
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
    const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>("transits");

    const [sidebarExpanded, setSidebarExpanded] = useState(true);

    const [leftW, setLeftW] = useState(340);
    const [rightW, setRightW] = useState(320);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

    const rightOpenRef = useRef(isRightSidebarOpen);
    const rightWRef = useRef(rightW);

    useEffect(() => {
        rightOpenRef.current = isRightSidebarOpen;
    }, [isRightSidebarOpen]);

    useEffect(() => {
        rightWRef.current = rightW;
    }, [rightW]);

    const [rightIsDragging, setRightIsDragging] = useState(false);


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

    type ChartRow = {
        id: string;
        label: string | null;
        updated_at: string | null;
        payload: any;
    };

    const [charts, setCharts] = useState<ChartRow[]>([]);
    const [chartsLoading, setChartsLoading] = useState(false);
    const [chartsError, setChartsError] = useState<string | null>(null);
    const [activeChartId, setActiveChartId] = useState<string | null>(null);

    // Create flow
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newChartLabel, setNewChartLabel] = useState("New Chart");
    const [newChartJson, setNewChartJson] = useState("");
    const [createBusy, setCreateBusy] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    async function refreshChartsList(userId: string) {
        setChartsLoading(true);
        setChartsError(null);

        const supabase = supabaseBrowser();
        const { data, error } = await supabase
            .from("charts")
            .select("id,label,updated_at,payload")
            .eq("owner_id", userId)
            .order("updated_at", { ascending: false });

        if (error) {
            setChartsError(error.message);
            setCharts([]);
        } else {
            setCharts((data ?? []) as ChartRow[]);
        }

        setChartsLoading(false);
    }

    function applyChart(row: ChartRow) {
        // Load into app memory + local cache
        setUserChart(row.payload as UserChartPayload);
        setChartSource("cloud");
        setActiveChartId(row.id);
        try {
            saveUserChart(row.payload as UserChartPayload);
        } catch { }

        // Jump to transits so you see it immediately
        setAppPage("transits");
        setLeftPanelMode("transits");
        setSidebarExpanded(true);
    }

    async function createChartFromJson() {
        if (!currentUser?.id) return;

        setCreateBusy(true);
        setCreateError(null);

        let payloadObj: any;
        try {
            payloadObj = JSON.parse(newChartJson);
        } catch {
            setCreateError("Invalid JSON.");
            setCreateBusy(false);
            return;
        }

        const supabase = supabaseBrowser();
        const { data, error } = await supabase
            .from("charts")
            .insert({
                owner_id: currentUser.id,
                label: newChartLabel.trim() || "New Chart",
                payload: payloadObj,
            })
            .select("id,label,updated_at,payload")
            .single();

        if (error) {
            setCreateError(error.message);
            setCreateBusy(false);
            return;
        }

        setIsCreateOpen(false);
        setNewChartJson("");
        setNewChartLabel("New Chart");

        // Refresh list + apply the new chart immediately
        await refreshChartsList(currentUser.id);
        if (data) applyChart(data as ChartRow);

        setCreateBusy(false);
    }

    useEffect(() => {
        if (appPage !== "charts") return;
        if (!currentUser?.id) return;
        void refreshChartsList(currentUser.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appPage, currentUser?.id]);



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
        <div className="h-screen w-full overflow-hidden">
            <div
                className={[
                    "h-full grid",
                    rightIsDragging ? "" : "transition-[grid-template-columns] duration-200 ease-out",
                ].join(" ")}
                style={{
                    gridTemplateColumns: [
                        "56px",
                        sidebarExpanded ? `${leftW}px` : "0px",
                        "minmax(0, 1fr)",
                        isRightSidebarOpen ? `${rightW}px` : `${RIGHT_SLIVER}px`,
                    ].join(" "),
                }}
            >

                {/* 1) Left shell */}
                <div className="h-full">
                    <AppSidebar
                        active={appPage}
                        panelMode={leftPanelMode}
                        onSelect={(p) => {
                            if (p === "settings") {
                                setSidebarExpanded(true);
                                setLeftPanelMode("settings");
                                return;
                            }

                            setAppPage(p as AppPage);
                            setLeftPanelMode(p as AppPage);

                            if (p === "transits") setSidebarExpanded(true);
                        }}
                        isExpanded={sidebarExpanded}
                        setExpanded={setSidebarExpanded}
                    />
                </div>

                {/* 2) Left expanded column */}
                <div className="h-full overflow-hidden">
                    {sidebarExpanded ? (
                        <LeftExpandedPanel
                            panelMode={leftPanelMode}
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
                            userChart={userChart}
                            selectedInfo={selectedInfo}
                            onUserChartUploaded={onUserChartUploaded}
                            onJournalSaved={() => setJournalReloadKey((k) => k + 1)}
                        />
                    ) : null}
                </div>

                {/* 3) Center column (the product) */}
                <div
                    className="h-full overflow-y-auto relative"
                    style={
                        {
                            // default background tone for this layout
                            ["--journalMaskColor" as any]: "#83a5a9",
                        } as React.CSSProperties
                    }
                >

                    {/* Transits */}
                    {appPage === "transits" ? (
                        <div className="pt-6 pb-0 flex flex-col items-center">
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

                            {/* Bodygraph below mandala */}
                            <div className="mt-8 w-full flex justify-center">
                                <div className="w-[860px] max-w-[calc(100vw-2rem)]">
                                    <UserChartVisual key={currentUser?.id ?? "anon"} userChart={userChart} />
                                </div>
                            </div>


                            {/* Journal mask + composer MUST live down here (outside the pb-24 wrapper) */}
                            {appPage === "transits" ? (
                                <>
                                    {/* Journal Cutoff Mask (pinned, non-layout) */}
                                    <div className="sticky bottom-0 h-0 w-full pointer-events-none z-20">
                                        <div
                                            className="absolute inset-x-0 bottom-0"
                                            style={{
                                                height: journalBoxH + JOURNAL_BOTTOM_OFFSET_PX,
                                                background: "var(--journalMaskColor)",
                                            }}
                                        />
                                        {/* Fade sits ABOVE the solid mask */}
                                        <div
                                            className="absolute inset-x-0"
                                            style={{
                                                bottom: journalBoxH + JOURNAL_BOTTOM_OFFSET_PX,
                                                height: 32,
                                                background: "linear-gradient(to bottom, transparent, var(--journalMaskColor))",
                                            }}
                                        />
                                    </div>




                                    {/* Floating Journal Composer (pinned, non-layout) */}
                                    <div className="sticky bottom-0 h-0 w-full pointer-events-none z-30">
                                        <div className="absolute inset-x-0 bottom-12 flex justify-center pointer-events-none">
                                            <div className="w-[660px] max-w-[calc(100vw-2rem)] pointer-events-auto">
                                                <div
                                                    ref={journalBoxRef}
                                                    className="relative rounded-3xl border border-white/12 bg-black/70 backdrop-blur-md shadow-lg"
                                                >
                                                    <textarea
                                                        ref={journalTaRef}
                                                        value={journalDraft}
                                                        onChange={(e) => setJournalDraft(e.target.value)}
                                                        placeholder="Write a journal entry..."
                                                        className="w-full resize-none rounded-2xl bg-transparent px-4 py-2.5 pr-12 text-sm text-white placeholder:text-white/35 outline-none"
                                                        style={{ minHeight: JOURNAL_MIN_H, maxHeight: JOURNAL_MAX_H }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" && !e.shiftKey) {
                                                                e.preventDefault();
                                                                void sendJournalEntry();
                                                            }
                                                        }}
                                                    />

                                                    <button
                                                        onClick={() => void sendJournalEntry()}
                                                        disabled={journalSending || !journalDraft.trim()}
                                                        className="absolute right-2 bottom-2 h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 disabled:opacity-40 disabled:hover:bg-white/10 flex items-center justify-center"
                                                        aria-label="Send entry"
                                                        title="Send"
                                                    >
                                                        <span className="text-white/90 text-base">➤</span>
                                                    </button>
                                                </div>


                                            </div>
                                        </div>
                                    </div>

                                </>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Charts */}
                    {appPage === "charts" ? (
                        <div className="p-6 max-w-3xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-xl font-semibold">Charts</div>

                                <button
                                    className="rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-sm disabled:opacity-50"
                                    onClick={() => {
                                        setCreateError(null);
                                        setIsCreateOpen((v) => !v);
                                    }}
                                    disabled={!currentUser}
                                    title={!currentUser ? "Sign in to create charts" : "Create a new chart"}
                                >
                                    Create New
                                </button>
                            </div>

                            {!currentUser ? (
                                <div className="text-sm text-white/60">
                                    Sign in to view and create charts.
                                </div>
                            ) : null}

                            {isCreateOpen && currentUser ? (
                                <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
                                    <div className="text-sm font-semibold mb-3">New chart</div>

                                    <label className="block text-xs text-white/60 mb-1">Label</label>
                                    <input
                                        value={newChartLabel}
                                        onChange={(e) => setNewChartLabel(e.target.value)}
                                        className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white mb-3"
                                    />

                                    <label className="block text-xs text-white/60 mb-1">Chart JSON (payload)</label>
                                    <textarea
                                        value={newChartJson}
                                        onChange={(e) => setNewChartJson(e.target.value)}
                                        rows={8}
                                        placeholder='Paste payload JSON here...'
                                        className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-white font-mono"
                                    />

                                    {createError ? <div className="text-sm text-red-300 mt-2">{createError}</div> : null}

                                    <div className="mt-3 flex gap-2">
                                        <button
                                            className="rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-sm disabled:opacity-50"
                                            onClick={createChartFromJson}
                                            disabled={createBusy || !newChartJson.trim()}
                                        >
                                            {createBusy ? "Creating..." : "Create"}
                                        </button>

                                        <button
                                            className="rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm text-white/70"
                                            onClick={() => setIsCreateOpen(false)}
                                            disabled={createBusy}
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    <div className="text-xs text-white/40 mt-2">
                                        (We’ll move JSON paste into Settings later.)
                                    </div>
                                </div>
                            ) : null}

                            {chartsLoading ? <div className="text-sm text-white/60">Loading…</div> : null}
                            {chartsError ? <div className="text-sm text-red-300">{chartsError}</div> : null}

                            {!chartsLoading && currentUser && charts.length === 0 ? (
                                <div className="text-sm text-white/60">No charts yet.</div>
                            ) : null}

                            <div className="space-y-2">
                                {charts.map((c) => {
                                    const isActive = c.id === activeChartId;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => applyChart(c)}
                                            className={[
                                                "w-full text-left rounded-xl border px-4 py-3",
                                                isActive ? "bg-white/10 border-white/20" : "bg-white/5 hover:bg-white/10 border-white/10",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold truncate">{c.label ?? "Untitled"}</div>
                                                    <div className="text-xs text-white/50 truncate">{c.id}</div>
                                                </div>

                                                <div className="text-xs text-white/40">
                                                    {c.updated_at ? new Date(c.updated_at).toLocaleString() : ""}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}


                    {/* Journal */}
                    {appPage === "journal" ? (
                        <div className="p-6">
                            <div className="text-xl font-semibold mb-4">Journal</div>
                            <TransitJournalViews reloadKey={journalReloadKey} variant="embedded" />
                        </div>
                    ) : null}

                    {/* Trackers */}
                    {appPage === "trackers" ? (
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
                    ) : null}

                    {/* Account */}
                    {appPage === "account" ? (
                        <div className="p-6 max-w-md">
                            <div className="text-xl font-semibold mb-4">Account</div>

                            {currentUser ? (
                                <div className="text-sm text-white/70 mb-3">
                                    Signed in as <span className="text-white">{currentUser.email}</span>
                                </div>
                            ) : (
                                <div className="text-sm text-white/40 mb-3">Not signed in</div>
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

                                <div className="text-xs text-white/40 pt-2">(Beta auth: magic link.)</div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* 4) Right sidebar column */}
                <div className="h-full overflow-hidden bg-black/30 border-l border-white/10 relative">
                    {/* Full-height draggable edge */}
                    <div
                        onMouseDown={startRightResize}
                        className="absolute left-0 top-0 h-full w-[14px] cursor-col-resize bg-white/5 hover:bg-white/10"
                        title={isRightSidebarOpen ? "Drag to resize (snap closed)" : "Drag to open"}
                        aria-label="Resize sidebar"
                    />

                    {/* Optional: a click target on the sliver to toggle */}
                    {!isRightSidebarOpen ? (
                        <button
                            onClick={() => setIsRightSidebarOpen(true)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-[14px] bg-black/70 border border-white/15 rounded-r-md"
                            title="Open info"
                            aria-label="Open sidebar"
                        />
                    ) : null}

                    {/* Only render content when there is space (prevents crushing) */}
                    {isRightSidebarOpen && rightW >= RIGHT_RENDER_MIN ? (
                        <div className="h-full pl-[14px]">
                            <RightSidebar
                                hovered={hoverInfo}
                                selected={selectedInfo}
                                clearSelected={() => setSelectedInfo(null)}
                            />
                        </div>
                    ) : (
                        // when open but small (during drag), keep it visually stable without content reflow
                        isRightSidebarOpen ? <div className="h-full pl-[14px]" /> : null
                    )}
                </div>

            </div>
        </div >
    );


}

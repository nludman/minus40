"use client";


import { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MandalaClient, ControlPanel, MandalaSvg, RightSidebar } from "@/components/mandala";
import UserChartPanel from "@/components/mandala/UserChartPanel";
import UserChartVisual from "@/components/mandala/UserChartVisual";

import { generateChartFromInputs } from "@/lib/chartGenerator";

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

type ChartRow = {
    id: string;
    label: string | null;
    updated_at: string | null;
    payload: any;
};

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

    mandalaAiOn: boolean;
    setMandalaAiOn: (v: boolean) => void;

    mandalaQuery: string;
    setMandalaQuery: (v: string) => void;

    mandalaSearching: boolean;
    setMandalaSearching: (v: boolean) => void;

    highlightGate: number | null;
    setHighlightGate: (v: number | null) => void;

    mandalaSearchOn: boolean;
    setMandalaSearchOn: (v: boolean) => void;

    // charts props
    charts: ChartRow[];
    chartsLoading: boolean;
    chartsError: string | null;
    activeChartId: string | null;
    applyChart: (row: ChartRow) => void;
    deleteChartById: (chartId: string) => void;
    openCreateChart: () => void;


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

        mandalaAiOn,
        setMandalaAiOn,

        mandalaQuery,
        setMandalaQuery,

        mandalaSearching,
        setMandalaSearching,

        highlightGate,
        setHighlightGate,

        mandalaSearchOn,
        setMandalaSearchOn,

        charts,
        chartsLoading,
        chartsError,
        activeChartId,
        applyChart,
        deleteChartById,
        openCreateChart,


    } = props;

    const onMandalaSearch = async () => {
        const q = mandalaQuery.trim();
        if (!q) return;

        // AI off = cheap parse
        if (!mandalaAiOn) {
            const m =
                q.match(/gate\s*#?\s*(\d{1,2})/i) ||
                q.match(/\b(\d{1,2})\b/);
            const gate = m ? Number(m[1]) : null;
            setHighlightGate(gate && gate >= 1 && gate <= 64 ? gate : null);
            return;
        }

        // ✅ AI is ON, but if query is simple, still do offline parse (save tokens)
        const simple =
            /^\s*gate\s*#?\s*\d{1,2}\s*$/i.test(q) ||
            /^\s*\d{1,2}\s*$/.test(q) ||
            /^\s*gate#?\d{1,2}\s*$/i.test(q);

        if (simple) {
            const m =
                q.match(/gate\s*#?\s*(\d{1,2})/i) ||
                q.match(/\b(\d{1,2})\b/);
            const gate = m ? Number(m[1]) : null;
            setHighlightGate(gate && gate >= 1 && gate <= 64 ? gate : null);
            return;
        }

        setMandalaSearching(true);
        try {
            const res = await fetch("/api/mandala/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ q }),
            });
            if (!res.ok) return;

            const data = await res.json();
            if (data?.action === "highlight_gate" && typeof data?.gate === "number") {
                setHighlightGate(data.gate);
            }
        } finally {
            setMandalaSearching(false);
        }
    };



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
                        mandalaAiOn={mandalaAiOn}
                        setMandalaAiOn={setMandalaAiOn}
                        mandalaQuery={mandalaQuery}
                        setMandalaQuery={setMandalaQuery}
                        mandalaSearching={mandalaSearching}
                        onMandalaSearch={onMandalaSearch}
                        highlightGate={highlightGate}
                        clearHighlightGate={() => setHighlightGate(null)}
                        mandalaSearchOn={mandalaSearchOn}
                        setMandalaSearchOn={setMandalaSearchOn}


                    />



                </>

            ) : panelMode === "charts" ? (
                <>
                    <div className="flex items-center justify-between px-2 pb-2">
                        <div className="text-xs text-white/60">Charts</div>

                        <button
                            className="rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 text-xs disabled:opacity-50"
                            onClick={openCreateChart}
                            type="button"
                        >
                            New
                        </button>
                    </div>

                    {chartsLoading ? <div className="px-2 text-xs text-white/60">Loading…</div> : null}
                    {chartsError ? <div className="px-2 text-xs text-red-300">{chartsError}</div> : null}

                    <div className="mt-2 space-y-2">
                        {charts.map((c) => {
                            const isActive = c.id === activeChartId;

                            return (
                                <div
                                    key={c.id}
                                    className={[
                                        "w-full rounded-xl border px-3 py-2 flex items-center justify-between gap-2",
                                        isActive ? "bg-white/10 border-white/20" : "bg-white/5 hover:bg-white/10 border-white/10",
                                    ].join(" ")}
                                >
                                    <button
                                        onClick={() => applyChart(c)}
                                        className="min-w-0 flex-1 text-left"
                                        type="button"
                                    >
                                        <div className="text-sm font-semibold truncate">{c.label ?? "Untitled"}</div>
                                        <div className="text-[11px] text-white/40 truncate">
                                            {c.updated_at ? new Date(c.updated_at).toLocaleString() : ""}
                                        </div>
                                    </button>

                                    <button
                                        className="shrink-0 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 px-2 py-1 text-[11px] text-red-200"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void deleteChartById(c.id);
                                        }}
                                        type="button"
                                        title="Delete chart"
                                    >
                                        Delete
                                    </button>
                                </div>
                            );
                        })}
                    </div>
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

    // AI assist (Phase 2)
    const [journalAiOn, setJournalAiOn] = useState(false);
    const [journalAiReflection, setJournalAiReflection] = useState<string | null>(null);
    const [journalAiMeta, setJournalAiMeta] = useState<any>(null);


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


    async function searchMandalaFromJournal() {
        const q = journalDraft.trim();
        if (!q) return;

        // If AI search is off, do local parse (cheap)
        if (!mandalaAiOn) {
            const m =
                q.match(/gate\s*#?\s*(\d{1,2})/i) ||
                q.match(/\b(\d{1,2})\b/);

            const gate = m ? Number(m[1]) : null;
            const ok = gate && gate >= 1 && gate <= 64;
            setHighlightGate(ok ? gate : null);
            if (ok) setJournalDraft("");
            return;

        }

        // AI-on but still cheap for simple queries
        const simple =
            /^\s*gate\s*#?\s*\d{1,2}\s*$/i.test(q) ||
            /^\s*\d{1,2}\s*$/.test(q) ||
            /^\s*gate#?\d{1,2}\s*$/i.test(q);

        if (simple) {
            const m =
                q.match(/gate\s*#?\s*(\d{1,2})/i) ||
                q.match(/\b(\d{1,2})\b/);

            const gate = m ? Number(m[1]) : null;
            const ok = gate && gate >= 1 && gate <= 64;
            setHighlightGate(ok ? gate : null);
            if (ok) setJournalDraft("");
            return;

        }

        // Otherwise: AI route (complex query)
        setMandalaSearching(true);
        try {
            const res = await fetch("/api/mandala/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ q }),
            });
            if (!res.ok) return;

            const data = await res.json();
            if (data?.action === "highlight_gate" && typeof data?.gate === "number") {
                setHighlightGate(data.gate);
                setJournalDraft("");
            }
        } finally {
            setMandalaSearching(false);
        }
    }


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

            // 1) Optional AI reflect
            let aiReflection: string | null = null;
            let aiMeta: any = null;

            if (journalAiOn) {
                try {
                    const res = await fetch("/api/journal/reflect", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text,
                            nav,
                            selected: selectedInfo,
                            year,
                            appPage,
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        aiReflection = typeof data?.reflection === "string" ? data.reflection : null;
                        aiMeta = data?.metadata ?? null;

                        setJournalAiReflection(aiReflection);
                        setJournalAiMeta(aiMeta);
                    } else {
                        // AI failure should NOT block saving
                        setJournalAiReflection(null);
                        setJournalAiMeta(null);
                    }
                } catch {
                    // AI failure should NOT block saving
                    setJournalAiReflection(null);
                    setJournalAiMeta(null);
                }
            } else {
                // If AI is off, clear the reflection display (so it “goes back to simply recording entries”)
                setJournalAiReflection(null);
                setJournalAiMeta(null);
            }

            // 2) Save journal entry (always)
            const { error } = await supabase.from("journal_entries").insert({
                owner_id: currentUser.id,
                chart_id: activeChartId,
                content: text,
                nav: nav,
                selected: selectedInfo,
                meta: {
                    year,
                    appPage: appPage,
                    ai: journalAiOn
                        ? {
                            enabled: true,
                            reflection: aiReflection,
                            metadata: aiMeta,
                            // versioning so we can evolve prompts safely later
                            v: 1,
                        }
                        : { enabled: false, v: 1 },
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


    // Mandala Search (AI action lane)
    const [mandalaAiOn, setMandalaAiOn] = useState(false);
    const [mandalaQuery, setMandalaQuery] = useState("");
    const [mandalaSearching, setMandalaSearching] = useState(false);
    const [highlightGate, setHighlightGate] = useState<number | null>(null);
    // Mandala search mode (journal box doubles as query input)
    const [mandalaSearchOn, setMandalaSearchOn] = useState(false);


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



    const [charts, setCharts] = useState<ChartRow[]>([]);
    const [chartsLoading, setChartsLoading] = useState(false);
    const [chartsError, setChartsError] = useState<string | null>(null);
    const [activeChartId, setActiveChartId] = useState<string | null>(null);

    // Create flow
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newChartLabel, setNewChartLabel] = useState("New Chart");

    const [createBusy, setCreateBusy] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Birth data inputs for chart generator
    const [birthDate, setBirthDate] = useState("");
    const [birthTime, setBirthTime] = useState("");
    const [birthLocation, setBirthLocation] = useState("");

    // Charts entry box (like Transits composer, but for chart creation)
    const [chartDraft, setChartDraft] = useState("");
    const chartTaRef = useRef<HTMLTextAreaElement | null>(null);

    function parseLooseBirthInput(text: string) {
        const t = text.trim();

        // basic ISO date + 24h time
        const dateMatch = t.match(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
        const timeMatch = t.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);

        const date = dateMatch?.[0] ?? "";
        const time = timeMatch?.[0] ?? "";

        // crude location = remove date/time and compress
        let location = t;
        if (date) location = location.replace(date, "");
        if (time) location = location.replace(time, "");
        location = location.replace(/[,;|]+/g, " ").replace(/\s+/g, " ").trim();

        return { date, time, location };
    }


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
        setChartSource("cloud");
        setActiveChartId(row.id);

        try {
            saveUserChart(row.payload as UserChartPayload);
            const cached = loadUserChart(); // <-- uses the saved+derived version
            if (cached) setUserChart(cached);
        } catch {
            setUserChart(row.payload as UserChartPayload);
        }

        setAppPage("transits");
        setLeftPanelMode("transits");
        setSidebarExpanded(true);
    }


    async function createChartFromGenerator() {
        if (!currentUser?.id) return;

        setCreateBusy(true);
        setCreateError(null);

        try {
            const payload = await generateChartFromInputs({
                label: newChartLabel.trim() || "New Chart",
                date: birthDate,
                time: birthTime,
                location: birthLocation,
            });

            const supabase = supabaseBrowser();
            const { data, error } = await supabase
                .from("charts")
                .insert({
                    owner_id: currentUser.id,
                    label: payload.label,
                    payload,
                })
                .select("id,label,updated_at,payload")
                .single();

            if (error) throw new Error(error.message);

            setIsCreateOpen(false);
            setNewChartLabel("New Chart");

            await refreshChartsList(currentUser.id);
            if (data) applyChart(data as ChartRow);
        } catch (e: any) {
            setCreateError(e?.message ?? "Create failed.");
        } finally {
            setCreateBusy(false);
        }
    }


    useEffect(() => {
        if (!currentUser?.id) return;

        const wantsCharts =
            appPage === "charts" || leftPanelMode === "charts";

        if (!wantsCharts) return;

        void refreshChartsList(currentUser.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appPage, leftPanelMode, currentUser?.id]);




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

    async function deleteChartById(chartId: string) {
        if (!currentUser?.id) return;

        const ok = window.confirm("Delete this chart? This cannot be undone.");
        if (!ok) return;

        const supabase = supabaseBrowser();

        const { error } = await supabase
            .from("charts")
            .delete()
            .eq("id", chartId)
            .eq("owner_id", currentUser.id); // extra safety

        if (error) {
            setChartsError(error.message);
            return;
        }

        // If you deleted the active chart, clear selection in UI
        setChartsError(null);
        setCharts((prev) => prev.filter((c) => c.id !== chartId));

        if (activeChartId === chartId) {
            setActiveChartId(null);
            // optional: also clear currently-loaded chart
            // setUserChart(null);
            // setChartSource(null);
        }
    }



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

                            mandalaAiOn={mandalaAiOn}
                            setMandalaAiOn={setMandalaAiOn}
                            mandalaQuery={mandalaQuery}
                            setMandalaQuery={setMandalaQuery}
                            mandalaSearching={mandalaSearching}
                            setMandalaSearching={setMandalaSearching}
                            highlightGate={highlightGate}
                            setHighlightGate={setHighlightGate}
                            mandalaSearchOn={mandalaSearchOn}
                            setMandalaSearchOn={setMandalaSearchOn}

                            charts={charts}
                            chartsLoading={chartsLoading}
                            chartsError={chartsError}
                            activeChartId={activeChartId}
                            applyChart={applyChart}
                            deleteChartById={deleteChartById}
                            openCreateChart={() => {
                                setAppPage("charts");
                                setLeftPanelMode("charts");
                                setSidebarExpanded(true);
                                setCreateError(null);
                                setIsCreateOpen(true);
                            }}


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
                                highlightGate={highlightGate}

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
                                                    {/* Header */}
                                                    <div className="mt-2 flex items-center justify-between gap-2 px-3">
                                                        <div className="text-[11px] text-white/60">AI reflection</div>

                                                        <button
                                                            onClick={() => setJournalAiOn((v) => !v)}
                                                            className={[
                                                                "h-7 px-3 rounded-lg border text-[12px]",
                                                                journalAiOn
                                                                    ? "bg-white/15 border-white/20 text-white"
                                                                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                                                            ].join(" ")}
                                                            title="Toggle AI assist"
                                                            type="button"
                                                        >
                                                            {journalAiOn ? "On" : "Off"}
                                                        </button>
                                                    </div>

                                                    {/* Reflection */}
                                                    {journalAiOn && journalAiReflection ? (
                                                        <div className="mt-2 mx-3 rounded-xl bg-white/5 border border-white/10 p-2">
                                                            <div className="text-[11px] text-white/50 mb-1">Reflection</div>
                                                            <div className="text-xs text-white/80 whitespace-pre-wrap">
                                                                {journalAiReflection}
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {/* ===== Entry Field Shell (electric outline lives HERE) ===== */}
                                                    <div className="relative mt-2 mx-2 mb-2 rounded-2xl overflow-hidden">
                                                        {mandalaSearchOn ? (
                                                            <div className="pointer-events-none absolute inset-0 rounded-2xl">

                                                                <div className="absolute inset-[1px] rounded-2xl border-2 border-cyan-300/90" />
                                                            </div>
                                                        ) : null}

                                                        {/* Input surface */}
                                                        <div className="relative rounded-2xl border border-white/10 bg-black/20">
                                                            <textarea
                                                                ref={journalTaRef}
                                                                value={journalDraft}
                                                                onChange={(e) => setJournalDraft(e.target.value)}
                                                                placeholder={
                                                                    mandalaSearchOn
                                                                        ? 'Search mandala… e.g. "gate 55"'
                                                                        : "Write a journal entry..."
                                                                }
                                                                className="w-full resize-none rounded-2xl bg-transparent px-4 py-2.5 pr-12 text-sm text-white placeholder:text-white/35 outline-none"
                                                                style={{ minHeight: JOURNAL_MIN_H, maxHeight: JOURNAL_MAX_H }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        if (mandalaSearchOn) void searchMandalaFromJournal();
                                                                        else void sendJournalEntry();
                                                                    }
                                                                }}
                                                            />

                                                            <button
                                                                onClick={() => {
                                                                    if (mandalaSearchOn) void searchMandalaFromJournal();
                                                                    else void sendJournalEntry();
                                                                }}
                                                                disabled={journalSending || mandalaSearching || !journalDraft.trim()}
                                                                className="absolute right-2 bottom-2 h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 disabled:opacity-40 disabled:hover:bg-white/10 flex items-center justify-center"
                                                                aria-label={mandalaSearchOn ? "Search mandala" : "Send entry"}
                                                                title={mandalaSearchOn ? "Search" : "Send"}
                                                                type="button"
                                                            >
                                                                <span className="text-white/90 text-base">➤</span>
                                                            </button>
                                                        </div>
                                                    </div>
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
                        <div className="pt-6 pb-12 flex flex-col items-center">
                            {/* Chart visual */}
                            <div className="w-[860px] max-w-[calc(100vw-2rem)]">
                                <UserChartVisual userChart={userChart} />
                            </div>

                            {/* Entry box (create chart) */}
                            <div className="mt-8 w-[660px] max-w-[calc(100vw-2rem)]">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-semibold text-white/90">Chart entry</div>

                                    <button
                                        className="rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 text-xs disabled:opacity-opacity-50"
                                        onClick={() => {
                                            setCreateError(null);
                                            setIsCreateOpen((v) => !v);
                                        }}
                                        disabled={!currentUser}
                                        title={!currentUser ? "Sign in to create charts" : "Create a new chart"}
                                        type="button"
                                    >
                                        {isCreateOpen ? "Close" : "Create"}
                                    </button>
                                </div>

                                {!currentUser ? (
                                    <div className="text-xs text-white/60">
                                        Sign in to create charts.
                                    </div>
                                ) : null}

                                {isCreateOpen && currentUser ? (
                                    <div className="rounded-3xl border border-white/12 bg-black/70 backdrop-blur-md shadow-lg p-4">
                                        {/* guided inputs ABOVE textarea */}
                                        <label className="block text-xs text-white/60 mb-1">Chart name</label>
                                        <input
                                            value={newChartLabel}
                                            onChange={(e) => setNewChartLabel(e.target.value)}
                                            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white mb-3"
                                        />

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-white/60 mb-1">Birth date</label>
                                                <input
                                                    type="date"
                                                    value={birthDate}
                                                    onChange={(e) => setBirthDate(e.target.value)}
                                                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs text-white/60 mb-1">Birth time</label>
                                                <input
                                                    type="time"
                                                    value={birthTime}
                                                    onChange={(e) => setBirthTime(e.target.value)}
                                                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <label className="block text-xs text-white/60 mb-1">Location (optional)</label>
                                            <input
                                                value={birthLocation}
                                                onChange={(e) => setBirthLocation(e.target.value)}
                                                placeholder="Boston, MA, USA"
                                                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                                            />
                                        </div>

                                        <textarea
                                            ref={chartTaRef}
                                            value={chartDraft}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setChartDraft(v);

                                                // loose parse to prefill fields when empty
                                                const parsed = parseLooseBirthInput(v);
                                                if (!birthDate && parsed.date) setBirthDate(parsed.date);
                                                if (!birthTime && parsed.time) setBirthTime(parsed.time);
                                                if (!birthLocation && parsed.location) setBirthLocation(parsed.location);
                                            }}
                                            placeholder='Type naturally… e.g. "1998-03-05 15:08 Boston"'
                                            className="mt-3 w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none border border-white/10"
                                            rows={5}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    void createChartFromGenerator();
                                                }
                                            }}
                                        />

                                        {createError ? <div className="text-sm text-red-300 mt-2">{createError}</div> : null}

                                        <div className="mt-3 flex gap-2">
                                            <button
                                                className="rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-sm disabled:opacity-50"
                                                onClick={() => void createChartFromGenerator()}
                                                disabled={createBusy || !birthDate || !birthTime}
                                                type="button"
                                            >
                                                {createBusy ? "Creating..." : "Create chart"}
                                            </button>

                                            <button
                                                className="rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm text-white/70"
                                                onClick={() => setIsCreateOpen(false)}
                                                disabled={createBusy}
                                                type="button"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
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
                                mode={appPage === "charts" ? "charts" : "transits"}
                                hovered={hoverInfo}
                                selected={selectedInfo}
                                clearSelected={() => setSelectedInfo(null)}
                                userChart={userChart}
                                activeChartLabel={charts.find((c) => c.id === activeChartId)?.label ?? null}
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

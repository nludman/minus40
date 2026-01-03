"use client";

import ControlPanel from "@/components/mandala/ControlPanel";

import type { HoverInfo } from "@/lib/mandala/constants";
import type { UserChartPayload } from "@/lib/userChartCache";
import type { RingInstance } from "@/lib/mandala/rings/types";
import type { LeftPanelMode, ChartRow } from "@/components/shell/types";

import { ringPalette } from "@/lib/mandala/rings/registry";


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

    resetYearCache?: () => void;
    resetUserCache?: () => void;

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

    devToolsOn?: boolean;

    onOpenChartJsonPaste?: () => void;


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

        devToolsOn,

        onOpenChartJsonPaste,


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
                        devToolsOn={!!devToolsOn}


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
                        devToolsOn={!!devToolsOn}


                    />


                </>
            ) : panelMode === "settings" ? (
                <>
                    <div className="text-s text-white/60 px-2 pb-2">Settings</div>

                    <div className="px-2 space-y-2">
                        <button
                            type="button"
                            onClick={() => onOpenChartJsonPaste?.()}
                            className="w-full text-left rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2"
                        >
                            <div className="text-sm">Paste Chart JSON</div>
                            <div className="text-xs text-white/50">Import a chart payload directly</div>
                        </button>

                        {/* add more settings actions later */}
                    </div>

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

export default LeftExpandedPanel;

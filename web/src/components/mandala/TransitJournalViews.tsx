// PATH: src/components/mandala/TransitJournalViews.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { HoverInfo } from "@/lib/mandala/constants";
import { loadTransitJournal, type TransitJournalEntry } from "@/lib/transitJournalCache";

type Props = {
    reloadKey: number;
    selected?: HoverInfo | null;
    variant?: "floating" | "embedded";
};

function fmtLocal(iso: string) {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export default function TransitJournalViews({ reloadKey, variant = "floating" }: Props) {
    const [tab, setTab] = useState<"journal" | "tracker">("journal");
    const [entries, setEntries] = useState<TransitJournalEntry[]>([]);
    const [page, setPage] = useState(0);

    useEffect(() => {
        setEntries(loadTransitJournal());
        setPage(0);
    }, [reloadKey]);

    const pageCount = useMemo(() => Math.max(1, entries.length), [entries.length]);
    const active = entries[page] ?? null;

    const isEmbedded = variant === "embedded";

    return (
        <div
            className={
                isEmbedded
                    ? "w-full max-w-[860px]"
                    : "fixed bottom-4 left-4 z-40 w-[560px] max-w-[calc(100vw-2rem)]"
            }
        >

            <div className="rounded-2xl bg-black/50 backdrop-blur border border-white/10 shadow-xl overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                    <button
                        onClick={() => setTab("journal")}
                        className={[
                            "h-8 rounded-xl px-3 text-xs",
                            tab === "journal" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
                        ].join(" ")}
                    >
                        My Journal
                    </button>
                    <button
                        onClick={() => setTab("tracker")}
                        className={[
                            "h-8 rounded-xl px-3 text-xs",
                            tab === "tracker" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
                        ].join(" ")}
                    >
                        Pattern Tracker
                    </button>

                    <div className="ml-auto text-[11px] text-white/60">
                        {entries.length ? `${entries.length} entr${entries.length === 1 ? "y" : "ies"}` : "No entries yet"}
                    </div>
                </div>

                {/* My Journal */}
                {tab === "journal" ? (
                    <div className="p-3">
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 min-h-[220px]">
                            {!active ? (
                                <div className="text-sm text-white/60">
                                    No entries yet. Use the Journal Entry tab in the bottom-right panel.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-xs text-white/60">Timestamp</div>
                                            <div className="text-sm font-semibold text-white/90">{fmtLocal(active.createdAtIso)}</div>
                                        </div>

                                        {active.selected ? (
                                            <div className="text-right">
                                                <div className="text-xs text-white/60">Captured segment</div>
                                                <div className="text-sm font-semibold text-white/90">
                                                    {active.selected.planet} — Gate {active.selected.gate}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-right text-xs text-white/40">No segment captured</div>
                                        )}
                                    </div>

                                    <div className="h-px bg-white/10" />

                                    {/* “Paper” vibe */}
                                    <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                                        <div className="text-[13px] leading-relaxed text-white/90 whitespace-pre-wrap">
                                            {active.text}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Page controls */}
                        <div className="mt-3 flex items-center justify-between">
                            <button
                                onClick={() => setPage((p) => Math.min(entries.length - 1, p + 1))}
                                disabled={page >= entries.length - 1}
                                className="h-9 rounded-xl px-3 text-sm bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
                            >
                                Older
                            </button>
                            <div className="text-xs text-white/60 tabular-nums">
                                {entries.length ? `Page ${page + 1} / ${pageCount}` : "Page 0 / 0"}
                            </div>
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page <= 0}
                                className="h-9 rounded-xl px-3 text-sm bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
                            >
                                Newer
                            </button>
                        </div>
                    </div>
                ) : null}

                {/* Pattern Tracker */}
                {tab === "tracker" ? (
                    <div className="p-3">
                        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                            <div className="grid grid-cols-[160px_140px_1fr] text-[11px] bg-white/5 border-b border-white/10">
                                <div className="px-3 py-2 text-white/70">Timestamp</div>
                                <div className="px-3 py-2 text-white/70">Segment</div>
                                <div className="px-3 py-2 text-white/70">Text</div>
                            </div>

                            <div className="max-h-[260px] overflow-auto">
                                {entries.length === 0 ? (
                                    <div className="p-3 text-sm text-white/60">No rows yet.</div>
                                ) : (
                                    entries.map((e) => (
                                        <div
                                            key={e.id}
                                            className="grid grid-cols-[160px_140px_1fr] text-[12px] border-b border-white/5"
                                        >
                                            <div className="px-3 py-2 text-white/70 tabular-nums">{fmtLocal(e.createdAtIso)}</div>
                                            <div className="px-3 py-2 text-white/80">
                                                {e.selected ? `${e.selected.planet} · ${e.selected.gate}` : "—"}
                                            </div>
                                            <div className="px-3 py-2 text-white/80 truncate" title={e.text}>
                                                {e.text}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="mt-2 text-[11px] text-white/50">
                            (Later: expand columns for raw transit data + keyword tagging.)
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

"use client";

import { useLayoutEffect, useRef, useState } from "react";

export type BoxMode = "reflect" | "search" | "chart";

type Props = {
    // master AI toggle (controls reflect/search/chart when applicable)
    aiOn: boolean;
    setAiOn: (next: boolean | ((prev: boolean) => boolean)) => void;

    // which function is active
    boxMode: BoxMode;
    setBoxMode: (mode: BoxMode) => void;

    // submit handler (HomeClient decides what happens)
    onSubmit: (text: string) => Promise<void>;

    // optional "reflection" UI (HomeClient can set these)
    reflection?: string | null;

    // optional chart inputs (shown when boxMode === "chart")
    newChartLabel?: string;
    setNewChartLabel?: (s: string) => void;
    birthDate?: string;
    setBirthDate?: (s: string) => void;
    birthTime?: string;
    setBirthTime?: (s: string) => void;
    birthLocation?: string;
    setBirthLocation?: (s: string) => void;

    busy?: boolean;
    error?: string | null;
    onClearError?: () => void;
};

export default function AiActionBox({
    aiOn,
    setAiOn,
    boxMode,
    setBoxMode,
    onSubmit,
    reflection,

    newChartLabel,
    setNewChartLabel,
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    birthLocation,
    setBirthLocation,

    busy,
    error,
    onClearError,
}: Props) {
    const [draft, setDraft] = useState("");

    // DOM measurements for mask
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [boxH, setBoxH] = useState(0);
    const taRef = useRef<HTMLTextAreaElement | null>(null);

    // matches sticky bottom offset (bottom-12 = 48px)
    const BOTTOM_OFFSET_PX = 48;
    const MIN_H = 56;
    const MAX_H = 220;

    useLayoutEffect(() => {
        const el = taRef.current;
        if (!el) return;

        el.style.height = "0px";
        const next = Math.max(MIN_H, Math.min(MAX_H, el.scrollHeight));
        el.style.height = `${next}px`;
    }, [draft]);

    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const h = Math.ceil(box.getBoundingClientRect().height);
        setBoxH(h);
    }, [draft, busy, aiOn, reflection, error, boxMode]);

    const placeholder =
        boxMode === "search"
            ? 'Search mandala… e.g. "gate 55"'
            : boxMode === "chart"
                ? 'Create a chart… e.g. "1998-03-05 15:08 Boston"'
                : "Write a journal entry...";

    const ariaLabel =
        boxMode === "search" ? "Search mandala" : boxMode === "chart" ? "Create chart" : "Send entry";

    const showElectricOutline = boxMode !== "reflect"; // search + chart are “command modes”

    async function submit() {
        const text = draft.trim();
        if (!text || busy) return;
        onClearError?.();
        await onSubmit(text);
        setDraft(""); // default UX: clear after submit
    }

    const showReflection = boxMode === "reflect" && aiOn && !!reflection;

    const canShowChartFields =
        boxMode === "chart" &&
        typeof setNewChartLabel === "function" &&
        typeof setBirthDate === "function" &&
        typeof setBirthTime === "function" &&
        typeof setBirthLocation === "function";

    return (
        <>
            {/* Mask */}
            <div className="sticky bottom-0 h-0 w-full pointer-events-none z-20">
                <div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                        height: boxH + BOTTOM_OFFSET_PX,
                        background: "var(--journalMaskColor)",
                    }}
                />
                <div
                    className="absolute inset-x-0"
                    style={{
                        bottom: boxH + BOTTOM_OFFSET_PX,
                        height: 32,
                        background: "linear-gradient(to bottom, transparent, var(--journalMaskColor))",
                    }}
                />
            </div>

            {/* Box */}
            <div className="sticky bottom-0 h-0 w-full pointer-events-none z-30">
                <div className="absolute inset-x-0 bottom-12 flex justify-center pointer-events-none">
                    <div className="w-[660px] max-w-[calc(100vw-2rem)] pointer-events-auto">
                        <div
                            ref={boxRef}
                            className="relative rounded-3xl border border-white/12 bg-black/70 backdrop-blur-md shadow-lg"
                        >
                            {/* Header */}
                            <div className="mt-2 flex items-center justify-between gap-2 px-3">
                                {/* Left: master AI toggle */}
                                <div className="flex items-center gap-2">
                                    <div className="text-[11px] text-white/60">AI</div>
                                    <button
                                        onClick={() => setAiOn((v) => !v)}
                                        className={[
                                            "h-7 px-3 rounded-lg border text-[12px]",
                                            aiOn
                                                ? "bg-white/15 border-white/20 text-white"
                                                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10",
                                        ].join(" ")}
                                        type="button"
                                        title="Master AI toggle"
                                    >
                                        {aiOn ? "On" : "Off"}
                                    </button>
                                </div>

                                {/* Right: mode toggles */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setBoxMode("reflect")}
                                        className={[
                                            "h-7 px-3 rounded-lg border text-[12px]",
                                            boxMode === "reflect"
                                                ? "bg-white/15 border-white/20 text-white"
                                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                                        ].join(" ")}
                                        type="button"
                                    >
                                        Reflection
                                    </button>

                                    <button
                                        onClick={() => setBoxMode("search")}
                                        className={[
                                            "h-7 px-3 rounded-lg border text-[12px]",
                                            boxMode === "search"
                                                ? "bg-white/15 border-white/20 text-white"
                                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                                        ].join(" ")}
                                        type="button"
                                    >
                                        Search
                                    </button>

                                    <button
                                        onClick={() => setBoxMode("chart")}
                                        className={[
                                            "h-7 px-3 rounded-lg border text-[12px]",
                                            boxMode === "chart"
                                                ? "bg-white/15 border-white/20 text-white"
                                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                                        ].join(" ")}
                                        type="button"
                                    >
                                        Chart
                                    </button>
                                </div>
                            </div>

                            {/* Reflection panel */}
                            {showReflection ? (
                                <div className="mt-2 mx-3 rounded-xl bg-white/5 border border-white/10 p-2">
                                    <div className="text-[11px] text-white/50 mb-1">Reflection</div>
                                    <div className="text-xs text-white/80 whitespace-pre-wrap">{reflection}</div>
                                </div>
                            ) : null}

                            {/* Chart inputs (shown in Chart mode) */}
                            {canShowChartFields ? (
                                <div className="mt-2 mx-3 rounded-xl bg-white/5 border border-white/10 p-3">
                                    <div className="text-[11px] text-white/50 mb-2">Create chart</div>

                                    <label className="block text-xs text-white/60 mb-1">Chart name</label>
                                    <input
                                        value={newChartLabel ?? ""}
                                        onChange={(e) => setNewChartLabel?.(e.target.value)}
                                        className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white mb-3"
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-white/60 mb-1">Birth date</label>
                                            <input
                                                type="date"
                                                value={birthDate ?? ""}
                                                onChange={(e) => setBirthDate?.(e.target.value)}
                                                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-white/60 mb-1">Birth time</label>
                                            <input
                                                type="time"
                                                value={birthTime ?? ""}
                                                onChange={(e) => setBirthTime?.(e.target.value)}
                                                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="block text-xs text-white/60 mb-1">Location (optional)</label>
                                        <input
                                            value={birthLocation ?? ""}
                                            onChange={(e) => setBirthLocation?.(e.target.value)}
                                            placeholder="Boston, MA, USA"
                                            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {/* Input shell */}
                            <div className="relative mt-2 mx-2 mb-2 rounded-2xl overflow-hidden">
                                {showElectricOutline ? (
                                    <div className="pointer-events-none absolute inset-0 rounded-2xl">
                                        <div className="absolute inset-[1px] rounded-2xl border-2 border-cyan-300/90" />
                                    </div>
                                ) : null}

                                <div className="relative rounded-2xl border border-white/10 bg-black/20">
                                    <textarea
                                        ref={taRef}
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full resize-none rounded-2xl bg-transparent px-4 py-2.5 pr-12 text-sm text-white placeholder:text-white/35 outline-none"
                                        style={{ minHeight: MIN_H, maxHeight: MAX_H }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                void submit();
                                            }
                                        }}
                                    />

                                    <button
                                        onClick={() => void submit()}
                                        disabled={busy || !draft.trim()}
                                        className="absolute right-2 bottom-2 h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 disabled:opacity-40 disabled:hover:bg-white/10 flex items-center justify-center"
                                        aria-label={ariaLabel}
                                        title={ariaLabel}
                                        type="button"
                                    >
                                        <span className="text-white/90 text-base">➤</span>
                                    </button>
                                </div>

                                {error ? <div className="px-3 pb-2 text-sm text-red-300">{error}</div> : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

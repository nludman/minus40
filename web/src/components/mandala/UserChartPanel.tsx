// PATH: src/components/mandala/UserChartPanel.tsx
"use client";

import { useState } from "react";
import type { UserChartPayload } from "@/lib/userChartCache";
import { generateBirthDataSkeleton, generateTestChart } from "@/lib/chartGenerator";


import type { HoverInfo } from "@/lib/mandala/constants";
import { addTransitJournalEntry } from "@/lib/transitJournalCache";

type Props = {
    userChart: UserChartPayload | null;
    onUserChartUploaded: (payload: UserChartPayload) => void;
    onResetUserCache: () => void;
    isOpen: boolean;
    onToggleOpen: () => void;

    // NEW
    year: number;
    selected?: HoverInfo | null;
    onJournalSaved?: () => void;
};


export default function UserChartPanel({
    userChart,
    onUserChartUploaded,
    onResetUserCache,
    isOpen,
    onToggleOpen,

    // NEW
    year,
    selected,
    onJournalSaved,
}: Props) {

    const [chartJsonText, setChartJsonText] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [genLabel, setGenLabel] = useState("my-chart");
    const [birthDate, setBirthDate] = useState("1998-03-05");
    const [birthTime, setBirthTime] = useState("15:08");
    const [birthLocation, setBirthLocation] = useState("Boston, MA, USA");

    const [tab, setTab] = useState<"chart" | "journal">("chart");

    const [journalText, setJournalText] = useState("");
    const [journalMsg, setJournalMsg] = useState<string | null>(null);



    const handleChartText = (label: string, text: string, source: "upload" | "paste") => {
        setChartJsonText(text);
        setError(null);
        try {
            const data = JSON.parse(text);
            onUserChartUploaded({
                version: 1,
                label,
                source,
                data,
            });
        } catch (e) {
            setError("Invalid JSON. Paste/upload a valid .json file.");
            console.warn(e);
        }
    };

    const handleFile = async (file: File) => {
        const text = await file.text();
        handleChartText(file.name, text, "upload");
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
            <div className="rounded-2xl bg-black/50 backdrop-blur border border-white/10 shadow-xl overflow-hidden">
                <button
                    onClick={onToggleOpen}
                    className="w-full px-3 py-2 flex items-center justify-between text-left"
                    title="Toggle user chart panel"
                >
                    <div>
                        <div className="text-sm font-semibold tracking-wide">Bottom-right panel</div>
                        <div className="text-xs text-white/60">
                            {userChart ? `Loaded: ${userChart.label ?? "chart"} (v${userChart.version})` : "No chart loaded yet."}
                        </div>
                    </div>
                    <div className="text-white/70 text-xs">{isOpen ? "Hide" : "Show"}</div>
                </button>

                {isOpen ? (
                    <div className="px-3 pb-3">

                        <div className="mt-2 flex gap-2">
                            <button
                                onClick={() => setTab("chart")}
                                className={[
                                    "h-9 flex-1 rounded-xl text-sm",
                                    tab === "chart" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
                                ].join(" ")}
                            >
                                Chart generator
                            </button>

                            <button
                                onClick={() => setTab("journal")}
                                className={[
                                    "h-9 flex-1 rounded-xl text-sm",
                                    tab === "journal" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20",
                                ].join(" ")}
                            >
                                Journal entry
                            </button>
                        </div>

                        {tab === "journal" ? (
                            <div className="mt-3 rounded-xl bg-white/5 p-2">
                                <div className="text-xs text-white/70 mb-2">Transit Journal</div>

                                <div className="text-[11px] text-white/60 mb-2">
                                    Captures timestamp + current selected segment (if any).
                                </div>

                                <textarea
                                    value={journalText}
                                    onChange={(e) => {
                                        setJournalText(e.target.value);
                                        setJournalMsg(null);
                                    }}
                                    className="w-full h-32 rounded-xl bg-black/30 text-white/80 text-xs p-2 outline-none"
                                    placeholder="Write your reflection..."
                                />

                                <button
                                    onClick={() => {
                                        const text = journalText.trim();
                                        if (!text) {
                                            setJournalMsg("Write something first.");
                                            return;
                                        }

                                        addTransitJournalEntry({
                                            text,
                                            year,
                                            selected: selected ?? null,
                                        });

                                        setJournalText("");
                                        setJournalMsg("Saved to My Journal + Pattern Tracker.");
                                        onJournalSaved?.();
                                    }}
                                    className="mt-2 h-9 w-full rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
                                >
                                    Save entry
                                </button>

                                {journalMsg ? <div className="mt-2 text-xs text-white/70">{journalMsg}</div> : null}

                                <div className="mt-2 text-[11px] text-white/40">
                                    (Next: keywords + multi-segment focus + full transit snapshot)
                                </div>
                            </div>
                        ) : null}


                        {tab === "chart" ? (
                            <>

                                <div className="mt-2 flex gap-2">
                                    <button
                                        onClick={onResetUserCache}
                                        className="h-9 flex-1 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
                                        title="Clears local user chart cache"
                                    >
                                        Reset user cache
                                    </button>
                                    <button
                                        onClick={() => {
                                            setChartJsonText("");
                                            setError(null);
                                        }}
                                        className="h-9 flex-1 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
                                        title="Clears the paste box"
                                    >
                                        Clear box
                                    </button>
                                </div>

                                <div className="mt-3 rounded-xl bg-white/5 p-2">
                                    <div className="text-xs text-white/70 mb-2">Chart generator</div>

                                    <label className="block text-xs text-white/60 mb-1">Label</label>
                                    <input
                                        value={genLabel}
                                        onChange={(e) => setGenLabel(e.target.value)}
                                        className="w-full h-9 rounded-xl bg-black/30 text-white/80 text-xs px-3 outline-none"
                                        placeholder="my-chart"
                                    />

                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => onUserChartUploaded(generateTestChart(genLabel || "test-chart"))}
                                            className="h-9 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
                                            title="Generates a fake chart payload for testing UI + caching"
                                        >
                                            Generate test chart
                                        </button>

                                        <button
                                            onClick={async () => {
                                                try {
                                                    // Interpret the date+time as LOCAL time (browser), then convert to UTC ISO
                                                    const local = new Date(`${birthDate}T${birthTime}:00`);
                                                    const birth_utc = local.toISOString(); // UTC

                                                    const res = await fetch("/api/user-chart", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ birth_utc }),
                                                    });

                                                    if (!res.ok) {
                                                        const msg = await res.text();
                                                        throw new Error(msg);
                                                    }

                                                    const computed = await res.json();

                                                    onUserChartUploaded({
                                                        version: 1,
                                                        label: genLabel || "my-chart",
                                                        source: "generator",
                                                        data: computed,
                                                    });
                                                } catch (e) {
                                                    setError("Compute failed. Check server console + python script path.");
                                                    console.warn(e);
                                                }
                                            }}

                                            className="h-9 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
                                            title="Stores birth data skeleton for future real computation"
                                        >
                                            Save birth data
                                        </button>
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs text-white/60 mb-1">Birth date</label>
                                            <input
                                                type="date"
                                                value={birthDate}
                                                onChange={(e) => setBirthDate(e.target.value)}
                                                className="w-full h-9 rounded-xl bg-black/30 text-white/80 text-xs px-3 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/60 mb-1">Birth time</label>
                                            <input
                                                type="time"
                                                value={birthTime}
                                                onChange={(e) => setBirthTime(e.target.value)}
                                                className="w-full h-9 rounded-xl bg-black/30 text-white/80 text-xs px-3 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <label className="block text-xs text-white/60 mb-1">Location</label>
                                        <input
                                            value={birthLocation}
                                            onChange={(e) => setBirthLocation(e.target.value)}
                                            className="w-full h-9 rounded-xl bg-black/30 text-white/80 text-xs px-3 outline-none"
                                            placeholder="Boston, MA, USA"
                                        />
                                    </div>
                                </div>


                                <div className="mt-3">
                                    <label className="block text-xs text-white/60 mb-1">Upload JSON</label>
                                    <input
                                        type="file"
                                        accept=".json,application/json"
                                        className="block w-full text-xs text-white/70"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) void handleFile(f);
                                        }}
                                    />
                                </div>

                                <div className="mt-3">
                                    <label className="block text-xs text-white/60 mb-1">Or paste JSON</label>
                                    <textarea
                                        value={chartJsonText}
                                        onChange={(e) => setChartJsonText(e.target.value)}
                                        className="w-full h-28 rounded-xl bg-black/30 text-white/80 text-xs p-2 outline-none"
                                        placeholder='{"your":"chart json"}'
                                    />
                                    <button
                                        onClick={() => handleChartText("pasted-json", chartJsonText, "paste")}
                                        className="mt-2 h-9 w-full rounded-xl text-sm bg-white/10 text-white hover:bg-white/20"
                                    >
                                        Load pasted chart
                                    </button>

                                    {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
                                </div>
                            </>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

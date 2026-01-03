"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MandalaController, MandalaSvg } from "@/components/mandala";
import type { HoverInfo } from "@/lib/mandala/constants";

import UserChartVisual from "@/components/charts/UserChartVisual";
import { generateChartFromInputs } from "@/lib/chartGenerator";
import {
    clearUserChart,
    loadUserChart,
    saveUserChart,
    type UserChartPayload,
} from "@/lib/userChartCache";

import TransitJournalViews from "@/components/journal/TransitJournalViews";

import type { RingInstance } from "@/lib/mandala/rings/types";
import TrackerMandalaSvg from "@/components/mandala/TrackerMandalaSvg";
import TrackerMandalaClient from "@/components/mandala/TrackerMandalaClient";
import { expandModule } from "@/lib/mandala/rings/expand";
import { getRingModule } from "@/lib/mandala/rings/registry";

import { supabaseBrowser } from "@/lib/supabase/browser";

import type { AppPage, LeftPanelMode, ChartRow } from "@/components/shell/types";
import AppSidebar from "@/components/shell/AppSidebar";
import LeftExpandedPanel from "@/components/shell/LeftExpandedPanel";
import RightSidebar from "@/components/shell/RightSidebar";

import { useRightSidebarResize } from "@/components/shell/hooks/useRightSidebarResize";
import { useMandalaNav } from "@/components/shell/hooks/useMandalaNav";
import type { NavState } from "@/components/shell/hooks/useMandalaNav";
import { useMandalaSession } from "@/components/shell/hooks/useMandalaSession";

import AiActionBox from "@/components/ai/AiActionBox";

import { isDevToolsEnabled } from "@/components/shell/devTools";

export default function Home() {
    // =========================
    // Right sidebar resize
    // =========================
    const RIGHT_SLIVER = 14;
    const RIGHT_MIN_OPEN = 280;
    const RIGHT_MAX = 520;
    const RIGHT_SNAP_CLOSE_AT = 140;
    const RIGHT_RENDER_MIN = 220;
    const RIGHT_OPEN_DRAG_DELTA = 24;

    const {
        rightW,
        isRightSidebarOpen,
        setIsRightSidebarOpen,
        rightIsDragging,
        startRightResize,
    } = useRightSidebarResize({
        sliver: RIGHT_SLIVER,
        minOpen: RIGHT_MIN_OPEN,
        max: RIGHT_MAX,
        snapCloseAt: RIGHT_SNAP_CLOSE_AT,
        openDragDelta: RIGHT_OPEN_DRAG_DELTA,
    });

    // =========================
    // URL nav (year + view/span/m)
    // =========================
    const router = useRouter();
    const searchParams = useSearchParams();

    const { year, nav, pushNav, handleNavigate, commitYear, commitNav, setNav, setYear } =
        useMandalaNav(router, searchParams);

    // =========================
    // App shell state
    // =========================
    const [appPage, setAppPage] = useState<AppPage>("transits");
    const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>("transits");
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [leftW] = useState(340);
    const [journalReloadKey, setJournalReloadKey] = useState(0);

    // =========================
    // Hover / select (declare EARLY so functions can reference safely)
    // =========================
    const [hoverInfo, setHoverInfo] = useState<HoverInfo>(null);
    const [selectedInfo, setSelectedInfo] = useState<HoverInfo>(null);

    // =========================
    // AI Action Box (central surface)
    // =========================
    const [aiOn, setAiOn] = useState(true); // master AI switch
    const [boxMode, setBoxMode] = useState<"reflect" | "search" | "chart">("reflect");
    const [boxBusy, setBoxBusy] = useState(false);
    const [boxError, setBoxError] = useState<string | null>(null);

    // Reflection UI (result from /api/journal/reflect)
    const [journalAiReflection, setJournalAiReflection] = useState<string | null>(null);
    const [journalAiMeta, setJournalAiMeta] = useState<any>(null);

    // Mandala search result
    const [mandalaSearching, setMandalaSearching] = useState(false);
    const [highlightGate, setHighlightGate] = useState<number | null>(null);

    // Journal sending state (so the box can disable submit)
    const [journalSending, setJournalSending] = useState(false);
    const [journalError, setJournalError] = useState<string | null>(null);

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

    const [ringLayout, setRingLayout] =
        useState<import("@/lib/mandala/ringLayout").RingLayoutKnobs>({
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

    // =========================
    // Session (localStorage)
    // =========================
    const SESSION_KEY = "mandala.session.v1";
    const hasUrlNav =
        searchParams.has("y") ||
        searchParams.has("view") ||
        searchParams.has("span") ||
        searchParams.has("m");

    useMandalaSession({
        key: SESSION_KEY,
        hasUrlNav,
        year,
        nav,
        visiblePlanets,
        arcCap,
        gapPxRound,
        gapPxButt,
        showCalendar,
        ringLayout,
        sidebarExpanded,
        setSidebarExpanded,
        setArcCap,
        setGapPxRound,
        setGapPxButt,
        setShowCalendar,
        setRingLayout,
        setVisiblePlanets,
        setYear,
        setNav,
        commitNav,
    });

    // ===== Dev tools =====
    const devToolsOn = isDevToolsEnabled(searchParams);
    const resetYearCacheDev = useCallback(() => {
        setYearReloadMode("reset");
        setYearReloadKey((k) => k + 1);
    }, []);
    const resetUserCacheDev = useCallback(() => {
        try {
            clearUserChart();
        } catch { }
        setUserChart(null);
        setUserReloadKey((k) => k + 1);
    }, []);

    // =========================
    // Trackers: ring stack
    // =========================
    const [trackerRings, setTrackerRings] = useState<RingInstance[]>([]);
    const [trackerFocusId, setTrackerFocusId] = useState<string | null>(null);

    const addTrackerRing = (
        moduleId: string,
        opts?: { parentInstanceId?: string | null; insertBeforeInstanceId?: string }
    ) => {
        setTrackerRings((prev) => {
            const mod = getRingModule(moduleId);
            const instanceId = `${moduleId}::${crypto.randomUUID()}`;

            const nextInst: RingInstance = {
                instanceId,
                moduleId,
                label: mod?.label ?? moduleId,
                parentInstanceId: opts?.parentInstanceId ?? null,
            };

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

            const nextInst: RingInstance = {
                instanceId,
                moduleId,
                label: mod?.label ?? moduleId,
                parentInstanceId: opts?.parentInstanceId ?? null,
            };

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
    }

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

    const removeTrackerRing = (instanceId: string) => {
        setTrackerRings((prev) => prev.filter((r) => r.instanceId !== instanceId));
    };

    // =========================
    // Auth + Charts DB state
    // =========================
    const [chartSource, setChartSource] = useState<"cloud" | "local" | null>(null);

    const [authEmail, setAuthEmail] = useState("");
    const [authMsg, setAuthMsg] = useState<string | null>(null);

    const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null);

    // charts list
    const [charts, setCharts] = useState<ChartRow[]>([]);
    const [chartsLoading, setChartsLoading] = useState(false);
    const [chartsError, setChartsError] = useState<string | null>(null);
    const [activeChartId, setActiveChartId] = useState<string | null>(null);

    // chart create fields (used by both charts page + AI box chart mode)
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newChartLabel, setNewChartLabel] = useState("New Chart");
    const [createBusy, setCreateBusy] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [birthDate, setBirthDate] = useState("");
    const [birthTime, setBirthTime] = useState("");
    const [birthLocation, setBirthLocation] = useState("");

    // JSON paste modal
    const [chartJsonPasteOpen, setChartJsonPasteOpen] = useState(false);
    const [chartJsonDraft, setChartJsonDraft] = useState("");
    const [chartJsonError, setChartJsonError] = useState<string | null>(null);

    // --- auth helpers ---
    const sendMagicLink = async () => {
        setAuthMsg(null);
        const email = authEmail.trim();
        if (!email) return;

        const supabase = supabaseBrowser();
        const origin = window.location.origin;

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${origin}/auth/callback` },
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
            const cached = loadUserChart();
            if (cached) setUserChart(cached);
        } catch {
            setUserChart(row.payload as UserChartPayload);
        }

        setAppPage("transits");
        setLeftPanelMode("transits");
        setSidebarExpanded(true);
    }

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
        const { error } = await supabase.from("charts").upsert({ owner_id: userId, label, payload }, {});
        if (error) console.warn("saveChartForUser failed:", error.message);
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

    const onUserChartUploaded = (payload: UserChartPayload) => {
        saveUserChart(payload);
        setUserChart(payload);
        setUserReloadKey((k) => k + 1);

        if (currentUser?.id) {
            setChartSource("cloud");
            void saveChartForUser(currentUser.id, payload, "Me");
        } else {
            setChartSource("local");
        }
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
            .eq("owner_id", currentUser.id);

        if (error) {
            setChartsError(error.message);
            return;
        }

        setChartsError(null);
        setCharts((prev) => prev.filter((c) => c.id !== chartId));

        if (activeChartId === chartId) setActiveChartId(null);
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
                .insert({ owner_id: currentUser.id, label: payload.label, payload })
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

    function importChartFromJsonPaste() {
        setChartJsonError(null);
        const raw = chartJsonDraft.trim();
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            onUserChartUploaded(parsed);
            setChartJsonPasteOpen(false);
            setChartJsonDraft("");
        } catch (e: any) {
            setChartJsonError(e?.message ?? "Invalid JSON.");
        }
    }

    // load charts list when opening charts contexts
    useEffect(() => {
        if (!currentUser?.id) return;
        const wantsCharts = appPage === "charts" || leftPanelMode === "charts";
        if (!wantsCharts) return;
        void refreshChartsList(currentUser.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appPage, leftPanelMode, currentUser?.id]);

    // auth wire-up
    useEffect(() => {
        const supabase = supabaseBrowser();

        const upsertProfile = async (u: { id: string; email?: string | null }) => {
            const { error } = await supabase
                .from("profiles")
                .upsert({ id: u.id, email: u.email ?? null }, { onConflict: "id" });
            if (error) console.warn("profiles upsert failed:", error.message);
        };

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

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            if (u) {
                const userObj = { id: u.id, email: u.email ?? null };
                setCurrentUser(userObj);
                void upsertProfile(userObj);
                void refreshUserChart(u.id);
            } else {
                setCurrentUser(null);
                setUserChart(null);
            }
        });

        return () => sub.subscription.unsubscribe();
    }, []);

    // keep chart in sync on reload key / auth changes
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
            if (chartSource !== "local") {
                setUserChart(null);
                setChartSource(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userReloadKey, currentUser?.id, chartSource]);

    // =========================
    // Journal save (used by AI box in reflect mode)
    // =========================
    async function saveJournalEntry(text: string) {
        const content = text.trim();
        if (!content) return;

        // anonymous mode: just bump list so local cache UI refresh can happen
        if (!currentUser?.id) {
            setJournalReloadKey((k) => k + 1);
            return;
        }

        setJournalSending(true);
        try {
            const supabase = supabaseBrowser();

            // AI reflection (only if master AI is ON)
            let aiReflection: string | null = null;
            let aiMeta: any = null;

            if (aiOn) {
                try {
                    const res = await fetch("/api/journal/reflect", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: content,
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
                    }
                } catch {
                    // reflection failure must not block save
                }
            }

            setJournalAiReflection(aiReflection);
            setJournalAiMeta(aiMeta);

            const { error } = await supabase.from("journal_entries").insert({
                owner_id: currentUser.id,
                chart_id: activeChartId,
                content,
                nav,
                selected: selectedInfo,
                meta: {
                    year,
                    appPage,
                    ai: aiOn
                        ? { enabled: true, reflection: aiReflection, metadata: aiMeta, v: 1 }
                        : { enabled: false, v: 1 },
                },
            });

            if (error) {
                setJournalError("Couldn’t save entry. Try again.");
                setBoxError("Couldn’t save entry. Try again.");
                return;
            }

            setJournalError(null);
            setBoxError(null);
            setJournalReloadKey((k) => k + 1);
        } finally {
            setJournalSending(false);
        }
    }

    // =========================
    // AI box submit handler
    // =========================
    function parseGateQuery(q: string): number | null {
        const m = q.match(/gate\s*#?\s*(\d{1,2})/i) || q.match(/\b(\d{1,2})\b/);
        const gate = m ? Number(m[1]) : null;
        if (!gate || gate < 1 || gate > 64) return null;
        return gate;
    }

    function parseLooseBirthInput(text: string) {
        const t = text.trim();
        const dateMatch = t.match(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
        const timeMatch = t.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);

        const date = dateMatch?.[0] ?? "";
        const time = timeMatch?.[0] ?? "";

        let location = t;
        if (date) location = location.replace(date, "");
        if (time) location = location.replace(time, "");
        location = location.replace(/[,;|]+/g, " ").replace(/\s+/g, " ").trim();

        return { date, time, location };
    }

    const handleAiBoxSubmit = useCallback(
        async (text: string) => {
            const q = text.trim();
            if (!q) return;

            setBoxError(null);

            // guard: one “busy” lane
            setBoxBusy(true);
            try {
                // 1) SEARCH
                if (boxMode === "search") {
                    // AI off => local parse
                    if (!aiOn) {
                        const gate = parseGateQuery(q);
                        if (!gate) {
                            setBoxError("Try: “gate 55” (1–64).");
                            return;
                        }
                        setHighlightGate(gate);
                        return;
                    }

                    // AI on => server action
                    setMandalaSearching(true);
                    try {
                        const res = await fetch("/api/mandala/query", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ q }),
                        });

                        if (!res.ok) {
                            setBoxError("Search failed.");
                            return;
                        }

                        const data = await res.json();
                        if (data?.action === "highlight_gate" && typeof data?.gate === "number") {
                            setHighlightGate(data.gate);
                            return;
                        }

                        // fallback: try local parse anyway
                        const gate = parseGateQuery(q);
                        if (gate) setHighlightGate(gate);
                        else setBoxError("Couldn’t parse that. Try: “gate 55”.");
                    } finally {
                        setMandalaSearching(false);
                    }
                    return;
                }

                // 2) CHART
                if (boxMode === "chart") {
                    // Let the text prefill fields if user typed naturally
                    const parsed = parseLooseBirthInput(q);

                    if (!birthDate && parsed.date) setBirthDate(parsed.date);
                    if (!birthTime && parsed.time) setBirthTime(parsed.time);
                    if (!birthLocation && parsed.location) setBirthLocation(parsed.location);

                    // require inputs
                    const d = birthDate || parsed.date;
                    const t = birthTime || parsed.time;

                    if (!d || !t) {
                        setBoxError('Include a date + time, e.g. "1998-03-05 15:08 Boston".');
                        return;
                    }

                    // Create using the same generator flow
                    await createChartFromGenerator();
                    return;
                }

                // 3) REFLECT (default) => save journal + optional reflection
                await saveJournalEntry(q);
            } finally {
                setBoxBusy(false);
            }
        },
        [
            aiOn,
            boxMode,
            birthDate,
            birthTime,
            birthLocation,
            createChartFromGenerator,
            saveJournalEntry,
            year,
            nav,
            selectedInfo,
            appPage,
        ]
    );

    // =========================
    // Planet toggles (left panel)
    // =========================
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

    // click background clears selection
    useEffect(() => {
        const svg = document.querySelector("#MandalaSvg");
        if (!(svg instanceof SVGSVGElement)) return;
        const onBgClick = () => setSelectedInfo(null);
        svg.addEventListener("click", onBgClick);
        return () => svg.removeEventListener("click", onBgClick);
    }, []);

    // =========================
    // Chart paste modal stays as-is
    // =========================
    return (
        <div className="h-screen w-full overflow-hidden">
            {chartJsonPasteOpen ? (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-[720px] max-w-full rounded-2xl border border-white/10 bg-black/80 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-white">Paste Chart JSON</div>
                            <button
                                type="button"
                                onClick={() => setChartJsonPasteOpen(false)}
                                className="text-xs opacity-80 hover:opacity-100 rounded-lg bg-white/10 px-2 py-1"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-3 text-xs text-white/60">
                            Paste a chart payload. (For now this expects Mandala’s `UserChartPayload` format.)
                        </div>

                        <textarea
                            value={chartJsonDraft}
                            onChange={(e) => setChartJsonDraft(e.target.value)}
                            className="mt-3 w-full h-[260px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white outline-none"
                            placeholder='{"label":"...", "birth_utc":"...", ...}'
                        />

                        {chartJsonError ? <div className="mt-2 text-sm text-red-300">{chartJsonError}</div> : null}

                        <div className="mt-3 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setChartJsonPasteOpen(false)}
                                className="rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm text-white/70"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={importChartFromJsonPaste}
                                className="rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-sm disabled:opacity-50"
                                disabled={!chartJsonDraft.trim()}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

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
                            setYear={commitYear}
                            nav={nav as NavState}
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
                            // Back-compat shims (until you update LeftExpandedPanel props):
                            mandalaAiOn={aiOn}
                            setMandalaAiOn={(v: boolean) => setAiOn(v)}
                            mandalaQuery={""}
                            setMandalaQuery={() => { }}
                            mandalaSearching={mandalaSearching}
                            setMandalaSearching={setMandalaSearching}
                            highlightGate={highlightGate}
                            setHighlightGate={setHighlightGate}
                            mandalaSearchOn={boxMode === "search"}
                            setMandalaSearchOn={(v: boolean) => setBoxMode(v ? "search" : "reflect")}
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
                            resetYearCache={devToolsOn ? resetYearCacheDev : undefined}
                            resetUserCache={devToolsOn ? resetUserCacheDev : undefined}
                            devToolsOn={devToolsOn}
                            onOpenChartJsonPaste={() => {
                                setChartJsonPasteOpen(true);
                                setChartJsonError(null);
                            }}
                        />
                    ) : null}
                </div>

                {/* 3) Center column */}
                <div
                    className="h-full overflow-y-auto relative"
                    style={
                        {
                            ["--journalMaskColor" as any]: "#83a5a9",
                        } as React.CSSProperties
                    }
                >
                    {/* Transits */}
                    {appPage === "transits" ? (
                        <div className="pt-6 pb-0 flex flex-col items-center">
                            <MandalaSvg />
                            <MandalaController
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
                                nav={nav as any}
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

                            {/* Central AI Action Box */}
                            <AiActionBox
                                aiOn={aiOn}
                                setAiOn={setAiOn}
                                boxMode={boxMode}
                                setBoxMode={setBoxMode}
                                onSubmit={handleAiBoxSubmit}
                                reflection={journalAiReflection}
                                busy={boxBusy || mandalaSearching || journalSending || createBusy}
                                error={boxError ?? journalError}
                                onClearError={() => {
                                    setBoxError(null);
                                    setJournalError(null);
                                }}
                                // chart inputs appear when boxMode === "chart"
                                newChartLabel={newChartLabel}
                                setNewChartLabel={setNewChartLabel}
                                birthDate={birthDate}
                                setBirthDate={setBirthDate}
                                birthTime={birthTime}
                                setBirthTime={setBirthTime}
                                birthLocation={birthLocation}
                                setBirthLocation={setBirthLocation}
                            />
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
                    <div
                        onMouseDown={startRightResize}
                        className="absolute left-0 top-0 h-full w-[14px] cursor-col-resize bg-white/5 hover:bg-white/10"
                        title={isRightSidebarOpen ? "Drag to resize (snap closed)" : "Drag to open"}
                        aria-label="Resize sidebar"
                    />

                    {!isRightSidebarOpen ? (
                        <button
                            onClick={() => setIsRightSidebarOpen(true)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-[14px] bg-black/70 border border-white/15 rounded-r-md"
                            title="Open info"
                            aria-label="Open sidebar"
                        />
                    ) : null}

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
                    ) : isRightSidebarOpen ? (
                        <div className="h-full pl-[14px]" />
                    ) : null}
                </div>
            </div>
        </div>
    );
}

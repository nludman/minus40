"use client";

import { useEffect } from "react";
import type { NavState } from "@/components/shell/hooks/useMandalaNav";

export type MandalaSession = {
    year: number;
    nav: NavState;

    visiblePlanets: Record<string, boolean>;
    arcCap: "round" | "butt";
    gapPxRound: number;
    gapPxButt: number;
    showCalendar: boolean;

    ringLayout: import("@/lib/mandala/ringLayout").RingLayoutKnobs;

    sidebarExpanded: boolean;
};

function safeParseSession(key: string): MandalaSession | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as MandalaSession;
    } catch {
        return null;
    }
}

function safeWriteSession(key: string, s: MandalaSession) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(key, JSON.stringify(s));
    } catch { }
}

export function useMandalaSession(args: {
    key: string;

    // URL / params for "don't override explicit URL nav"
    hasUrlNav: boolean;

    // READ current values
    year: number;
    nav: NavState;
    visiblePlanets: Record<string, boolean>;
    arcCap: "round" | "butt";
    gapPxRound: number;
    gapPxButt: number;
    showCalendar: boolean;
    ringLayout: import("@/lib/mandala/ringLayout").RingLayoutKnobs;
    sidebarExpanded: boolean;

    // WRITE setters
    setSidebarExpanded: (v: boolean) => void;
    setArcCap: (v: "round" | "butt") => void;
    setGapPxRound: (v: number) => void;
    setGapPxButt: (v: number) => void;
    setShowCalendar: (v: boolean) => void;
    setRingLayout: (v: import("@/lib/mandala/ringLayout").RingLayoutKnobs) => void;
    setVisiblePlanets: (v: Record<string, boolean>) => void;

    setYear: (v: number) => void;
    setNav: (v: NavState) => void;

    // push/normalize helper from your nav hook
    commitNav: (y: number, nav: NavState) => void;
}) {
    const {
        key,
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
    } = args;

    // =========================
    // Restore (runs once)
    // =========================
    useEffect(() => {
        if (hasUrlNav) return;

        const s = safeParseSession(key);
        if (!s) return;

        setSidebarExpanded(s.sidebarExpanded);

        setArcCap(s.arcCap);
        setGapPxRound(s.gapPxRound);
        setGapPxButt(s.gapPxButt);
        setShowCalendar(s.showCalendar);
        setRingLayout(s.ringLayout);
        setVisiblePlanets(s.visiblePlanets);

        // keep local state synced
        setYear(s.year);
        setNav(s.nav);

        // keep URL shareable + consistent
        commitNav(s.year, s.nav);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =========================
    // Persist
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

        safeWriteSession(key, s);
    }, [
        key,
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
}

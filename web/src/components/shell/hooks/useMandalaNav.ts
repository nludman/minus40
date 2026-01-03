"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type NavState = {
    view: "calendar" | "tracker";
    span: "year" | "quarter" | "month" | "week";
    m?: number; // 0..11 for month view
};

function clampMonth(m: number) {
    return Math.max(0, Math.min(11, m));
}

function normalizeNav(next: NavState): NavState {
    if (next.span === "month") {
        const m = typeof next.m === "number" ? next.m : new Date().getMonth();
        return { ...next, m: clampMonth(m) };
    }
    // remove month when not month span
    const { m: _m, ...rest } = next;
    return rest;
}

function navFromSearchParams(searchParams: ReadonlyURLSearchParams): NavState {
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
        m: Number.isFinite(mNum) ? clampMonth(mNum as number) : undefined,
    };
}

function yearFromSearchParams(searchParams: ReadonlyURLSearchParams) {
    const y = Number(searchParams.get("y"));
    return Number.isFinite(y) ? y : new Date().getFullYear();
}

export function useMandalaNav(router: AppRouterInstance, searchParams: ReadonlyURLSearchParams) {
    // derive from URL
    const navUrl = useMemo(() => navFromSearchParams(searchParams), [searchParams]);
    const yearUrl = useMemo(() => yearFromSearchParams(searchParams), [searchParams]);

    // local state mirrors URL (and stays in sync with back/forward)
    const [year, setYear] = useState(yearUrl);
    const [nav, setNav] = useState<NavState>(navUrl);

    useEffect(() => setYear(yearUrl), [yearUrl]);
    useEffect(() => setNav(navUrl), [navUrl]);

    const pushNav = useCallback(
        (nextYear: number, nextNav: NavState) => {
            // ✅ preserve existing params like ?dev=1
            const p = new URLSearchParams(searchParams.toString());

            p.set("y", String(nextYear));
            p.set("view", nextNav.view);
            p.set("span", nextNav.span);

            if (nextNav.span === "month" && typeof nextNav.m === "number") {
                p.set("m", String(clampMonth(nextNav.m)));
            } else {
                p.delete("m");
            }

            router.push(`/?${p.toString()}`);
        },
        [router, searchParams]
    );

    const commitNav = useCallback(
        (nextYear: number, nextNav: NavState) => {
            const normalized = normalizeNav(nextNav);
            setNav(normalized);
            pushNav(nextYear, normalized);
        },
        [pushNav]
    );

    const handleNavigate = useCallback(
        (patch: Partial<NavState>) => {
            commitNav(year, { ...nav, ...patch });
        },
        [year, nav, commitNav]
    );

    const commitYear = useCallback(
        (nextYear: number) => {
            setYear(nextYear);
            pushNav(nextYear, nav);
        },
        [nav, pushNav]
    );

    return {
        year,
        setYear, // raw setter (useful for session restore)
        nav,
        setNav, // raw setter (useful for session restore)

        pushNav,
        commitNav,
        handleNavigate,
        commitYear,
    };
}

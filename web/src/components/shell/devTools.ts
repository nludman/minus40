// PATH: src/components/shell/devTools.ts
import type * as React from "react";

/**
 * Turn on dev UI by adding `?dev=1` to the URL.
 * (We also allow it automatically in non-production.)
 */
// PATH: src/components/shell/devTools.ts
export function isDevToolsEnabled(searchParams?: { get: (k: string) => string | null } | null) {
    const flag = searchParams?.get("dev");
    return flag === "1" || flag === "true";
}


export function makeResetYearCache(
    setYearReloadMode: React.Dispatch<React.SetStateAction<"normal" | "reset">>,
    setYearReloadKey: React.Dispatch<React.SetStateAction<number>>
) {
    return () => {
        setYearReloadMode("reset");
        setYearReloadKey((k) => k + 1);
    };
}

export function makeResetUserCache(opts: {
    clearLocalUserChart: () => void;
    setUserChart: React.Dispatch<React.SetStateAction<any>>;
    setUserReloadKey?: React.Dispatch<React.SetStateAction<number>>;
}) {
    return () => {
        try {
            opts.clearLocalUserChart();
        } catch {
            // ignore
        }
        opts.setUserChart(null);
        opts.setUserReloadKey?.((k) => k + 1);
    };
}

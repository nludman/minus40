// PATH: src/lib/userChartCache.ts

export type UserChartPayload = {
    version: 1;
    label?: string;

    // New: identify where the chart came from
    source?: "upload" | "paste" | "generator";

    // Flexible body: either "test" format or later "real" format
    data: any;
};

const KEY_CHART = "mandala:userChart";
const KEY_META = "mandala:userChartMeta";

export function loadUserChart(): UserChartPayload | null {
    try {
        const raw = localStorage.getItem(KEY_CHART);
        if (!raw) return null;
        return JSON.parse(raw) as UserChartPayload;
    } catch {
        return null;
    }
}

export function saveUserChart(payload: UserChartPayload) {
    localStorage.setItem(KEY_CHART, JSON.stringify(payload));
    localStorage.setItem(
        KEY_META,
        JSON.stringify({ savedAt: new Date().toISOString(), version: payload.version })
    );
}

export function clearUserChart() {
    localStorage.removeItem(KEY_CHART);
    localStorage.removeItem(KEY_META);
}

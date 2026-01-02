// PATH: src/components/shell/types.ts

export type AppPage = "transits" | "charts" | "journal" | "trackers" | "account";

// If Settings isn’t a “page” but is a panel mode, keep it separate:
export type LeftPanelMode = AppPage | "settings";

export type ChartRow = {
    id: string;
    label: string | null;
    updated_at: string | null;
    payload: any;
};

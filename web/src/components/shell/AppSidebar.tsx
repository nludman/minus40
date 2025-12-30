// src/components/shell/AppSidebar.tsx

// AppSidebar = navigation icon rail only.
// It does NOT render Mandala controls or any app-page content.
// sidebarExpanded only toggles an overlay owned by page.tsx.

"use client";

type AppPage = "transits" | "charts" | "journal" | "trackers" | "settings" | "account";
type LeftPanelMode = AppPage | "settings";


function Icon({ label }: { label: string }) {
    // simple placeholder icon
    return (
        <div className="h-6 w-6 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-[10px] text-white/70">
            {label.slice(0, 1)}
        </div>
    );
}

type AppSidebarProps = {
    active: AppPage;
    panelMode: LeftPanelMode;
    onSelect: (p: AppPage | "settings") => void;
    isExpanded: boolean;
    setExpanded: (v: boolean) => void;
};


export default function AppSidebar({
    active,
    panelMode,
    onSelect,
    isExpanded,
    setExpanded,
}: AppSidebarProps) {


    const isSettingsActive = panelMode === "settings";

    return (
        <div className="h-screen w-[56px] bg-black/40 border-r border-white/10 flex flex-col items-center py-3">
            <button
                onClick={() => setExpanded(!isExpanded)}
                className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs"
                title={isExpanded ? "Hide mandala controls" : "Show mandala controls"}
            >
                {isExpanded ? "⟨" : "⟩"}
            </button>

            <div className="mt-3 flex flex-col gap-2 w-full px-2">
                <button
                    onClick={() => onSelect("transits")}
                    className={[
                        "h-10 w-full rounded-xl border border-white/10 flex items-center justify-center",
                        active === "transits" ? "bg-white/10" : "bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                    title="Transits"
                >
                    <Icon label="Transits" />
                </button>

                <button
                    onClick={() => onSelect("charts")}
                    className={[
                        "h-10 w-full rounded-xl border border-white/10 flex items-center justify-center",
                        active === "charts" ? "bg-white/10" : "bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                    title="Charts"
                >
                    <Icon label="Charts" />
                </button>


                <button
                    onClick={() => onSelect("journal")}
                    className={[
                        "h-10 w-full rounded-xl border border-white/10 flex items-center justify-center",
                        active === "journal" ? "bg-white/10" : "bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                    title="Journal"
                >
                    <Icon label="Journal" />
                </button>

                <button
                    onClick={() => onSelect("trackers")}
                    className={[
                        "h-10 w-full rounded-xl border border-white/10 flex items-center justify-center",
                        active === "trackers" ? "bg-white/10" : "bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                    title="Trackers"
                >
                    <Icon label="Trackers" />
                </button>
            </div>


            <div className="mt-auto w-full px-2 pb-3">

                <button
                    onClick={() => onSelect("settings")}
                    className={[
                        "h-10 w-full rounded-xl border border-white/10 flex items-center justify-center mb-2",
                        isSettingsActive ? "bg-white/10" : "bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                    title="Settings"
                >
                    <Icon label="Settings" />
                </button>


                <button
                    onClick={() => onSelect("account")}
                    className={[
                        "h-10 w-full rounded-xl border border-white/10 flex items-center justify-center",
                        active === "account" ? "bg-white/10" : "bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                    title="Account"
                >
                    <Icon label="Account" />
                </button>
            </div>
        </div>
    );
}

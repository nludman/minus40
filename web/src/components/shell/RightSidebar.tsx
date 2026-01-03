"use client";

import type { HoverInfo } from "@/lib/mandala/constants";
import type { UserChartPayload } from "@/lib/userChartCache";

type Info = Exclude<HoverInfo, null>;

type Props = {
  hovered: HoverInfo;   // HoverInfo already includes null
  selected: HoverInfo;  // HoverInfo already includes null
  clearSelected: () => void;
  mode?: "transits" | "charts";
  userChart?: UserChartPayload | null;
  activeChartLabel?: string | null;

};

function findSegment(info: Info) {
  if (typeof window === "undefined") return null;
  const transits = (window as any).transits;
  const list = transits?.[info.planet]?.segments;
  if (!Array.isArray(list)) return null;

  return (
    list.find((s: any) => s.gate === info.gate && s.start === info.start && s.end === info.end) ??
    null
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-sm text-white/90 truncate">{value ? String(value) : "—"}</div>
    </div>
  );
}


export default function RightSidebar({
  hovered,
  selected,
  clearSelected,
  mode = "transits",
  userChart,
  activeChartLabel,
}: Props) {
  const info: HoverInfo = selected ?? hovered;

  // ✅ Hard guard so TS narrows info to Info (non-null)
  const seg = info ? findSegment(info) : null;

  if (mode === "charts") {
    const d: any = userChart?.data ?? null;

    const type = d?.type ?? d?.hdType ?? null;
    const profile = d?.profile ?? null;
    const strategy = d?.strategy ?? null;
    const authority = d?.authority ?? d?.innerAuthority ?? null;

    return (
      <div className="h-full w-full p-4 text-white overflow-y-auto">
        <div className="text-sm font-semibold">Chart</div>

        <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
          <Row label="Chart Name" value={activeChartLabel ?? userChart?.label ?? "—"} />
          <Row label="Type" value={type} />
          <Row label="Profile" value={profile} />
          <Row label="Strategy" value={strategy} />
          <Row label="Authority" value={authority} />
        </div>
      </div>
    );
  }


  return (
    <div className="h-full w-full bg-black/30 border-l border-white/10 p-4 text-white backdrop-blur overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide">Gate / Planet</div>
        <button
          className="text-xs opacity-70 hover:opacity-100"
          onClick={clearSelected}
          disabled={!selected}
          title={selected ? "Clear selection" : "No selection to clear"}
        >
          Clear
        </button>

      </div>

      <div className="mt-3 rounded-xl bg-white/5 p-3">
        <div className="text-xs opacity-70">Selected</div>
        <div className="mt-1 text-sm">
          {selected ? (
            <span>
              {selected.planet} — Gate <b>{selected.gate}</b>
            </span>
          ) : (
            <span className="opacity-60">Click a segment</span>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-white/5 p-3">
        <div className="text-xs opacity-70">Hover</div>
        <div className="mt-1 text-sm">
          {hovered ? (
            <span>
              {hovered.planet} — Gate <b>{hovered.gate}</b>
            </span>
          ) : (
            <span className="opacity-60">Hover a segment</span>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-white/5 p-3">
        <div className="text-xs opacity-70">Active readout</div>
        <div className="mt-1 text-sm">
          {info ? (
            <div className="space-y-1">
              <div>
                Planet: <b>{info.planet}</b>
              </div>
              <div>
                Gate: <b>{info.gate}</b>
              </div>

              {seg && (
                <div className="mt-2 text-xs opacity-80 space-y-1">
                  <div>Start: {new Date(seg.start).toLocaleString()}</div>
                  <div>End: {new Date(seg.end).toLocaleString()}</div>
                </div>
              )}

              <div className="text-[11px] opacity-60">
                (Next: add line, meaning, chart overlay matches)
                {/* Year-clipped segment shown. Full gate span not yet displayed */}
              </div>
            </div>
          ) : (
            <span className="opacity-60">No segment targeted</span>
          )}
        </div>
      </div>
    </div>
  );
}

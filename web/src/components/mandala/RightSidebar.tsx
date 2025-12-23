"use client";

import type { HoverInfo as Info } from "@/lib/mandala/constants";

type Props = {
  hovered: Info;
  selected: Info;
  clearSelected: () => void;
};

function findSegment(info: NonNullable<Info>) {
  if (typeof window === "undefined") return null;
  const transits = (window as any).transits;
  const list = transits?.[info.planet]?.segments;
  if (!Array.isArray(list)) return null;

  return (
    list.find((s: any) => s.gate === info.gate && s.start === info.start && s.end === info.end) ??
    null
  );
}



export default function RightSidebar({ hovered, selected, clearSelected }: Props) {
  const info = selected ?? hovered;
  const seg = info ? findSegment(info) : null;


  return (
    <div className="fixed right-4 top-4 z-50 w-[320px] rounded-2xl bg-black/60 p-4 text-white backdrop-blur border border-white/10">
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
                //Year-clipped segment shown. Full gate span not yet displayed
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

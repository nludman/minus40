// src/lib/mandala/constants.ts
export const CX = 600;
export const CY = 600;

export const BODY_ORDER = ["Pluto", "Neptune", "Uranus", "Saturn"] as const;

export type Segment = { start: string; end: string; gate: number };
export type PlanetSegments = { segments: Segment[] };
export type SegmentsPayload = {
  year: number;
  year_start_utc: string;
  year_end_utc: string;
  transits: Record<string, PlanetSegments>;
};

export type HoverInfo = { planet: string; gate: number } | null;

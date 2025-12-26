// src/lib/mandala/constants.ts
export const CX = 600;
export const CY = 600;

export const BODY_ORDER = [
  "Moon",
  "Sun",
  "Earth",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "NorthNode",
  "SouthNode",
] as const;

export type Segment = { start: string; end: string; gate: number };
export type PlanetSegments = { segments: Segment[] };
export type SegmentsPayload = {
  year: number;
  year_start_utc: string;
  year_end_utc: string;

  // NEW
  range_start_utc: string;
  range_end_utc: string;
  view?: "calendar" | "tracker";
  span?: string; // "year" | "quarter" | "month" | "week" | "custom"
  anchor_utc?: string; // tracker only

  transits: Record<string, { segments: { start: string; end: string; gate: number }[] }>;
};


export type HoverInfo =
  | { planet: string; gate: number; start: string; end: string; key: string }
  | null;

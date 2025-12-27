// PATH: src/lib/transitJournalCache.ts
"use client";

import type { HoverInfo } from "@/lib/mandala/constants";

export type TransitJournalEntry = {
    id: string;
    createdAtIso: string;
    text: string;

    // Context snapshot (v1)
    year?: number;
    selected?: HoverInfo | null;
};

type TransitJournalStoreV1 = {
    version: 1;
    entries: TransitJournalEntry[];
};

const KEY = "mandala_transit_journal_v1";

function safeParse(json: string | null): TransitJournalStoreV1 | null {
    if (!json) return null;
    try {
        const data = JSON.parse(json);
        if (data?.version === 1 && Array.isArray(data.entries)) return data as TransitJournalStoreV1;
        return null;
    } catch {
        return null;
    }
}

export function loadTransitJournal(): TransitJournalEntry[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(KEY);
    const parsed = safeParse(raw);
    return parsed?.entries ?? [];
}

export function saveTransitJournal(entries: TransitJournalEntry[]) {
    if (typeof window === "undefined") return;
    const payload: TransitJournalStoreV1 = { version: 1, entries };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
}

export function clearTransitJournal() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
}

export function addTransitJournalEntry(input: {
    text: string;
    year?: number;
    selected?: HoverInfo | null;
}): TransitJournalEntry {
    const entries = loadTransitJournal();

    const entry: TransitJournalEntry = {
        id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `j_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAtIso: new Date().toISOString(),
        text: input.text,
        year: input.year,
        selected: input.selected ?? null,
    };

    // newest first
    const next = [entry, ...entries];
    saveTransitJournal(next);
    return entry;
}

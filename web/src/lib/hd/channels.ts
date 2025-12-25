// src/lib/hd/channels.ts
// Canonical Human Design channels as gate pairs.
// Used for "transit gate + user gate completes channel" logic.

export const CHANNELS: ReadonlyArray<readonly [number, number]> = [
    [1, 8],
    [2, 14],
    [3, 60],
    [4, 63],
    [5, 15],
    [6, 59],
    [7, 31],
    [9, 52],
    [10, 20],
    [10, 34],
    [10, 57],
    [11, 56],
    [12, 22],
    [13, 33],
    [16, 48],
    [17, 62],
    [18, 58],
    [19, 49],
    [20, 34],
    [20, 57],
    [21, 45],
    [23, 43],
    [24, 61],
    [25, 51],
    [26, 44],
    [27, 50],
    [28, 38],
    [29, 46],
    [30, 41],
    [32, 54],
    [35, 36],
    [37, 40],
    [39, 55],
    [42, 53],
    [47, 64],
];

export type Gate = number;

export const PARTNERS_BY_GATE: ReadonlyMap<Gate, ReadonlyArray<Gate>> = (() => {
    const m = new Map<Gate, Gate[]>();
    const add = (a: Gate, b: Gate) => {
        if (!m.has(a)) m.set(a, []);
        m.get(a)!.push(b);
    };

    for (const [a, b] of CHANNELS) {
        add(a, b);
        add(b, a);
    }
    return m;
})();

export function partnersForGate(g: Gate): ReadonlyArray<Gate> {
    return PARTNERS_BY_GATE.get(g) ?? [];
}

export function channelKey(a: number, b: number) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return `${lo}-${hi}`;
}

export function definedChannelsFromGates(gates: Iterable<number>) {
    const set = new Set<number>(gates);
    const pairs: Array<[number, number]> = [];
    const keys: string[] = [];

    for (const [a, b] of CHANNELS) {
        if (set.has(a) && set.has(b)) {
            pairs.push([a, b]);
            keys.push(channelKey(a, b));
        }
    }

    return { pairs, keys };
}


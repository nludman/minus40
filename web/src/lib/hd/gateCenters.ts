// src/lib/hd/gateCenters.ts

export type CenterName =
    | "Head"
    | "Ajna"
    | "Throat"
    | "G"
    | "Ego"
    | "Spleen"
    | "SolarPlexus"
    | "Sacral"
    | "Root";

// Seed Sacral only for first working ring.
// We'll complete the full map as we add more center rings.
export const gateToCenters: Record<number, CenterName[]> = {
    3: ["Sacral"],
    5: ["Sacral"],
    9: ["Sacral"],
    14: ["Sacral"],
    27: ["Sacral"],
    29: ["Sacral"],
    34: ["Sacral"],
    42: ["Sacral"],
    59: ["Sacral"],
};

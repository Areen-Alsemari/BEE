import { create } from "zustand";

export type ViewPreset = "system" | "goldstone" | "canberra" | "madrid" | "follow" | "free";

export const PRESETS: { id: Exclude<ViewPreset, "free">; label: string }[] = [
  { id: "system", label: "Whole Earth" },
  { id: "goldstone", label: "Goldstone" },
  { id: "canberra", label: "Canberra" },
  { id: "madrid", label: "Madrid" },
  { id: "follow", label: "Follow a link" },
];

export const useView = create<{ preset: ViewPreset; nonce: number; setPreset: (p: ViewPreset) => void }>((set) => ({
  preset: "system",
  nonce: 0,
  setPreset: (preset) => set((s) => ({ preset, nonce: s.nonce + 1 })),
}));

import { create } from "zustand";
import type { HeuristicRule, MethodId } from "../config/theme";
import type { WeekId } from "../data/types";

export type Layer = "visibility" | "maintenance";

export interface LabState {
  selectedWeek: WeekId;
  methodA: MethodId;
  ruleA: HeuristicRule;
  methodB: MethodId;
  ruleB: HeuristicRule;
  trainingSeed: number;
  evaluationSeed: number;
  currentTime: number | null;
  compareMode: boolean;
  tourStep: number;
  playing: boolean;
  speed: number;
  selectedRequestId: string | null;
  layers: Record<Layer, boolean>;
  howToReadOpen: boolean;

  set: (patch: Partial<LabState>) => void;
  toggleLayer: (l: Layer) => void;
}

export const useLab = create<LabState>((set) => ({
  selectedWeek: "W40",
  methodA: "adaptive_bee",
  ruleA: "earliest_window_end",
  methodB: "plain_ppo",
  ruleB: "earliest_window_end",
  trainingSeed: 42,
  evaluationSeed: 1001,
  currentTime: null,
  compareMode: false,
  tourStep: 0,
  playing: false,
  speed: 3600,
  selectedRequestId: null,
  layers: { visibility: false, maintenance: true },
  howToReadOpen: false,
  set: (patch) => set(patch),
  toggleLayer: (l) => set((s) => ({ layers: { ...s.layers, [l]: !s.layers[l] } })),
}));

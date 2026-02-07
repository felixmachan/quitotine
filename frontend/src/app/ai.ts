import type { JournalEntry } from "./quitLogic";

export type AiFeature = "spike_debrief" | "pattern_digest" | "weekly_summary" | "evidence_reframe";

export interface AiCapability {
  id: AiFeature;
  label: string;
  premium: boolean;
  status: "planned" | "building" | "live";
  outputTone: "calm" | "precise" | "restrained";
}

export interface AiContext {
  entries: JournalEntry[];
  dayIndex: number;
}

export const AI_CAPABILITIES: AiCapability[] = [
  {
    id: "spike_debrief",
    label: "Spike debrief summary",
    premium: true,
    status: "planned",
    outputTone: "restrained"
  },
  {
    id: "pattern_digest",
    label: "Pattern detection digest",
    premium: true,
    status: "planned",
    outputTone: "precise"
  },
  {
    id: "weekly_summary",
    label: "Weekly insight summary",
    premium: true,
    status: "planned",
    outputTone: "calm"
  },
  {
    id: "evidence_reframe",
    label: "Evidence reframing",
    premium: true,
    status: "planned",
    outputTone: "precise"
  }
];

export const supportsAiInterpretation = (context: AiContext) => context.entries.length >= 5 && context.dayIndex >= 3;

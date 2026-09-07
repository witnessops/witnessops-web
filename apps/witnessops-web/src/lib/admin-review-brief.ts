export const REVIEW_BRIEF_FIELDS = [
  { name: "scope", label: "Bounded scope", required: true },
  { name: "desiredOutcome", label: "Expected business result", required: true },
  { name: "timing", label: "What needs to happen, and by when?", required: false },
  { name: "commercialStatus", label: "Commercial notes", required: false },
  { name: "nextAction", label: "Next action", required: true },
  { name: "workflowBoundary", label: "Workflow boundary", required: false },
  { name: "authorityBoundary", label: "Authority boundary", required: false },
  { name: "evidencePosture", label: "Available evidence and limits", required: false },
] as const;

export type ReviewBriefField = (typeof REVIEW_BRIEF_FIELDS)[number]["name"];
export type ReviewBriefValues = Record<ReviewBriefField, string> & { missingInformation: string[] };

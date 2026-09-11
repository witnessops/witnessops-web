export type EarlyAccessState = 'invited' | 'active' | 'paused' | null;
export type FeedbackSurface = 'first_run' | 'comparison';
export type FeedbackResponse = 'yes' | 'not_really' | 'dismissed';
export type FeedbackDecision = { surface: FeedbackSurface; runId: string };
export const CLIENT_EVENTS = ['observation_opened', 'evidence_opened', 'report_opened', 'pdf_export_requested', 'source_json_downloaded', 'comparison_viewed', 'deeper_review_clicked'] as const;
export type ClientEvent = typeof CLIENT_EVENTS[number];
export type ProductEvent = ClientEvent | 'early_access_activated' | 'asset_added' | 'observation_started' | 'observation_completed' | 'observation_failed' | 'rerun_started' | 'feedback_submitted';
export const EARLY_ACCESS_DATA_NOTE = 'We record product actions using user, workspace and run IDs to understand activation and repeat use. Events contain no hostname or source evidence. Optional feedback is stored separately from your runs. Automatic retention/deletion is not implemented yet; contact us about removal. Reports and sources are unsigned.';

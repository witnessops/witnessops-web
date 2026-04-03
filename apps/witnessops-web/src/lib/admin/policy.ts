/**
 * Centralized admin action class logic.
 *
 * Every component that renders an admin action must consume both
 * getActionClass() and getActionReason(). No component may inline
 * its own enable/disable reason text.
 *
 * Action classes per WW-003 / WW-005:
 *   view-only        — display only, no mutation affordance
 *   draft-only       — editable inputs, save draft, no execution
 *   approval-required — action visible but gated, approval text present
 *   operator-only    — full action, restricted to operator role
 *   not-enabled      — visible but disabled, reason text required
 */

export type ActionClass =
  | "view-only"
  | "draft-only"
  | "approval-required"
  | "operator-only"
  | "not-enabled";

export type AdminAction =
  | "view-queue"
  | "reply-intake"
  | "reconcile-intake"
  | "rebuild-site"
  | "regen-audio"
  | "trust-drift-scan"
  | "clear-cache"
  | "export-report"
  | "logout";

/**
 * Context for row-level action class resolution.
 * Passed when the action class depends on the state of a specific queue row.
 */
export interface ActionContext {
  queueEligible?: boolean;
  hasDivergence?: boolean;
  reconciliationPending?: boolean;
  reconciliationResolved?: boolean;
}

/**
 * Returns the action class for a given admin action.
 * This is the single source of truth for what is allowed.
 */
export function getActionClass(
  action: AdminAction,
  context?: ActionContext,
): ActionClass {
  switch (action) {
    case "view-queue":
      return "view-only";

    case "reply-intake":
      if (!context?.queueEligible) return "not-enabled";
      if (context.hasDivergence) return "not-enabled";
      return "operator-only";

    case "reconcile-intake":
      if (!context?.reconciliationPending) return "not-enabled";
      if (context.reconciliationResolved) return "not-enabled";
      return "operator-only";

    case "rebuild-site":
      return "operator-only";

    case "regen-audio":
      return "operator-only";

    case "trust-drift-scan":
      return "not-enabled";

    case "clear-cache":
      return "operator-only";

    case "export-report":
      return "view-only";

    case "logout":
      return "view-only";
  }
}

/**
 * Returns a human-readable reason why an action is disabled or gated.
 * Returns null if the action is fully enabled.
 *
 * Every component must use this instead of inlining reason text.
 */
export function getActionReason(
  action: AdminAction,
  context?: ActionContext,
): string | null {
  switch (action) {
    case "reply-intake":
      if (!context?.queueEligible) return "Intake is not eligible for response.";
      if (context.hasDivergence) return "Divergent state must be resolved before responding.";
      return null;

    case "reconcile-intake":
      if (!context?.reconciliationPending) return "No reconciliation pending for this intake.";
      if (context.reconciliationResolved) return "Reconciliation already resolved.";
      return null;

    case "trust-drift-scan":
      return "Trust drift scan is not enabled in the current policy state (WW-005).";

    case "rebuild-site":
    case "regen-audio":
    case "clear-cache":
      return null;

    case "view-queue":
    case "export-report":
    case "logout":
      return null;
  }
}

/**
 * Whether the action should be visible in the UI at all.
 * operator-only actions are hidden from non-operator roles,
 * but since this admin is operator-only by session, all are visible.
 */
export function isActionVisible(_actionClass: ActionClass): boolean {
  // All classes are visible in the admin console.
  // "not-enabled" is explicitly visible but disabled.
  return true;
}

/**
 * Whether the action button should be interactive (not grayed out).
 */
export function isActionEnabled(actionClass: ActionClass): boolean {
  switch (actionClass) {
    case "view-only":
      return false; // No action button rendered
    case "draft-only":
      return true;
    case "approval-required":
      return true; // Enabled but gated
    case "operator-only":
      return true;
    case "not-enabled":
      return false;
  }
}

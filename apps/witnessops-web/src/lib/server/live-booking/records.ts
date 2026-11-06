export type BookingDraft = {
  topic: string;
  stage: "planned" | "live";
  name: string;
  email: string;
  timezone: string;
};

export type MailAcceptance = "not_sent" | "accepted" | "rejected" | "unknown";

export type SessionRecord = {
  tokenHash: string;
  createdAt: number;
  touchedAt: number;
  expiresAt: number;
  verifiedEmail: string | null;
  verificationExpiresAt: number | null;
  holdId: string | null;
  bookingId: string | null;
  codeSends: number;
  lastCodeKey: string | null;
  lastCodeResult: Exclude<MailAcceptance, "not_sent"> | null;
  lastVerificationId: string | null;
};

export type VerificationRecord = {
  id: string;
  sessionHash: string;
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
};

export type HoldRecord = {
  id: string;
  slotId: string;
  start: string;
  end: string;
  sessionHash: string;
  draft: BookingDraft;
  expiresAt: number;
};

export type BookingStatus =
  | "insert_started"
  | "event_recorded"
  | "released_external_overlap"
  | "overlap_unknown"
  | "cancelled"
  | "cancel_unknown"
  | "insert_rejected";

export type BookingRecord = {
  id: string;
  sessionHash: string;
  cancelTokenHash: string;
  slotId: string;
  start: string;
  end: string;
  draft: BookingDraft;
  eventId: string;
  iCalUid: string | null;
  status: BookingStatus;
  mail: {
    confirmation: MailAcceptance;
    invite: MailAcceptance;
    cancellationNotice: MailAcceptance;
    cancellationInvite: MailAcceptance;
  };
  idempotencyKey: string;
  cancelToken: string;
  createdAt: number;
  updatedAt: number;
};

export type PublicMail = {
  verification: MailAcceptance;
  confirmation: MailAcceptance;
  invite: MailAcceptance;
  cancellationNotice: MailAcceptance;
  cancellationInvite: MailAcceptance;
  delivery: "not_observed";
};

export type PublicBooking = {
  reference: string;
  slot: { id: string; start: string; end: string };
  draft: BookingDraft;
  status: BookingStatus;
  calendarEvent: "not_recorded" | "recorded" | "unknown";
  mail: PublicMail;
  googleNotifications: "suppressed_send_updates_none";
  googleNotificationCaveat: "provider_documents_that_some_mail_might_still_be_sent";
  delivery: "not_observed";
};

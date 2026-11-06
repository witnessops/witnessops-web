/** Fixed targets for the disabled-by-default live booking draft. */
export const LIVE_BOOKING_CALENDAR_ID = "engage@mail.witnessops.com";
export const LIVE_BOOKING_TIME_ZONE = "Europe/Warsaw";
export const LIVE_BOOKING_ORGANIZER = LIVE_BOOKING_CALENDAR_ID;
export const SLOT_MINUTES = 20;
export const SLOT_HOURS = [9, 12, 15] as const;
export const HORIZON_DAYS = 14;
export const MIN_LEAD_MS = 4 * 60 * 60 * 1000;
export const HOLD_MS = 5 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 45 * 60 * 1000;
export const SESSION_SLIDING_MS = 20 * 60 * 1000;
export const CODE_TTL_MS = 15 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;
export const CODE_MAX_SENDS = 3;
export const STARTS_PER_IP_HOUR = 20;
export const CODES_PER_EMAIL_HOUR = 8;
/** Store-wide verification ceiling. Not derived from a forwarding header. */
export const GLOBAL_VERIFICATION_PER_HOUR = 30;
export const AVAILABILITY_PER_SESSION_HOUR = 12;
export const GLOBAL_AVAILABILITY_PER_HOUR = 60;
export const HOUR_MS = 60 * 60 * 1000;
export const GLOBAL_MAIL_BUDGET_KEY = "globalmail";
export const GLOBAL_AVAILABILITY_BUDGET_KEY = "globalavail";
export const MAX_OPEN_SESSIONS = 200;
export const DEMO_CODE_FORBIDDEN = "314159";

export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALENDAR_API_ORIGIN = "https://www.googleapis.com";
export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

/**
 * Minimum OAuth scopes for the engage mailbox refresh token.
 * events.owned writes and reads events on calendars that mailbox owns.
 * events.freebusy reads busy intervals. The full calendar scope is not used.
 */
export const LIVE_BOOKING_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar.events.freebusy",
] as const;

export const MAIL_ROLES = [
  "verification",
  "confirmation",
  "invite",
  "cancellation_notice",
  "cancellation_invite",
] as const;

export type MailRole = (typeof MAIL_ROLES)[number];

import { GOOGLE_CALENDAR_API_ORIGIN, GOOGLE_OAUTH_TOKEN_URL, LIVE_BOOKING_TIME_ZONE } from "./constants";
import { liveBookingFetch } from "./egress";
import { formatWarsawOffset, overlaps } from "./warsaw-time";

export type BusyInterval = { start: string; end: string };

type TokenCache = { accessToken: string; expiresAt: number };

export type CalendarTransport = {
  freeBusy(start: string, end: string): Promise<{ kind: "ok"; busy: BusyInterval[] } | { kind: "unknown" } | { kind: "rejected" }>;
  getEvent(eventId: string): Promise<{ kind: "ok"; iCalUid: string | null; status: string } | { kind: "absent" } | { kind: "unknown" } | { kind: "rejected" }>;
  insertEvent(input: {
    eventId: string;
    bookingId: string;
    start: string;
    end: string;
    summary: string;
    description: string;
    attendeeEmail: string;
    attendeeName: string;
  }): Promise<{ kind: "ok"; iCalUid: string | null } | { kind: "conflict" } | { kind: "unknown" } | { kind: "rejected" }>;
  listBlocking(start: string, end: string, ignoreEventId: string): Promise<{ kind: "ok"; overlaps: boolean } | { kind: "unknown" } | { kind: "rejected" }>;
  cancelEvent(eventId: string): Promise<{ kind: "ok" } | { kind: "absent" } | { kind: "unknown" } | { kind: "rejected" }>;
};

function calendarUrl(calendarId: string, suffix: string, params: Record<string, string> = {}): string {
  const url = new URL(`${GOOGLE_CALENDAR_API_ORIGIN}/calendar/v3/calendars/${encodeURIComponent(calendarId)}${suffix}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function classify(status: number): "absent" | "conflict" | "rejected" | "unknown" | "ok" {
  if (status >= 200 && status < 300) return "ok";
  if (status === 404) return "absent";
  if (status === 409) return "conflict";
  if (status === 400 || status === 401 || status === 403 || status === 422) return "rejected";
  return "unknown";
}

export function createGoogleCalendarTransport(options: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): CalendarTransport {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  let cache: TokenCache | null = null;

  async function accessToken(force = false): Promise<string | null> {
    if (!force && cache && cache.expiresAt > now() + 30_000) return cache.accessToken;
    try {
      const response = await liveBookingFetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: options.clientId,
          client_secret: options.clientSecret,
          refresh_token: options.refreshToken,
        }),
        signal: AbortSignal.timeout(8_000),
      }, fetchImpl);
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }
      const body = await response.json() as { access_token?: unknown; expires_in?: unknown };
      if (typeof body.access_token !== "string" || !body.access_token) return null;
      const seconds = typeof body.expires_in === "number" ? body.expires_in : 300;
      cache = { accessToken: body.access_token, expiresAt: now() + seconds * 1000 };
      return body.access_token;
    } catch {
      return null;
    }
  }

  async function call(url: string, init: RequestInit, allowRefresh = true): Promise<Response | "unknown" | "rejected"> {
    const token = await accessToken(!allowRefresh);
    if (!token) return "rejected";
    try {
      const headers = new Headers(init.headers);
      headers.set("authorization", `Bearer ${token}`);
      const response = await liveBookingFetch(url, { ...init, headers, signal: AbortSignal.timeout(8_000) }, fetchImpl);
      if (response.status === 401 && allowRefresh) {
        await response.body?.cancel().catch(() => undefined);
        cache = null;
        return call(url, init, false);
      }
      return response;
    } catch {
      return "unknown";
    }
  }

  async function drain(response: Response): Promise<void> {
    await response.body?.cancel().catch(() => undefined);
  }

  return {
    async freeBusy(start, end) {
      const response = await call("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          timeMin: start,
          timeMax: end,
          timeZone: LIVE_BOOKING_TIME_ZONE,
          items: [{ id: options.calendarId }],
        }),
      });
      if (response === "unknown" || response === "rejected") return { kind: response };
      if (!response.ok) {
        await drain(response);
        return { kind: classify(response.status) === "rejected" ? "rejected" : "unknown" };
      }
      const body = await response.json() as { calendars?: Record<string, { errors?: unknown[]; busy?: BusyInterval[] }> };
      const calendar = body.calendars?.[options.calendarId];
      if (!calendar || calendar.errors?.length) return { kind: "unknown" };
      const busy = (calendar.busy ?? []).filter((interval) => typeof interval.start === "string" && typeof interval.end === "string");
      return { kind: "ok", busy };
    },
    async getEvent(eventId) {
      const response = await call(calendarUrl(options.calendarId, `/events/${encodeURIComponent(eventId)}`), { method: "GET" });
      if (response === "unknown" || response === "rejected") return { kind: response };
      const outcome = classify(response.status);
      if (outcome === "absent") {
        await drain(response);
        return { kind: "absent" };
      }
      if (outcome !== "ok") {
        await drain(response);
        return { kind: outcome === "rejected" ? "rejected" : "unknown" };
      }
      const body = await response.json() as { status?: unknown; iCalUID?: unknown };
      return { kind: "ok", status: typeof body.status === "string" ? body.status : "", iCalUid: typeof body.iCalUID === "string" ? body.iCalUID : null };
    },
    async insertEvent(input) {
      const response = await call(calendarUrl(options.calendarId, "/events", { sendUpdates: "none" }), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: input.eventId,
          summary: input.summary,
          description: input.description,
          start: { dateTime: formatWarsawOffset(input.start), timeZone: LIVE_BOOKING_TIME_ZONE },
          end: { dateTime: formatWarsawOffset(input.end), timeZone: LIVE_BOOKING_TIME_ZONE },
          attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName, responseStatus: "needsAction" }],
          guestsCanInviteOthers: false,
          guestsCanModify: false,
          guestsCanSeeOtherGuests: false,
          transparency: "opaque",
          visibility: "private",
          reminders: { useDefault: false },
          extendedProperties: { private: { witnessopsBookingId: input.bookingId } },
        }),
      });
      if (response === "unknown" || response === "rejected") return { kind: response };
      const outcome = classify(response.status);
      if (outcome === "conflict") {
        await drain(response);
        return { kind: "conflict" };
      }
      if (outcome !== "ok") {
        await drain(response);
        return { kind: outcome === "rejected" ? "rejected" : "unknown" };
      }
      const body = await response.json() as { iCalUID?: unknown };
      return { kind: "ok", iCalUid: typeof body.iCalUID === "string" ? body.iCalUID : null };
    },
    async listBlocking(start, end, ignoreEventId) {
      const response = await call(calendarUrl(options.calendarId, "/events", {
        timeMin: start,
        timeMax: end,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
        showDeleted: "false",
      }), { method: "GET" });
      if (response === "unknown" || response === "rejected") return { kind: response };
      if (!response.ok) {
        await drain(response);
        return { kind: classify(response.status) === "rejected" ? "rejected" : "unknown" };
      }
      const body = await response.json() as {
        nextPageToken?: string;
        items?: Array<{ id?: string; status?: string; transparency?: string; start?: { dateTime?: string }; end?: { dateTime?: string } }>;
      };
      if (body.nextPageToken) return { kind: "unknown" };
      const blocking = (body.items ?? []).some((item) => item.id !== ignoreEventId
        && item.status !== "cancelled"
        && item.transparency !== "transparent"
        && item.start?.dateTime
        && item.end?.dateTime
        && overlaps(start, end, item.start.dateTime, item.end.dateTime));
      return { kind: "ok", overlaps: blocking };
    },
    async cancelEvent(eventId) {
      const response = await call(calendarUrl(options.calendarId, `/events/${encodeURIComponent(eventId)}`, { sendUpdates: "none" }), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (response === "unknown" || response === "rejected") return { kind: response };
      const outcome = classify(response.status);
      await drain(response);
      if (outcome === "ok") return { kind: "ok" };
      if (outcome === "absent") return { kind: "absent" };
      return { kind: outcome === "rejected" ? "rejected" : "unknown" };
    },
  };
}

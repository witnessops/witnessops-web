function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\n|\r/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 73) return line;
  const parts: string[] = [];
  let start = 0;
  let width = 73;
  while (start < bytes.length) {
    let end = Math.min(bytes.length, start + width);
    while (end > start && (bytes[end] & 0xc0) === 0x80) end -= 1;
    if (end === start) end = Math.min(bytes.length, start + width);
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    width = 72;
  }
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n");
}

function utcBasic(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildBookingIcs(input: {
  method: "REQUEST" | "CANCEL";
  uid: string;
  sequence: number;
  start: string;
  end: string;
  summary: string;
  description: string;
  organizer: string;
  attendee: string;
  attendeeName: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//WitnessOps//Live Booking//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${input.method}`,
    "BEGIN:VEVENT",
    `UID:${escapeText(input.uid)}`,
    `DTSTAMP:${utcBasic(new Date().toISOString())}`,
    `DTSTART:${utcBasic(input.start)}`,
    `DTEND:${utcBasic(input.end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    `ORGANIZER;CN=WitnessOps:mailto:${input.organizer}`,
    `ATTENDEE;CN=${escapeText(input.attendeeName)};RSVP=TRUE:mailto:${input.attendee}`,
    `SEQUENCE:${input.sequence}`,
    `STATUS:${input.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

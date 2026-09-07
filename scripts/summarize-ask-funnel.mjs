import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const EVENTS = ["opened", "answered", "offer_selected", "contact_started", "mailbox_confirmed", "feedback"];
const MARKER = "[ask-witnessops:funnel]";

/** Count exported application log events without retaining any log text. */
export function summarizeAskFunnel(lines) {
  const result = {
    basis: "Client-reported event counts, not unique visitors or verified sales",
    events: Object.fromEntries(EVENTS.map((event) => [event, 0])),
    answers: { generated: 0, guide: 0, unavailable: 0 },
    feedback: { helpful: 0, not_helpful: 0 },
  };
  for (const line of lines) {
    const start = line.indexOf(MARKER);
    if (start < 0 || line.length > 8_000) continue;
    let event;
    try { event = JSON.parse(line.slice(start + MARKER.length).trim()); } catch { continue; }
    if (!event || !EVENTS.includes(event.event)) continue;
    result.events[event.event]++;
    if (event.event === "answered" && Object.hasOwn(result.answers, event.outcome)) result.answers[event.outcome]++;
    if (event.event === "feedback" && Object.hasOwn(result.feedback, event.feedback)) result.feedback[event.feedback]++;
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Usage: node scripts/summarize-ask-funnel.mjs < exported-application.log
  const counts = summarizeAskFunnel([]);
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    const partial = summarizeAskFunnel([line]);
    for (const group of ["events", "answers", "feedback"]) {
      for (const key of Object.keys(counts[group])) counts[group][key] += partial[group][key];
    }
  }
  process.stdout.write(`${JSON.stringify(counts, null, 2)}\n`);
}

import type { TicketTriageInput, TicketTriageOutput } from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selected(value: string, candidate: string): string {
  return value === candidate ? " selected" : "";
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "<p class=muted>None recorded.</p>";
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderOutput(output: TicketTriageOutput): string {
  if (!output.triage) {
    return `<section class="result failure">
      <p class="eyebrow">Safe failure</p>
      <h2>${escapeHtml(output.failure?.code ?? "INTERNAL_ERROR")}</h2>
      <p>${escapeHtml(output.failure?.message ?? "The request could not be completed.")}</p>
      <p><strong>Human action:</strong> ${escapeHtml(output.failure?.human_action ?? "Complete triage manually.")}</p>
    </section>`;
  }

  const triage = output.triage;
  return `<section class=result>
    <div class=result-header>
      <div>
        <p class=eyebrow>AI-assisted draft — human review required</p>
        <h2>${escapeHtml(triage.summary)}</h2>
      </div>
      <div class=priority>${escapeHtml(triage.suggested_priority.level)}</div>
    </div>
    <div class=controls>
      <span>Category: ${escapeHtml(triage.category)}</span>
      <span>Queue: ${escapeHtml(triage.suggested_assignment.queue)}</span>
      <span>Confidence: ${escapeHtml(triage.suggested_priority.confidence)}</span>
      <span>No external action performed</span>
    </div>
    <div class=grid>
      <article><h3>Facts</h3>${renderList(triage.facts)}</article>
      <article><h3>Assumptions</h3>${renderList(triage.assumptions)}</article>
      <article><h3>Missing information</h3>${renderList(
        triage.missing_information.map(
          (item) => `${item.question} — ${item.reason}`,
        ),
      )}</article>
      <article><h3>Uncertainties</h3>${renderList(triage.uncertainties)}</article>
    </div>
    <article>
      <h3>Suggested next actions</h3>
      <ol>${triage.next_actions
        .map(
          (item) =>
            `<li>${escapeHtml(item.action)} <span class=muted>(${escapeHtml(item.owner)}; human approval required)</span></li>`,
        )
        .join("")}</ol>
    </article>
    <article class=draft>
      <h3>Draft customer response</h3>
      <p>${escapeHtml(triage.draft_customer_response)}</p>
    </article>
  </section>`;
}

export function renderPage(args: {
  ticket: TicketTriageInput;
  output?: TicketTriageOutput;
}): string {
  const { ticket } = args;
  const context = ticket.context;

  return `<!doctype html>
<html lang=en>
<head>
  <meta charset=utf-8>
  <meta name=viewport content="width=device-width, initial-scale=1">
  <meta name=robots content="noindex,nofollow,noarchive">
  <title>WitnessOps Ticket Triage Demo</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #24231f; background: #f3f0e8; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 80px; }
    header { margin-bottom: 30px; }
    h1 { max-width: 780px; margin: 8px 0 12px; font-size: clamp(2rem, 5vw, 4.5rem); line-height: .98; letter-spacing: -.045em; }
    h2 { margin: 4px 0 0; line-height: 1.18; }
    h3 { margin-top: 0; }
    p { line-height: 1.55; }
    .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; font-weight: 750; color: #676159; }
    .boundary { max-width: 760px; color: #676159; }
    .fixtures { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }
    .fixtures a { color: inherit; border: 1px solid #c9c1b5; padding: 8px 12px; border-radius: 999px; text-decoration: none; background: #fff; }
    form, .result { background: #fff; border: 1px solid #c9c1b5; border-radius: 20px; padding: clamp(20px, 4vw, 36px); box-shadow: 0 18px 55px rgba(36,35,31,.07); }
    form { display: grid; gap: 18px; }
    .form-grid, .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    label { display: grid; gap: 7px; font-weight: 650; }
    input, textarea, select { width: 100%; border: 1px solid #aaa397; border-radius: 9px; padding: 11px 12px; font: inherit; background: #fff; color: inherit; }
    textarea { min-height: 140px; resize: vertical; }
    button { width: fit-content; border: 0; border-radius: 999px; padding: 12px 18px; font: inherit; font-weight: 750; background: #24231f; color: #fff; cursor: pointer; }
    .result { margin-top: 28px; }
    .result-header { display: flex; gap: 20px; justify-content: space-between; align-items: flex-start; }
    .priority { min-width: 58px; height: 58px; display: grid; place-items: center; border-radius: 50%; background: #24231f; color: #fff; font-weight: 800; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }
    .controls span { border: 1px solid #c9c1b5; border-radius: 999px; padding: 7px 10px; font-size: .85rem; }
    article { border-top: 1px solid #e9e4da; padding-top: 18px; }
    .grid article { min-width: 0; }
    .draft { margin-top: 20px; padding: 20px; background: #f3f0e8; border-radius: 12px; border-top: 0; }
    .muted { color: #676159; }
    .failure { border-color: #a54835; }
    @media (max-width: 720px) { .form-grid, .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<main>
  <header>
    <p class=eyebrow>WitnessOps Company AI Workspace v0.1</p>
    <h1>Ticket triage, under human control.</h1>
    <p class=boundary>This private demonstration uses synthetic data. It prepares a structured draft only. It cannot send messages, update tickets, reset accounts, or perform any external action.</p>
    <nav class=fixtures aria-label="Synthetic fixtures">
      <a href="/?fixture=DEMO-001">Access failure</a>
      <a href="/?fixture=DEMO-002">Suspected phishing</a>
      <a href="/?fixture=DEMO-003">Performance issue</a>
      <a href="/?fixture=DEMO-004">Injection safety</a>
    </nav>
  </header>
  <form method=post action=/triage>
    <input type=hidden name=received_at value="${escapeHtml(ticket.received_at)}">
    <div class=form-grid>
      <label>Ticket ID<input name=ticket_id readonly required value="${escapeHtml(ticket.ticket_id)}"></label>
      <label>Channel<select name=channel>
        <option value=email${selected(ticket.channel, "email")}>Email</option>
        <option value=portal${selected(ticket.channel, "portal")}>Portal</option>
        <option value=phone_note${selected(ticket.channel, "phone_note")}>Phone note</option>
      </select></label>
      <label>Requester<input name=requester_name required maxlength=100 value="${escapeHtml(ticket.requester.display_name)}"></label>
      <label>Company<input name=requester_company required maxlength=120 value="${escapeHtml(ticket.requester.company)}"></label>
      <label>Contact<input name=requester_contact required type=email maxlength=254 value="${escapeHtml(ticket.requester.contact)}"></label>
      <label>Reported impact<select name=reported_impact>
        <option value=single_user${selected(ticket.reported_impact, "single_user")}>Single user</option>
        <option value=multiple_users${selected(ticket.reported_impact, "multiple_users")}>Multiple users</option>
        <option value=company_wide${selected(ticket.reported_impact, "company_wide")}>Company-wide</option>
        <option value=unknown${selected(ticket.reported_impact, "unknown")}>Unknown</option>
      </select></label>
    </div>
    <label>Subject<input name=subject required maxlength=160 value="${escapeHtml(ticket.subject)}"></label>
    <label>Description<textarea name=description required maxlength=4000>${escapeHtml(ticket.description)}</textarea></label>
    <div class=form-grid>
      <label>Affected service<input name=affected_service maxlength=120 value="${escapeHtml(context.affected_service ?? "")}"></label>
      <label>Device type<input name=device_type maxlength=80 value="${escapeHtml(context.device_type ?? "")}"></label>
      <label>Operating system<input name=operating_system maxlength=80 value="${escapeHtml(context.operating_system ?? "")}"></label>
      <label>Location<input name=location maxlength=120 value="${escapeHtml(context.location ?? "")}"></label>
    </div>
    <label>Error message<input name=error_message maxlength=500 value="${escapeHtml(context.error_message ?? "")}"></label>
    ${ticket.attachments
      .map(
        (attachment, index) => `<fieldset>
      <legend>Attachment metadata only</legend>
      <input type=hidden name=attachment_${index}_file_name value="${escapeHtml(attachment.file_name)}">
      <input type=hidden name=attachment_${index}_media_type value="${escapeHtml(attachment.media_type)}">
      <input type=hidden name=attachment_${index}_description value="${escapeHtml(attachment.description)}">
      <p>${escapeHtml(attachment.file_name)} — ${escapeHtml(attachment.media_type)}. No file bytes are uploaded.</p>
    </fieldset>`,
      )
      .join("")}
    <button type=submit>Generate triage</button>
  </form>
  ${args.output ? renderOutput(args.output) : ""}
</main>
</body>
</html>`;
}

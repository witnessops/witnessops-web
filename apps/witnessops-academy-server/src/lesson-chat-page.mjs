function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** The page contains no saved learner state. The authenticated API supplies it. */
export function lessonChatPage(session, communityUrl = null) {
  const signedIn = Boolean(session);
  const community = signedIn && communityUrl
    ? `<a href="${escapeHtml(communityUrl)}" target="_blank" rel="noopener noreferrer">Community</a>` : '';
  const csrf = signedIn
    ? `<script type="application/json" id="academy-csrf">${JSON.stringify(session.csrf_token).replaceAll('<', '\\u003c')}</script>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>It’s done. Prove it. · WitnessOps Academy</title>
<link rel="icon" type="image/png" href="/assets/control-256.png">
<link rel="stylesheet" href="/academy/static/lesson-chat.css"></head>
<body><a class="skip-link" href="#lesson-chat">Skip to lesson</a>
<header class="chat-site"><a class="chat-brand" href="/" aria-label="WitnessOps Academy home"><img src="/assets/witnessops-horizontal-white.svg" alt="WitnessOps"><span>Academy</span></a>
<nav aria-label="Lesson navigation"><a href="/academy/learn/report-or-evidence">Written lesson</a>${community}<button id="chat-sign-out" type="button"${signedIn ? '' : ' hidden'}>Sign out</button></nav></header>
<main class="chat-shell" id="lesson-chat" data-api="/academy/api/lessons/report-or-evidence/chat">
<section class="chat-intro" aria-labelledby="lesson-title"><p class="eyebrow">Verify results · Lesson 1</p><div class="chat-title-row"><h1 id="lesson-title">It’s done. Prove it.</h1><span class="simulation">Simulated exercise</span></div>
<p class="chat-dek">An agent says the work is done. Read the record, make a judgment, and choose what to check next.</p>
<div class="chat-progress-row"><span id="chat-step">Three decisions · about 3 minutes</span><progress id="chat-progress" max="3" value="0" aria-label="Lesson progress">0 of 3</progress></div>
<p class="save-note">Each choice saves your progress. Return here or continue through the Academy connector in ChatGPT with the same account.</p></section>
<section class="chat-session" aria-label="Saved progress"><p id="chat-status" role="status" aria-live="polite">${signedIn ? 'Loading your lesson…' : 'Sign in to start and save this lesson.'}</p>
<div class="session-actions"><a class="primary-link" id="chat-sign-in" href="/academy/auth/login?lesson=report-or-evidence&amp;mode=chat"${signedIn ? ' hidden' : ''}>Sign in to start</a>
<button id="retry-decision" type="button" hidden>Retry this choice</button><button id="reload-progress" type="button" hidden>Reload saved progress</button></div></section>
<section class="conversation" aria-label="Lesson conversation"><div class="conversation-heading"><img src="/assets/docs-256.png" alt="" width="44" height="44"><div><h2>At the evidence desk</h2><p>Docs · your guide</p></div><span class="conversation-marker" aria-hidden="true">01</span></div>
<ol id="chat-messages" class="chat-messages" aria-label="Conversation so far"></ol>
<section id="chat-evidence" class="chat-evidence" aria-label="Evidence to inspect"></section>
<section class="decision" aria-labelledby="chat-prompt"><p class="decision-label">Your decision</p><h3 id="chat-prompt" tabindex="-1">${signedIn ? 'Your next step is loading.' : 'Your choices will appear after sign-in.'}</h3><div id="chat-options" class="chat-options"></div></section>
<section id="chat-outcome" class="chat-outcome" aria-labelledby="outcome-title" hidden><p class="eyebrow">Lesson complete</p><h3 id="outcome-title">A judgment the evidence can support.</h3><dl id="outcome-facts"></dl><p class="lesson-principle">Done is a claim. Proven is a condition. Accepted is a human decision.</p><a class="primary-link" href="/academy/learn/same-scope">Continue to Lesson 2 <span aria-hidden="true">→</span></a></section></section>
<div class="chat-bottom"><p class="simulation-note">Fictional records, real practice. This exercise runs no backup or restore and makes no changes to any machine. No formal award is issued.</p>
<details class="chatgpt-help" id="chatgpt-help"><summary>Learn with ChatGPT <span aria-hidden="true">↗</span></summary><div><p>If the Academy connector is available in your ChatGPT account, open it and sign in with the same Academy account.</p><p>For a custom connection, use this server URL and sign in with your Academy account: <a href="https://academy.witnessops.com/mcp" target="_blank" rel="noopener noreferrer">https://academy.witnessops.com/mcp</a>. The connection must be enabled for your account; opening this address does not install it.</p><p>Ask: <q>Start the Academy lesson Report or evidence?</q> To continue later, ask to resume the lesson. The website and connector use the same saved choices.</p><p>If the connector is not connected yet, you can complete the lesson here.</p></div></details></div>
<noscript><p class="no-script">JavaScript is required for this interactive lesson. You can still read the <a href="/academy/learn/report-or-evidence">written lesson</a>.</p></noscript>
</main><footer class="chat-footer">WitnessOps Academy <span>Learn freely. Judge carefully.</span></footer>
${csrf}<script type="module" src="/academy/static/lesson-chat.js"></script></body></html>`;
}

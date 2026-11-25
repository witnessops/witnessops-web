import { lessonById } from './lesson-routes.mjs';
import { communityUrl as validateCommunityUrl } from './community-link.mjs';

const TITLES = Object.freeze({
  'report-or-evidence': { number: '01', title: 'Report or evidence?' },
  'same-scope': { number: '02', title: 'Same record, wrong scope?' },
});

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function shell({ title, activeLesson, body, session, communityUrl = null, connection = false }) {
  const community = communityUrl ? validateCommunityUrl(communityUrl) : null;
  const lessons = Object.entries(TITLES).map(([id, item]) => `<a class="lesson-link${activeLesson === id ? ' current' : ''}" href="/academy/learn/${id}"${activeLesson === id ? ' aria-current="page"' : ''}><span class="lesson-number">${item.number}</span><span>${item.title}</span></a>`).join('');
  return `<!doctype html>
<html lang="en"${session ? ' data-academy-authenticated' : ''}>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)} · WitnessOps Academy</title><link rel="stylesheet" href="/academy/static/chat.css"></head>
<body>
<a class="skip-link" href="#main-content">Skip to lesson</a>
<div class="academy-shell">
<aside class="academy-sidebar" aria-label="Academy navigation">
<a class="academy-brand" href="/"><span class="brand-symbol" aria-hidden="true">W</span><span>WITNESSOPS<span class="brand-subtitle">ACADEMY</span></span></a>
<p class="sidebar-label">Learn by deciding</p>
<nav class="lesson-navigation" aria-label="Lessons">${lessons}</nav>
<div class="sidebar-note"><span class="small-rule"></span><p>Done is a claim.<br>Make your own call.</p></div>
<nav class="account-navigation" aria-label="Your Academy"><a href="/academy/connect/chatgpt"${connection ? ' aria-current="page"' : ''}>Learn with ChatGPT <span aria-hidden="true">↗</span></a>${session && community ? `<a href="${escapeHtml(community)}" target="_blank" rel="noopener noreferrer">Community <span aria-hidden="true">↗</span></a>` : ''}<a href="/academy/account">Your account</a></nav>
</aside>
<div class="academy-main">
<header class="mobile-header"><a href="/" class="mobile-brand">WITNESSOPS <span>ACADEMY</span></a><a href="/academy/account">Account</a></header>
${body}
</div></div>
${session ? `<script type="application/json" id="academy-csrf">${JSON.stringify(session.csrf_token).replaceAll('<', '\\u003c')}</script>` : ''}
${connection ? '' : '<script type="module" src="/academy/static/chat.js"></script>'}
</body></html>`;
}

/** Only session metadata enters the HTML. All lesson and learner content is loaded as data. */
export function chatPage({ session = null, lesson, communityUrl = null }) {
  const canonical = lessonById(lesson?.id);
  if (!canonical) throw new Error('Unknown chat lesson');
  const display = TITLES[canonical.id];
  const login = canonical.id === 'report-or-evidence' ? '/academy/auth/login' : `/academy/auth/login?lesson=${canonical.id}`;
  const body = `<header class="lesson-header"><div><p class="eyebrow">LESSON ${display.number} <span class="separator">/</span> PRACTICAL JUDGMENT</p><h1>${display.title}</h1></div><a class="chatgpt-link" href="/academy/connect/chatgpt">Learn with ChatGPT <span aria-hidden="true">↗</span></a></header>
<main id="main-content" class="lesson-main" data-chat-api="/academy/api/lessons/${canonical.id}/chat" data-lesson-id="${canonical.id}">
<div class="lesson-toolbar"><p class="scenario-label">Your scenario. Your decision.</p><p id="step-label" class="step-label">3 decisions</p></div>
<progress id="lesson-progress" max="3" value="0" aria-label="Lesson progress">0 of 3 decisions</progress>
<section id="lesson-welcome" class="lesson-welcome" aria-labelledby="welcome-title">
<span class="case-label">A SMALL CASE. A REAL JUDGMENT.</span><h2 id="welcome-title">${canonical.id === 'report-or-evidence' ? 'It’s done.<br>Prove it.' : 'Same record.<br>Right scope?'}</h2>
<p>Inspect the records. Decide what they support. Choose the next check.</p><p class="welcome-detail">Your case is assigned when you start. Return here or continue in ChatGPT with the same Academy account.</p>
<button id="start-lesson" class="primary-button" type="button"${session ? ' disabled' : ' hidden'}>Start lesson <span aria-hidden="true">→</span></button>
<a id="sign-in" class="primary-button" href="${login}"${session ? ' hidden' : ''}>Sign in to start <span aria-hidden="true">→</span></a>
</section>
<section id="conversation" class="conversation" role="log" aria-label="Lesson conversation" aria-live="polite" aria-relevant="additions" hidden></section>
<section id="decision-panel" class="decision-panel" aria-labelledby="decision-prompt" hidden>
<p class="eyebrow">YOUR CALL</p><h2 id="decision-prompt" tabindex="-1"></h2>
<form id="decision-form"><fieldset id="decision-choices"><legend class="visually-hidden">Choose your judgment</legend></fieldset><div class="decision-actions"><button id="submit-decision" class="primary-button" type="submit" disabled>Submit judgment <span aria-hidden="true">↑</span></button><p>Each submitted decision is saved.</p></div></form>
</section>
<section id="lesson-complete" class="completion" aria-labelledby="complete-title" hidden><p class="eyebrow">EXERCISE COMPLETE</p><h2 id="complete-title" tabindex="-1">You made the call.</h2><div id="final-record"></div><p>This is your decision record for a simulated case. No formal award is issued.</p><a id="next-lesson" class="primary-button" hidden>Continue to Lesson 2 <span aria-hidden="true">→</span></a></section>
<div class="lesson-status-bar"><p id="chat-status" role="status" aria-live="polite">${session ? 'Loading your lesson…' : 'Sign in to keep your scenario and decisions with your account.'}</p><div class="recovery-actions"><button id="retry-request" class="text-button" type="button" hidden>Retry saving</button><button id="reload-attempt" class="text-button" type="button" hidden>Load saved lesson</button><a id="return-account" href="/academy/account" hidden>Your account</a></div></div>
<footer class="lesson-footer"><span>Simulated exercise · No real infrastructure involved</span><a href="${canonical.route}?format=worksheet">Open worksheet</a></footer>
<noscript><p class="noscript-message">JavaScript is required for the interactive lesson. You can <a href="${canonical.route}?format=worksheet">open the worksheet</a> to read the lesson.</p></noscript>
</main>`;
  return shell({ title: display.title, activeLesson: canonical.id, body, session, communityUrl });
}

/** Setup information is deliberately separate from a verified installed-plugin link. */
export function chatConnectionPage({ session = null, communityUrl = null } = {}) {
  const body = `<header class="lesson-header"><div><p class="eyebrow">CONTINUE THE CONVERSATION</p><h1>Learn with ChatGPT</h1></div><a class="chatgpt-link" href="/academy/learn/report-or-evidence">Back to your lesson <span aria-hidden="true">→</span></a></header>
<main id="main-content" class="connection-main"><span class="case-label">CONNECTION SETUP</span><h2>Your case.<br>A different window.</h2><p class="connection-intro">Connect WitnessOps Academy to ChatGPT, then work through the lesson in a conversation. Use the same WitnessOps account to continue your assigned case and saved decisions.</p>
<section class="connection-steps" aria-label="Connect Academy to ChatGPT"><h3>Connect your Academy</h3><ol><li>In ChatGPT, open <strong>Plugins</strong>, choose <strong>+</strong>, then <strong>Add custom MCP server</strong>.</li><li>Use the server address below. Select <strong>OAuth</strong> authentication and sign in with your WitnessOps account.</li><li>Create and install the plugin, then select <strong>WitnessOps Academy</strong> with an <strong>@ mention</strong> in a conversation.</li></ol><p class="connection-caveat">Availability depends on your ChatGPT account and workspace. This page does not confirm that the connection has been enabled or installed.</p></section>
<div class="connection-address"><label for="mcp-address">Academy MCP server address</label><input id="mcp-address" value="https://academy.witnessops.com/mcp" readonly spellcheck="false"><p>This address is for the connection form. It does not open a lesson chat.</p></div>
<section class="starter-prompt"><h3>Then start the conversation</h3><p>After selecting the Academy plugin, paste:</p><pre><code>Start Lesson 1: Report or evidence? Resume my saved case if I have already started.</code></pre><p>ChatGPT will ask for one decision at a time. Your Academy account controls access to your own saved work.</p></section>
<div class="connection-links"><a class="primary-button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT <span aria-hidden="true">↗</span></a><a href="https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt" target="_blank" rel="noopener noreferrer">Official connection instructions <span aria-hidden="true">↗</span></a></div><p class="connection-caveat">If Academy is not available to connect yet, your lesson remains available here.</p><a class="text-link" href="/academy/learn/report-or-evidence">Continue in Academy →</a>
</main>`;
  return shell({ title: 'Learn with ChatGPT', body, session, communityUrl, connection: true });
}

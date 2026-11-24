import { DEFAULT_LESSON } from './lesson-routes.mjs';
import { supportLinks } from './invitation-page.mjs';
export const LESSON_ROUTE = DEFAULT_LESSON.route;
export const LESSON_ALIASES = new Set(DEFAULT_LESSON.aliases);

/** Trusted lesson source + a random session CSRF token; learner text never enters HTML. */
export function lessonPage(html, session, lesson = DEFAULT_LESSON, communityUrl = null) {
  const community = session && communityUrl
    ? `<p><a id="community-link" class="btn ghost" href="${communityUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}" target="_blank" rel="noopener noreferrer">Community (opens in a new tab)</a></p>` : '';
  const loginPath = lesson === DEFAULT_LESSON ? '/academy/auth/login' : `/academy/auth/login?lesson=${lesson.id}`;
  const controls = `<section class="learner-session" aria-label="Your saved lesson">
<h2>Your lesson work</h2>
<p id="progress-status" role="status" aria-live="polite">${session ? 'Loading your saved work…' : 'Sign in to save your work and return to it.'}</p>
<p>Choose Save work before you leave, and wait for the saved confirmation. Your answers, pasted feedback and earlier attempts stay with your account. Unsaved edits are lost when you leave. Saving work does not send it to support.</p>
<div class="btnrow"><a class="btn" id="sign-in" href="${loginPath}"${session ? ' hidden' : ''}>Sign in</a>
<button type="button" class="btn" id="save-progress" disabled${session ? '' : ' hidden'}>Save work</button>
<button type="button" class="btn ghost" id="sign-out"${session ? '' : ' hidden'}>Sign out</button>
<button type="button" class="btn ghost" id="retry-load" hidden>Retry loading</button></div>
<div id="other-draft" hidden><label for="saved-text">Your saved text</label><textarea id="saved-text" readonly></textarea>
<p>This saved text uses a different format. It stays unchanged unless you choose to replace it with the lesson form.</p>
<button type="button" class="btn ghost" id="replace-draft">Use lesson form instead</button></div>
${community}<p><a href="#lesson-support">Lesson questions and help</a></p><noscript>JavaScript is required to load and save your work.</noscript></section>`;
  return html.replace('<form id="lesson-form"', `<form id="lesson-form" data-draft-api="${lesson.draftPath}"`)
    .replace('<html lang="en">', `<html lang="en"${session ? ' data-academy-authenticated' : ''}>`)
    .replace('<!-- academy-session -->', controls)
    .replace('Keeps the records. Explains, shows, then reads your attempt. Coaches; never grades.',
      'Keeps the records. Explains the idea and shows a worked example. Coaching, not grading.')
    .replace('You can still read the lesson and write your answers in your existing conversation.',
      'You can still read the lesson and keep your answers separately.')
    .replace('Your choices and words appear here as plain text. Copy them into your existing conversation with Docs.',
      'Your choices and words appear here as plain text. If you ask for help, choose which parts to copy and share.')
    .replace("Paste Docs's reply for this attempt", 'Paste feedback you received for this attempt')
    .replace('Paste the reply you received in your existing conversation.', 'Paste feedback you chose to keep for this attempt.')
    .replace('Pasted feedback is your record of that conversation.', 'Pasted feedback is your own record of the help you received.')
    .replace(/(<p class="manual" id="lesson-storage-help">)[\s\S]*?<\/p>/,
      `$1Choose Save work to keep this attempt. For a lesson question, include the lesson title and what you need help with; choose any excerpt you want to share. Saving your work does not request feedback.</p><section id="lesson-support" aria-label="Lesson questions and help"><h3>Ask for help</h3>${supportLinks(true)}<p>If you receive feedback, paste it below, try again and choose Save work.</p></section>`)
    .replace(/(<p class="manual" id="lesson-history-help">)[\s\S]*?<\/p>/,
      '$1Use the feedback to edit your own answers. Starting a retry keeps the previous attempt below. Choose Save work to keep the updated lesson.</p>')
    .replace('</body>', `${session ? `<script type="application/json" id="academy-csrf">${JSON.stringify(session.csrf_token).replaceAll('<', '\\u003c')}</script>` : ''}<script type="module" src="/academy/static/lesson.js"></script></body>`);
}

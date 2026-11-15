export const LESSON_ROUTE = '/academy/learn/report-or-evidence';
export const LESSON_ALIASES = new Set(['/lessons/report-or-evidence', '/lessons/report-or-evidence/', '/lessons/report-or-evidence/index.html']);

/** Trusted lesson source + a random session CSRF token; learner text never enters HTML. */
export function lessonPage(html, session) {
  const controls = `<section class="learner-session" aria-label="Your saved lesson">
<h2>Your lesson work</h2>
<p id="progress-status" role="status" aria-live="polite">${session ? 'Loading your saved work…' : 'Sign in to save your work and return to it.'}</p>
<div class="btnrow"><a class="btn" id="sign-in" href="/academy/auth/login"${session ? ' hidden' : ''}>Sign in</a>
<button type="button" class="btn" id="save-progress" disabled${session ? '' : ' hidden'}>Save work</button>
<button type="button" class="btn ghost" id="sign-out"${session ? '' : ' hidden'}>Sign out</button>
<button type="button" class="btn ghost" id="retry-load" hidden>Retry loading</button></div>
<div id="other-draft" hidden><label for="saved-text">Your saved text</label><textarea id="saved-text" readonly></textarea>
<p>This saved text uses a different format. It stays unchanged unless you choose to replace it with the lesson form.</p>
<button type="button" class="btn ghost" id="replace-draft">Use lesson form instead</button></div>
<noscript>JavaScript is required to load and save your work.</noscript></section>`;
  return html.replace('<html lang="en">', `<html lang="en"${session ? ' data-academy-authenticated' : ''}>`)
    .replace('<!-- academy-session -->', controls)
    .replace(/(<p class="manual" id="lesson-storage-help">)[\s\S]*?<\/p>/,
      '$1Copy your answer into your existing conversation with Docs by hand. Sign in and choose Save work to keep your answers, pasted feedback and earlier attempts between visits. Unsaved edits are lost when you leave.</p>')
    .replace(/(<p class="manual" id="lesson-history-help">)[\s\S]*?<\/p>/,
      '$1Use the feedback to edit your own answers. Starting a retry keeps the previous attempt below. Choose Save work to keep the updated lesson.</p>')
    .replace('</body>', `${session ? `<script type="application/json" id="academy-csrf">${JSON.stringify(session.csrf_token).replaceAll('<', '\\u003c')}</script>` : ''}<script type="module" src="/academy/static/lesson.js"></script></body>`);
}

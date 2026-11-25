/** Academy Decision Room inside a Matrix/Element iframe.
 * No Matrix events, user IDs, room IDs or tokens are read or transmitted.
 * Existing Academy session + admission + CSRF + chat-store decide all authority.
 */
(() => {
  'use strict';
  const lessonId = 'report-or-evidence';
  const endpoint = `/academy/api/lessons/${lessonId}/chat`;
  const rawCsrf = document.getElementById('academy-csrf')?.textContent;
  let csrf = '';
  try { csrf = JSON.parse(rawCsrf ?? '""'); } catch { /* refuse writes */ }
  if (typeof csrf !== 'string' || !csrf) csrf = '';

  const fail = (error, status) => ({ result: { isError: true, structuredContent: { error, status } } });
  const succeeded = data => ({ result: { structuredContent: data } });
  const validLesson = args => args && typeof args === 'object' && args.lesson_id === lessonId;

  async function request(name, args) {
    if (!validLesson(args)) return fail('unsupported_lesson', 400);
    let options = { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' };
    if (name === 'start_lesson' || name === 'submit_decision') {
      if (!csrf) return fail('session_unavailable', 401);
      const body = name === 'start_lesson'
        ? { action: 'start', request_id: args.request_id }
        : { action: 'submit', attempt_id: args.attempt_id, stage: args.stage,
          expected_version: args.expected_version, choice_id: args.choice_id, request_id: args.request_id };
      options = { ...options, method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body) };
    } else if (name !== 'resume_lesson' && name !== 'inspect_evidence') {
      return fail('unknown_action', 400);
    }
    // An uncertain write retains its original UUID in the UI; never auto-repeat.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const response = await fetch(endpoint, { ...options, signal: ctrl.signal });
      const data = await response.json();
      if (!data || typeof data !== 'object') return fail('invalid_response', 502);
      if (response.status === 404 && data.error === 'no_attempt' && options.method === 'GET') return succeeded(data);
      if (!response.ok) return fail(typeof data.error === 'string' ? data.error : 'request_rejected', response.status);
      return succeeded(data);
    } finally {
      clearTimeout(timer);
    }
  }

  window.AcademyMatrixTransport = Object.freeze({
    post(method, params, expectsResponse) {
      if (!expectsResponse || method !== 'tools/call' || !params || typeof params !== 'object') {
        throw new Error('Unsupported Matrix transport operation');
      }
      return request(params.name, params.arguments);
    },
    async open({ acceptPayload, showError }) {
      try {
        const response = await request('resume_lesson', { lesson_id: lessonId });
        if (response.result.isError) {
          showError(`Academy could not load this private lesson (${response.result.structuredContent.error}). Open Academy to check your account and access.`);
        } else {
          acceptPayload(response.result);
        }
      } catch {
        showError('Academy did not return a confirmed result. Reload the widget to read saved progress.');
      }
    },
  });
})();

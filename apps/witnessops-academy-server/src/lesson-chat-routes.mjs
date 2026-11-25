// Exact lesson and return targets. Request fields never select a learner or storage key.
export const CHAT_LESSON_ID = 'report-or-evidence';
export const CHAT_ROUTE = '/academy/learn/report-or-evidence/chat';
export const CHAT_API = '/academy/api/lessons/report-or-evidence/chat';
export const CHAT_DECISION_API = `${CHAT_API}/decision`;

export function isChatLogin(lessonId, mode) {
  return lessonId === CHAT_LESSON_ID && mode === 'chat';
}

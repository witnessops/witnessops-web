// Exact curriculum allowlist. Browser fields never select a draft owner.
export const LESSONS = Object.freeze(['report-or-evidence', 'same-scope'].map(id => Object.freeze({
  id,
  route: `/academy/learn/${id}`,
  draftPath: `/academy/api/lessons/${id}/draft`,
  publicPath: `/lessons/${id}/`,
  aliases: Object.freeze([`/lessons/${id}`, `/lessons/${id}/`, `/lessons/${id}/index.html`]),
})));
export const DEFAULT_LESSON = LESSONS[0];
export const lessonById = id => LESSONS.find(lesson => lesson.id === id);
export const lessonByRoute = path => LESSONS.find(lesson => lesson.route === path);
export const lessonByDraft = path => LESSONS.find(lesson => lesson.draftPath === path);
export const lessonByAlias = path => LESSONS.find(lesson => lesson.aliases.includes(path));

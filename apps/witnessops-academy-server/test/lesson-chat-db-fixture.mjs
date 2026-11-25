// In-memory query fixture for service-free contract tests. It models the store's
// compare-and-set results; it is not evidence of PostgreSQL locking or grants.
export function createLessonChatMemoryPool() {
  const rows = new Map();
  let writes = 0;
  const key = (owner, lesson) => `${owner}:${lesson}`;
  const copy = value => value ? structuredClone(value) : undefined;
  return {
    get writes() { return writes; },
    seed(owner, lesson, row) { rows.set(key(owner, lesson), copy(row)); },
    get(owner, lesson) { return copy(rows.get(key(owner, lesson))); },
    async query(sql, params) {
      if (!Array.isArray(params) || typeof params[0] !== 'string' || typeof params[1] !== 'string') {
        throw new Error('fixture requires owner and lesson constraints');
      }
      const [owner, lesson, content, requestId, expectedVersion] = params;
      const entryKey = key(owner, lesson);
      const current = rows.get(entryKey);
      const statement = sql.trim();
      if (statement.startsWith('SELECT content, version, last_save_request_id, updated_at FROM academy_lesson_drafts WHERE owner_id = $1 AND lesson_id = $2')) {
        return { rowCount: current ? 1 : 0, rows: current ? [copy(current)] : [] };
      }
      const insert = statement.startsWith('INSERT INTO academy_lesson_drafts(');
      const update = statement.startsWith('UPDATE academy_lesson_drafts SET content=$3, version=version+1, last_save_request_id=$4, updated_at=now()');
      if (!insert && !update) throw new Error('unexpected fixture query');
      if (insert && current || update && (!current || current.version !== expectedVersion)) return { rowCount: 0, rows: [] };
      writes += 1;
      const next = {
        content, version: insert ? 1 : current.version + 1,
        last_save_request_id: requestId,
        updated_at: new Date(Date.UTC(2026, 10, 25, 0, 0, writes)),
      };
      rows.set(entryKey, next);
      return { rowCount: 1, rows: [{ version: next.version, updated_at: next.updated_at }] };
    },
  };
}

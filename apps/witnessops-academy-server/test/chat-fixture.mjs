// Deliberately synthetic SQL adapter. This tests application/CAS behavior, not PostgreSQL itself.
export function fixtureDb() {
  const rows = new Map();
  const calls = [];
  const clone = value => structuredClone(value);
  let ticks = 0;
  const stamp = () => new Date(Date.UTC(2026, 10, 25, 0, 0, ticks++)).toISOString();
  return { rows, calls, async query(sql, values) {
    calls.push({ sql, values: clone(values) });
    const [owner, lesson, content, requestId, version] = values;
    const key = `${owner}/${lesson}`;
    const current = rows.get(key);
    if (sql.startsWith('SELECT ')) return { rows: current ? [clone(current)] : [], rowCount: current ? 1 : 0 };
    if (sql.startsWith('INSERT ') && !current || sql.startsWith('UPDATE ') && current?.version === version) {
      const next = { content, version: current ? current.version + 1 : 1, updated_at: stamp(), last_save_request_id: requestId };
      rows.set(key, clone(next));
      return { rows: [next], rowCount: 1 };
    }
    if (sql.startsWith('INSERT ') || sql.startsWith('UPDATE ')) return { rows: [], rowCount: 0 };
    throw new Error('Unexpected fixture query');
  } };
}

export const OWNER_A = '00000000-0000-4000-8000-000000000001';
export const OWNER_B = '00000000-0000-4000-8000-000000000002';

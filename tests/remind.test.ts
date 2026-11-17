import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
// Die Logik steht in der Edge Function (Deno) und wird hier zwischen den Markern herausgelöst und getestet.
const src = readFileSync(new URL('../supabase/functions/remind/index.ts', import.meta.url), 'utf8')
const block = src.slice(src.indexOf('// --- logic:start'), src.indexOf('// --- logic:end'))
const js = stripTypeScriptTypes(block) + '\nexport { dueKinds }\n'
const { dueKinds } = (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))) as { dueKinds: (...a: any[]) => any }
let fail = 0
const eq = (n: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(ok ? 'OK  ' : 'FAIL', n, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`) }
const base = { timezone: 'Europe/Berlin', morning_on: true, morning_time: '07:30', evening_on: true, evening_time: '20:30', last_morning: null, last_evening: null }
const k = (sub: object, iso: string) => dueKinds({ ...base, ...sub } as never, new Date(iso)).map((x) => x.kind + '@' + x.date)
eq('Morgen exakt (Winter, 06:30Z = 07:30 Berlin)', k({}, '2026-11-17T06:30:00Z'), ['morning@2026-11-17'])
eq('Eine Minute zu früh', k({}, '2026-11-17T06:29:00Z'), [])
eq('Nachholen 30 Min später', k({}, '2026-11-17T07:00:00Z'), ['morning@2026-11-17'])
eq('Nachholfenster vorbei (61 Min)', k({}, '2026-11-17T07:31:00Z'), [])
eq('Heute schon gesendet', k({ last_morning: '2026-11-17' }, '2026-11-17T06:35:00Z'), [])
eq('Gestern gesendet → heute wieder', k({ last_morning: '2026-11-16' }, '2026-11-17T06:35:00Z'), ['morning@2026-11-17'])
eq('Abend 20:30', k({}, '2026-11-17T19:30:00Z'), ['evening@2026-11-17'])
eq('Zwischen den Zeiten nichts', k({}, '2026-11-17T12:00:00Z'), [])
eq('Morgen aus', k({ morning_on: false }, '2026-11-17T06:30:00Z'), [])
eq('Abend aus', k({ evening_on: false }, '2026-11-17T19:30:00Z'), [])
eq('Sommerzeit (05:30Z = 07:30 CEST)', k({}, '2026-07-17T05:30:00Z'), ['morning@2026-07-17'])
eq('Sommerzeit: 06:30Z wäre 08:30 → außerhalb', k({}, '2026-07-17T06:31:00Z'), [])
eq('New York 12:30Z = 07:30 EST', k({ timezone: 'America/New_York' }, '2026-11-17T12:30:00Z'), ['morning@2026-11-17'])
eq('Datum folgt lokaler Zeitzone (Tokyo)', k({ timezone: 'Asia/Tokyo', morning_time: '07:30' }, '2026-11-16T22:30:00Z'), ['morning@2026-11-17'])
eq('Ungültige Zeitzone → Berlin', k({ timezone: 'Mars/Olympus' }, '2026-11-17T06:30:00Z'), ['morning@2026-11-17'])
eq('Ungültige Uhrzeit', k({ morning_time: 'abc', evening_on: false }, '2026-11-17T06:30:00Z'), [])
eq('Beide gleichzeitig fällig', k({ evening_time: '07:45' }, '2026-11-17T07:00:00Z'), ['morning@2026-11-17', 'evening@2026-11-17'])
eq('Mitternacht: neuer Tag, vor der Zeit', k({ last_evening: '2026-11-17' }, '2026-11-17T23:10:00Z'), [])
eq('Zeit ohne führende Null (7:30)', k({ morning_time: '7:30' }, '2026-11-17T06:30:00Z'), ['morning@2026-11-17'])
process.exit(fail ? 1 : 0)

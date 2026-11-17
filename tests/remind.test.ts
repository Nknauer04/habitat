import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
// Die Logik steht in der Edge Function (Deno) und wird hier zwischen den Markern herausgelöst und getestet.
const src = readFileSync(new URL('../supabase/functions/remind/index.ts', import.meta.url), 'utf8')
const block = src.slice(src.indexOf('// --- logic:start'), src.indexOf('// --- logic:end'))
const js = stripTypeScriptTypes(block) + '\nexport { dueKinds, dueHabitReminders }\n'
const { dueKinds, dueHabitReminders } = (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))) as { dueKinds: (...a: any[]) => any; dueHabitReminders: (...a: any[]) => any }
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

// ---------- Erinnerung je Gewohnheit ----------
// 2026-11-17 ist ein Dienstag (Index 1). 17:00Z = 18:00 Berlin.
const hab = (id: string, data: object = {}) => ({ id, data: { name: id, frequency: { type: 'daily' }, reminderTime: '18:00', ...data } })
const chk = (habitId: string, date: string, extra: object = {}) => ({ data: { habitId, date, ...extra } })
const sub = { timezone: 'Europe/Berlin', last_habits: {} as Record<string, string> }
const hr = (habits: any[], checks: any[], iso: string, s: object = {}) => dueHabitReminders({ ...sub, ...s }, habits, checks, new Date(iso)).map((x: any) => x.id)
const T = '2026-11-17T17:00:00Z'
eq('Gewohnheit: zur Uhrzeit fällig und offen', hr([hab('a')], [], T), ['a'])
eq('Gewohnheit: eine Minute zu früh', hr([hab('a')], [], '2026-11-17T16:59:00Z'), [])
eq('Gewohnheit: Nachholfenster 30 Min ok, danach nicht', [hr([hab('a')], [], '2026-11-17T17:30:00Z'), hr([hab('a')], [], '2026-11-17T18:01:00Z')], [['a'], []])
eq('Gewohnheit: schon erledigt → keine Mitteilung', hr([hab('a')], [chk('a', '2026-11-17')], T), [])
eq('Gewohnheit: gestern erledigt zählt nicht', hr([hab('a')], [chk('a', '2026-11-16')], T), ['a'])
eq('Gewohnheit: gelöschter Haken zählt nicht', hr([hab('a')], [chk('a', '2026-11-17', { deleted: true })], T), ['a'])
eq('Gewohnheit: heute schon erinnert', hr([hab('a')], [], T, { last_habits: { a: '2026-11-17' } }), [])
eq('Gewohnheit: gestern erinnert → heute wieder', hr([hab('a')], [], T, { last_habits: { a: '2026-11-16' } }), ['a'])
eq('Gewohnheit: ohne Uhrzeit/archiviert/gelöscht nie', hr([hab('a', { reminderTime: undefined }), hab('b', { archived: true }), hab('c', { deleted: true })], [], T), [])
eq('Wochentage: Dienstag ist Tag, Mittwoch nicht', [hr([hab('a', { frequency: { type: 'weekdays', days: [1, 3] } })], [], T), hr([hab('a', { frequency: { type: 'weekdays', days: [0, 2] } })], [], T)], [['a'], []])
eq('X× pro Woche: Ziel noch nicht erreicht → ja', hr([hab('a', { frequency: { type: 'perWeek', count: 3 } })], [chk('a', '2026-11-16')], T), ['a'])
eq('X× pro Woche: Sonntag der Vorwoche zählt nicht zur Woche', hr([hab('a', { frequency: { type: 'perWeek', count: 2 } })], [chk('a', '2026-11-16'), chk('a', '2026-11-15')], T), ['a'])
eq('X× pro Woche: Vorwoche zählt nicht', hr([hab('a', { frequency: { type: 'perWeek', count: 1 } })], [chk('a', '2026-11-15')], T), ['a'])
eq('X× pro Woche: Woche erreicht (Mo+Di=2 von 2)', hr([hab('a', { frequency: { type: 'perWeek', count: 2 } })], [chk('a', '2026-11-16'), chk('a', '2026-11-17')], T), [])
eq('Menge: Tagesziel nicht erreicht → ja, erreicht → nein', [hr([hab('a', { dailyTarget: 30 })], [chk('a', '2026-11-17', { value: 10 })], T), hr([hab('a', { dailyTarget: 30 })], [chk('a', '2026-11-17', { value: 10 }), chk('a', '2026-11-17', { value: 20 })], T)], [['a'], []])
eq('Menge: Haken ohne Wert gilt als Tagesziel', hr([hab('a', { dailyTarget: 30 })], [chk('a', '2026-11-17')], T), [])
eq('Mini-Haken zählt als erledigt (auch bei Mengen)', hr([hab('a', { dailyTarget: 30 })], [chk('a', '2026-11-17', { mini: true, value: 2 })], T), [])
eq('Mehrere zur selben Minute', hr([hab('a'), hab('b'), hab('c', { reminderTime: '19:00' })], [], T), ['a', 'b'])
eq('Zeitzone: Sommerzeit 16:00Z = 18:00 Berlin', hr([hab('a')], [], '2026-07-14T16:00:00Z'), ['a'])
eq('Zeitzone Tokyo: Datum und Wochentag lokal (Mi 02:00 Uhr JST Dienstag-Check)', hr([hab('a', { reminderTime: '02:00', frequency: { type: 'weekdays', days: [2] } })], [], '2026-11-17T17:00:00Z', { timezone: 'Asia/Tokyo' }), ['a'])
process.exit(fail ? 1 : 0)

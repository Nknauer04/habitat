import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
// Die Logik steht in der Edge Function (Deno) und wird hier zwischen den Markern herausgelöst und getestet.
const src = readFileSync(new URL('../supabase/functions/strava/index.ts', import.meta.url), 'utf8')
const block = src.slice(src.indexOf('// --- logic:start'), src.indexOf('// --- logic:end'))
const js = stripTypeScriptTypes(block) + '\nexport { stravaUuid, toActivityData }\n'
const { stravaUuid, toActivityData } = (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))) as { stravaUuid: (id: number) => string; toActivityData: (a: any, now: string) => any }
let fail = 0
const eq = (n: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(ok ? 'OK  ' : 'FAIL', n, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`) }
const NOW = '2026-11-18T08:00:00.000Z'
eq('Strava-ID → UUID-Form', [stravaUuid(12345678901), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(stravaUuid(7))], ['00000000-0000-4000-8000-012345678901', true])
const full = toActivityData({ id: 99, name: 'Morgenlauf', type: 'Run', sport_type: 'TrailRun', start_date: '2026-11-17T06:30:00Z', start_date_local: '2026-11-17T07:30:00Z', distance: 8412.6, moving_time: 2410.4, elapsed_time: 2500, total_elevation_gain: 54.26, average_speed: 3.4902, max_speed: 5.1, has_heartrate: true, average_heartrate: 151.4, max_heartrate: 178 }, NOW)
eq('Aktivität: Felder gerundet, lokaler Tag, Sportart', { date: full.date, sport: full.sportType, d: full.distance, t: full.movingTime, el: full.elevation, sp: full.avgSpeed, hr: [full.avgHr, full.maxHr] }, { date: '2026-11-17', sport: 'TrailRun', d: 8413, t: 2410, el: 54.3, sp: 3.49, hr: [151, 178] })
eq('Aktivität: Sync-Felder', [full.id, full.updatedAt, full.deleted], ['00000000-0000-4000-8000-000000000099', NOW, false])
const bare = toActivityData({ id: 5, type: 'Ride', start_date: '2026-11-16T10:00:00Z' }, NOW)
eq('Aktivität ohne Puls/Strecke: keine Herzfrequenz, Nullen', [bare.avgHr, 'maxHr' in bare, bare.distance, bare.sportType, bare.date], [undefined, false, 0, 'Ride', '2026-11-16'])
eq('Aktivität mit Puls-Flag, aber ohne Wert: kein Puls', 'avgHr' in toActivityData({ id: 6, has_heartrate: true, start_date_local: '2026-11-16T10:00:00Z' }, NOW), false)
process.exit(fail ? 1 : 0)

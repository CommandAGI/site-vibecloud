// The hero's fleet: an illustrative set of services in three regions, the commands that change it, and the diff a
// command proposes. Pure, so the tests run it as the page does. Each added replica is placed by app/plan.js against
// the sample catalog, so the monthly change is the console's own arithmetic, not a number typed into the page.
import { place } from './plan.js';
import { samplePool, monthlyCost } from './catalog.js';

export const REGIONS = Object.freeze(['us-west', 'us-east', 'eu-central']);
export const SERVICES = Object.freeze(['api', 'worker', 'db', 'queue']);
/** The most of one service the hero draws in one region. */
export const MAX = 6;

/** The fleet the page starts with. Illustrative: no account runs it. */
export const START = Object.freeze({
    'us-west': { api: 3, worker: 1, db: 1, queue: 0 },
    'us-east': { api: 2, worker: 1, db: 0, queue: 1 },
    'eu-central': { api: 2, worker: 0, db: 1, queue: 1 },
});

/** What each service asks the catalog for, and the catalog region a fleet region is in. */
const WANT = { api: { kind: 'container' }, worker: { kind: 'container' }, db: { kind: 'database', name: 'postgres' }, queue: { kind: 'queue' } };
const AREA = { 'us-west': 'us', 'us-east': 'us', 'eu-central': 'eu' };

const ALIAS = { apis: 'api', web: 'api', workers: 'worker', database: 'db', postgres: 'db', queues: 'queue' };
const service = word => (SERVICES.includes(word) ? word : ALIAS[word] ?? null);
const region = word => (REGIONS.includes(word) ? word : null);

export const clone = fleet => Object.fromEntries(REGIONS.map(r => [r, { ...fleet[r] }]));

/**
 * One command → the fleet it asks for, or { error }. The grammar is a console's, in English in every locale:
 *   scale <service> to <n> in <region>
 *   add [n] <service> in <region>          remove <service> in <region>
 *   drain <region>                         (its services move to the other regions, one at a time, round robin)
 */
export function apply(fleet, command) {
    const words = String(command ?? '').toLowerCase().trim().replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
    const next = clone(fleet);
    let m;
    const text = words.join(' ');
    if ((m = text.match(/^scale (\S+) to (\d+) in (\S+)$/))) {
        const [s, r, n] = [service(m[1]), region(m[3]), Number(m[2])];
        if (!s || !r) return { error: 'unknown' };
        if (n > MAX) return { error: 'cap' };
        next[r][s] = n;
        return { fleet: next };
    }
    if ((m = text.match(/^add (?:(\d+) )?(\S+) in (\S+)$/))) {
        const [s, r, n] = [service(m[2]), region(m[3]), Number(m[1] ?? 1)];
        if (!s || !r) return { error: 'unknown' };
        if (next[r][s] + n > MAX) return { error: 'cap' };
        next[r][s] += n;
        return { fleet: next };
    }
    if ((m = text.match(/^(?:remove|drop) (\S+) in (\S+)$/))) {
        const [s, r] = [service(m[1]), region(m[2])];
        if (!s || !r) return { error: 'unknown' };
        next[r][s] = 0;
        return { fleet: next };
    }
    if ((m = text.match(/^drain (\S+)$/))) {
        const r = region(m[1]);
        if (!r) return { error: 'unknown' };
        const others = REGIONS.filter(o => o !== r);
        let turn = 0;
        for (const s of SERVICES) {
            for (let i = 0; i < fleet[r][s]; i++) {
                // The next region with room; a service with no room anywhere stays where it is.
                const to = [0, 1].map(k => others[(turn + k) % others.length]).find(o => next[o][s] < MAX);
                if (!to) continue;
                next[to][s] += 1;
                next[r][s] -= 1;
                turn += 1;
            }
        }
        return { fleet: next };
    }
    return { error: 'unknown' };
}

/** The changes from one fleet to another, one row per service and region, each priced on its cheapest account. */
export function diff(from, to, { health = {} } = {}) {
    const { pool } = samplePool();
    const rows = [];
    for (const r of REGIONS) for (const s of SERVICES) {
        const count = to[r][s] - from[r][s];
        if (!count) continue;
        const { candidates } = place({ pool, want: { ...WANT[s], region: AREA[r] }, health });
        const best = candidates[0] ?? null;
        const each = best ? monthlyCost(best.price, best.unit) : null;
        rows.push({ region: r, service: s, count, account: best?.id ?? null, monthly: each === null ? null : Number((each * count).toFixed(2)) });
    }
    return { rows, monthly: Number(rows.reduce((sum, row) => sum + (row.monthly ?? 0), 0).toFixed(2)) };
}

/** The fleet in words, for the topology's accessible name. */
export const summary = fleet => REGIONS.map(r => `${r}: ${SERVICES.filter(s => fleet[r][s]).map(s => `${fleet[r][s]} ${s}`).join(', ') || '—'}`).join('; ');

// The planner: where a described resource runs, best first.
//
// Copied from CommandAGI's packages/domain/world/compute.js (the owner's code, the same placement rules a real
// provisioner uses) with VibeCloud's service families added: database, storage, queue and cdn, and a `global` region
// for an edge account. The rules below are CommandAGI's: capability and region first, then health, then price, then
// the account's own priority; a provider's refusal holds its account; a down account is never chosen.
import { accountId, heldAt } from './services.js';

/** The capability families. `vm` and `container` are by the hour; `serverless` by the request; `model` by million tokens. */
export const CAPABILITIES = Object.freeze(['vm', 'gpu', 'container', 'serverless', 'model', 'database', 'storage', 'queue', 'cdn']);
export const NAMED = Object.freeze(['gpu', 'model', 'database']);
const DEFAULT_UNIT = Object.freeze({ vm: 'h', gpu: 'h', container: 'h', database: 'h', storage: 'h', queue: 'h', cdn: 'h', serverless: 'req', model: 'Mtok' });

const CLOUD = ['vm', 'gpu', 'container', 'serverless', 'database', 'storage', 'queue', 'cdn'];

/**
 * The provider kinds. A kind says what its API can provision. Adding a kind is a row here; an account of a kind is
 * never code.
 */
export const KINDS = Object.freeze({
    aws: { class: 'cloud', can: CLOUD },
    gcp: { class: 'cloud', can: CLOUD },
    azure: { class: 'cloud', can: CLOUD },
    cloudflare: { class: 'edge', can: ['container', 'database', 'storage', 'queue', 'cdn', 'serverless'] },
    hetzner: { class: 'cloud', can: ['vm'] },
    runpod: { class: 'gpu-cloud', can: ['gpu', 'container'] },
    modal: { class: 'gpu-cloud', can: ['gpu', 'container', 'serverless'] },
    openrouter: { class: 'model', can: ['model'] },
    deepseek: { class: 'model', can: ['model'] },
});

const COLUMNS = ['service', 'account', 'region', 'capacity', 'offers', 'note'];
const WORD = /^[a-z][a-z0-9-]*$/;

/**
 * One capability, written `vm`, `container`, `gpu:h100*8` (a type, `*` and a count; 1 when left out),
 * `database:postgres` or `model:deepseek-chat`, then `@<price>/<h|req|Mtok>` (the unit has a default per family).
 * → offer | { problem }.
 */
export function parseOffer(text) {
    const m = /^([a-z]+)(?::([A-Za-z0-9._/-]+?)(?:\*(\d+))?)?(?:@(\d+(?:\.\d+)?)(?:\/(h|req|Mtok))?)?$/.exec(String(text).trim());
    if (!m || !CAPABILITIES.includes(m[1])) return { problem: `${JSON.stringify(text)} is <kind|kind:type*count>@<price>/<h|req|Mtok>` };
    const [, kind, name, count, price, unit] = m;
    if (NAMED.includes(kind) && !name) return { problem: `${kind} needs a name (${kind}:…)` };
    if (!NAMED.includes(kind) && name) return { problem: `${kind} takes no name` };
    if (count !== undefined && kind !== 'gpu') return { problem: 'only a gpu has a count' };
    const u = unit ?? DEFAULT_UNIT[kind];
    return { kind, name: name ?? null, count: kind === 'gpu' ? Number(count ?? 1) : 1, price: price === undefined ? null : Number(price), unit: u };
}

/**
 * The declaration of what an account offers, as CSV rows. `region`: names apart by `;` (none: anywhere, `global`: any
 * region); `capacity`: how many units the account may run at once (empty: no bound; 0: in the pool, serving nothing).
 * → { declared, problems }.
 */
export function declaredCompute(rows) {
    const problems = [];
    const declared = [];
    const [header, ...body] = (rows ?? []).filter(r => r.some(c => String(c).trim() !== ''));
    if (!header) return { declared, problems };
    if (header.map(c => String(c).trim()).join(',') !== COLUMNS.join(',')) return { declared, problems: [`the header is ${COLUMNS.join(',')}`] };
    const seen = new Set();
    for (const cells of body) {
        const row = Object.fromEntries(COLUMNS.map((k, i) => [k, String(cells[i] ?? '').trim()]));
        const at = `${row.service}/${row.account}`;
        if (!WORD.test(row.service) || !WORD.test(row.account)) { problems.push(`${at}: a service and an account are lower-case words`); continue; }
        if (seen.has(at)) { problems.push(`${at} is declared twice`); continue; }
        seen.add(at);
        const kind = KINDS[row.service];
        if (!kind) { problems.push(`${at}: ${row.service} is not a provider kind`); continue; }
        const capacity = row.capacity === '' ? null : Number(row.capacity);
        if (capacity !== null && (!Number.isInteger(capacity) || capacity < 0)) { problems.push(`${at}: capacity is a whole number, 0 or more`); continue; }
        const offers = [];
        let bad = null;
        for (const part of row.offers.split(';').map(p => p.trim()).filter(Boolean)) {
            const o = parseOffer(part);
            if (o.problem) { bad = o.problem; break; }
            if (!kind.can.includes(o.kind)) { bad = `${row.service} cannot offer ${o.kind}`; break; }
            offers.push(o);
        }
        if (bad) { problems.push(`${at}: ${bad}`); continue; }
        if (!offers.length) { problems.push(`${at}: offers nothing`); continue; }
        declared.push({ id: accountId(row.service, row.account), service: row.service, account: row.account, regions: row.region.split(';').map(r => r.trim()).filter(Boolean), capacity, offers, note: row.note || null });
    }
    return { declared, problems };
}

/** The pool the planner reads: every declared account is placed on. */
export const poolOf = declared => (declared ?? []).map(d => ({
    id: d.id, kind: d.service, class: KINDS[d.service].class, regions: d.regions, capacity: d.capacity,
    offers: d.offers, priority: 0, enabled: true, entity: null, limits: [], fields: {},
}));

const regionOk = (entry, region) => !region || !entry.regions.length || entry.regions.includes('global')
    || entry.regions.some(r => r === region || region.startsWith(r) || r.startsWith(region));

/** Whether `offer` meets `want` (`{ kind, name?, count?, region? }`): the same family and name, at least the count. */
const meets = (offer, want) => offer.kind === want.kind && (want.name ? offer.name === want.name : true) && (want.kind !== 'gpu' || offer.count >= (want.count ?? 1));

const HEALTH_RANK = { ok: 0, degraded: 1 };

/**
 * Where a request can run, best first.
 *
 *   want     { kind, name?, count?, region?, maxPrice? }
 *   marks    { <account id>: { state, until } } an account a provider limited, refused or ran out
 *   health   { <account id>: 'ok' | 'degraded' | 'down' } what a probe says (none: ok). `down` is never chosen
 *   inUse    { <account id>: units running now }: an account at its capacity is passed
 *   exclude  account ids already tried
 *   by       'price' (default): the cheapest healthy first, priority breaks a tie; 'priority': the reverse
 *
 * → { candidates: [{ id, kind, offer, price, unit, priority, health }], why: [{ id, reason }] } — `why` says what
 * left each other account out, for the plan and for the person reading it.
 */
export function place({ pool, want, marks = {}, health = {}, inUse = {}, exclude = [], now = Date.now(), by = 'price' }) {
    const candidates = [];
    const why = [];
    for (const entry of pool ?? []) {
        const out = reason => why.push({ id: entry.id, reason });
        if (!entry.enabled) { out('disabled'); continue; }
        if (exclude.includes(entry.id)) { out('already tried'); continue; }
        if (heldAt(marks[entry.id], now)) { out(`held: ${marks[entry.id].state} until ${new Date(marks[entry.id].until).toISOString()}`); continue; }
        if ((health[entry.id] ?? 'ok') === 'down') { out('down'); continue; }
        if (entry.capacity !== null && (inUse[entry.id] ?? 0) >= entry.capacity) { out(entry.capacity === 0 ? 'capacity 0' : 'at capacity'); continue; }
        if (!regionOk(entry, want.region)) { out('other region'); continue; }
        const named = `${want.kind}${want.name ? `:${want.name}` : ''}`;
        const capable = entry.offers.filter(o => meets(o, want));
        const offers = capable.filter(o => want.maxPrice === undefined || o.price === null || o.price <= want.maxPrice);
        if (!offers.length) { out(capable.length ? `${named} costs more than the ceiling` : `offers no ${named}`); continue; }
        const offer = offers.reduce((a, b) => ((a.price ?? Infinity) <= (b.price ?? Infinity) ? a : b));
        candidates.push({ id: entry.id, kind: entry.kind, offer, price: offer.price, unit: offer.unit, priority: entry.priority, health: health[entry.id] ?? 'ok' });
    }
    const cost = c => c.price ?? Infinity;
    const order = by === 'priority'
        ? (a, b) => a.priority - b.priority || HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || cost(a) - cost(b) || (a.id < b.id ? -1 : 1)
        : (a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || cost(a) - cost(b) || a.priority - b.priority || (a.id < b.id ? -1 : 1);
    candidates.sort(order);
    return { candidates, why };
}

/**
 * What a probe history says of one account: `ok`, `degraded` or `down`, the `health` that `place` reads.
 * `history` is the account's probes, oldest first, `{ at, ok, ms? }`; only the last `window` count, and a probe older
 * than `maxAge` ms is no evidence. No fresh probe is `ok` (nothing says otherwise). All fresh probes failed: `down`.
 * Some failed, or the last one answered slower than `slowMs`: `degraded`.
 */
export function healthOf(history, { now = Date.now(), window = 3, maxAge = 15 * 60_000, slowMs = 5_000 } = {}) {
    const fresh = (history ?? []).filter(p => now - p.at <= maxAge).slice(-window);
    if (!fresh.length) return 'ok';
    const failed = fresh.filter(p => !p.ok).length;
    if (failed === fresh.length) return 'down';
    if (failed || (fresh[fresh.length - 1].ms ?? 0) > slowMs) return 'degraded';
    return 'ok';
}

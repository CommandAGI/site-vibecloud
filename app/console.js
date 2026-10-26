// The console: a described workload → a plan across the sample accounts → a simulated provision and failover.
// It plans with app/plan.js (CommandAGI's placement rules) and calls nothing. Every word comes from app/messages.js.
import { place } from './plan.js';
import { ASSUMPTIONS, samplePool, monthlyCost } from './catalog.js';
import { parseWorkload } from './parse.js';
import { makeT } from './messages.js';

const t = makeT(document.documentElement.lang);
const { pool, problems } = samplePool();
const form = document.querySelector('#plan-form');
const input = document.querySelector('#describe');
const outage = document.querySelector('#outage');
const out = document.querySelector('#plan');
const hours = ASSUMPTIONS.hours;

const format = (lang, n) => new Intl.NumberFormat(lang, { style: 'currency', currency: 'USD' }).format(n);
const exact = (lang, n, digits) => new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
const money = (lang, price, unit) => {
    if (unit === 'req') return `$${exact(lang, price, 7)}/request`;
    if (unit === 'Mtok') return `$${exact(lang, price, 2)}/Mtok`;
    return `$${exact(lang, price, 3)}/h`;
};
const regionLabel = (entry, want) => {
    if (!entry) return want.region ?? t('console.anyRegion');
    if (entry.regions.includes('global')) return t('console.globalRegion');
    return want.region ?? (entry.regions.length ? entry.regions.join(', ') : t('console.anyRegion'));
};
const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else node.setAttribute(k, v);
    }
    for (const c of children) if (c !== null && c !== undefined) node.append(c);
    return node;
};
const delay = ms => new Promise(r => setTimeout(r, ms));

/** The plan for one description, at the health the visitor chose. One row per requested resource. */
function planFor(text, health) {
    const parsed = parseWorkload(text);
    // The ceiling caps each resource on its own, so one runaway resource cannot eat the month; the total is checked below.
    const cap = parsed.budgetPerMonth ? parsed.budgetPerMonth / hours : undefined;
    const rows = parsed.resources.map(resource => {
        const want = { kind: resource.kind, name: resource.name ?? undefined, region: parsed.region ?? undefined, maxPrice: cap };
        const { candidates, why } = place({ pool, want, health });
        const entry = candidates[0] && pool.find(p => p.id === candidates[0].id);
        return { resource, want, entry, best: candidates[0] ?? null, why };
    });
    const total = rows.reduce((sum, r) => sum + (r.best ? monthlyCost(r.best.price, r.best.unit) : 0), 0);
    return { parsed, rows, total, allPlaced: rows.length > 0 && rows.every(r => r.best) };
}

function renderPlan(plan, previous = null) {
    out.replaceChildren();
    if (problems.length) out.append(el('p', { class: 'note bad', text: problems.join(' · ') }));
    if (!plan.rows.length) {
        out.append(el('p', { class: 'note', text: t('console.parseEmpty') }));
        return;
    }
    const title = el('h3', { text: t('console.planTitle') });
    const table = el('table', { class: 'plan-table' });
    const head = el('tr');
    for (const k of ['console.resource', 'console.provider', 'console.region', 'console.price', 'console.month'])
        head.append(el('th', { scope: 'col', text: t(k) }));
    table.append(el('thead', {}, head));
    const body = el('tbody');
    for (const row of plan.rows) {
        const tr = el('tr', { class: row.best ? '' : 'bad' });
        tr.append(el('td', { text: row.resource.label }));
        tr.append(el('td', { text: row.best ? row.best.id : t('console.unplaced') }));
        tr.append(el('td', { text: row.best ? regionLabel(row.entry, row.want) : '—' }));
        tr.append(el('td', { text: row.best ? money(document.documentElement.lang, row.best.price, row.best.unit) : '—' }));
        tr.append(el('td', { text: row.best ? format(document.documentElement.lang, monthlyCost(row.best.price, row.best.unit)) : '—' }));
        if (previous) {
            const was = previous.rows.find(p => p.resource.id === row.resource.id);
            if (was?.best?.id && row.best?.id && was.best.id !== row.best.id) {
                tr.append(el('td', { class: 'moved', text: t('console.moved', { resource: row.resource.label, from: was.best.id, to: row.best.id }) }));
            }
        }
        body.append(tr);
    }
    table.append(body);
    const foot = el('tr');
    foot.append(el('th', { colspan: '4', scope: 'row', text: t('console.total') }));
    foot.append(el('td', { text: format(document.documentElement.lang, plan.total) }));
    table.append(el('tfoot', {}, foot));
    out.append(title, table);

    if (plan.parsed.budgetPerMonth) {
        const within = plan.total <= plan.parsed.budgetPerMonth;
        out.append(el('p', { class: within ? 'note ok' : 'note bad', text: t(within ? 'console.withinBudget' : 'console.overBudget', { budget: format(document.documentElement.lang, plan.parsed.budgetPerMonth) }) }));
    }
    out.append(el('p', { class: 'note', text: t('console.assumptions', { requests: ASSUMPTIONS.requests.toLocaleString(document.documentElement.lang), tokens: ASSUMPTIONS.tokens.toLocaleString(document.documentElement.lang) }) }));

    const whys = el('details', { class: 'why' });
    whys.append(el('summary', { text: t('console.why') }));
    for (const row of plan.rows) {
        const list = el('ul');
        for (const w of row.why) list.append(el('li', { text: `${w.id} — ${w.reason}` }));
        whys.append(el('p', { class: 'why-row', text: row.resource.label }), list);
    }
    out.append(whys);

    if (plan.allPlaced) {
        const button = el('button', { type: 'button', class: 'primary', id: 'provision', text: t('console.provision') });
        button.addEventListener('click', () => provision(plan, button));
        out.append(button);
    }
    out.append(el('div', { id: 'steps', class: 'steps', 'aria-live': 'polite' }));
}

/** The simulated provision: a step per resource, then the wiring from the first resource to the others. */
async function provision(plan, button) {
    button.disabled = true;
    const steps = document.querySelector('#steps');
    const base = plan.rows.find(r => r.resource.kind === 'container') ?? plan.rows[0];
    for (const row of plan.rows) {
        const line = el('p', { class: 'step', text: t('console.provisioning', { resource: row.resource.label }) });
        steps.append(line);
        await delay(320);
        line.classList.add('done');
    }
    for (const row of plan.rows.slice(1)) {
        steps.append(el('p', { class: 'step done', text: t('console.wired', { from: base.resource.label, to: row.resource.label }) }));
        await delay(180);
    }
    const providers = new Set(plan.rows.map(r => r.best.id.split('/')[0]));
    steps.append(el('p', { class: 'step running', text: t('console.running', { count: providers.size, cost: format(document.documentElement.lang, plan.total) }) }));
    button.disabled = false;
}

let current = null;
function replan() {
    const previous = current;
    current = planFor(input.value, health);
    renderPlan(current, previous && outage.value ? previous : null);
}

const health = {};
if (outage) {
    for (const entry of pool) outage.append(el('option', { value: entry.id, text: entry.id }));
    outage.addEventListener('change', () => {
        for (const k of Object.keys(health)) delete health[k];
        if (outage.value) health[outage.value] = 'down';
        replan();
    });
}
form.addEventListener('submit', event => {
    event.preventDefault();
    current = null;
    replan();
});
if (input.value.trim()) replan();

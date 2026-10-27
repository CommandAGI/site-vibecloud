// The page's console: the ⌘K palette, the hero's fleet (command → diff → approve → apply), the scroll stage and the
// section videos. Simulated in the page and labeled so; it calls nothing. The words come from app/messages.js.
import { START, apply, clone, diff, summary } from './fleet.js';
import { topology } from './topology.js';
import { makeT } from './messages.js';

const lang = document.documentElement.lang;
const t = makeT(lang);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, reduced.matches ? 0 : ms));
const usd = n => new Intl.NumberFormat(lang, { style: 'currency', currency: 'USD', signDisplay: 'always' }).format(n);

/* the fleet */
const ops = $('#ops');
let fleet = clone(START);
let proposal = null;
let phase = 'idle';

const narrow = matchMedia('(max-width: 640px)');
function draw(to = fleet) {
    $('#ops-map').innerHTML = topology(fleet, to, t('ops.topology', { summary: summary(to) }), { narrow: narrow.matches });
}
narrow.addEventListener('change', () => { if (phase !== 'provisioned') draw(proposal ?? fleet); });
function setPhase(next) {
    phase = next;
    ops.dataset.phase = next;
    $('#ops-state').textContent = t(`ops.state.${next}`);
    for (const li of ops.querySelectorAll('.rail li')) {
        const order = ['proposed', 'approved', 'provisioned', 'verified'];
        li.dataset.done = String(order.indexOf(li.dataset.state) <= order.indexOf(next) && next !== 'idle');
        if (li.dataset.state === next) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    }
    $('#ops-approve').disabled = next !== 'proposed';
    $('#ops-apply').disabled = next !== 'approved';
}
function log(...lines) {
    $('#ops-log').replaceChildren(...lines.map(text => Object.assign(document.createElement('li'), { textContent: text })));
}

function plan(command) {
    if (phase === 'provisioned') return;
    const result = apply(fleet, command);
    if (result.error) { proposal = null; draw(); setPhase('idle'); return log(t(`ops.${result.error}`)); }
    const change = diff(fleet, result.fleet);
    if (!change.rows.length) { proposal = null; draw(); setPhase('idle'); return log(t('ops.noChange')); }
    proposal = result.fleet;
    draw(proposal);
    setPhase('proposed');
    log(...change.rows.map(r => t('ops.delta', { sign: r.count > 0 ? '+' : '−', count: Math.abs(r.count), service: r.service, region: r.region, account: r.account ?? '—', cost: usd(r.monthly ?? 0) })),
        t('ops.total', { cost: usd(change.monthly) }), t('ops.proposedNote'));
}

async function run() {
    setPhase('provisioned');
    const added = [...ops.querySelectorAll('.n.add')];
    const removed = [...ops.querySelectorAll('.n.del')];
    const groups = [...new Set([...added, ...removed].map(n => n.dataset.node.split('/').slice(0, 2).join('/')))];
    for (const group of groups) {
        const [region, service] = group.split('/');
        const growing = added.some(n => n.dataset.node.startsWith(`${group}/`));
        log(t(growing ? 'ops.provisioning' : 'ops.removing', { service, region }));
        for (const n of [...added, ...removed].filter(n => n.dataset.node.startsWith(`${group}/`))) {
            n.classList.add('live');
            await wait(260);
        }
    }
    await wait(400);
    setPhase('verified');
    for (const n of added) n.classList.add('ok');
    log(...groups.map(g => t('ops.verified', { region: g.split('/')[0], service: g.split('/')[1] })), t('ops.applied'));
    fleet = proposal;
    proposal = null;
}

$('#ops-form').addEventListener('submit', e => { e.preventDefault(); plan($('#ops-cmd').value); });
$('#ops-approve').addEventListener('click', () => { setPhase('approved'); log(t('ops.approvedNote')); $('#ops-apply').focus(); });
$('#ops-apply').addEventListener('click', run);
$('#ops-reset').addEventListener('click', () => { fleet = clone(START); proposal = null; draw(); setPhase('idle'); log(); });
draw();
setPhase('idle');
plan($('#ops-cmd').value);

/* the palette */
const palette = $('#palette');
const input = $('#palette-input');
const list = $('#palette-list');
const FLEET = ['scale api to 6 in us-west', 'scale api to 2 in us-west', 'add 2 worker in eu-central', 'add queue in us-west', 'remove db in eu-central', 'drain us-east'];
const GO = [
    ['ops.cmd.console', () => { location.hash = '#console'; $('#describe')?.focus(); }],
    ['ops.cmd.providers', () => { location.hash = '#providers'; }],
    ['ops.cmd.about', () => { location.href = '/about.html'; }],
    ['ops.cmd.team', () => { location.href = '/team.html'; }],
    ['ops.cmd.lang', () => $('#lang-dialog')?.showModal()],
];
let options = [];
let active = 0;

function runFleet(command) {
    $('#ops-cmd').value = command;
    $('#top').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
    if (phase === 'provisioned') return;
    if (phase === 'verified') setPhase('idle');
    plan(command);
}
function fill() {
    const q = input.value.trim().toLowerCase();
    const fleetHits = FLEET.filter(c => c.includes(q));
    const goHits = GO.filter(([k]) => t(k).toLowerCase().includes(q));
    options = [];
    const rows = [];
    const head = text => rows.push(Object.assign(document.createElement('li'), { className: 'group', role: 'presentation', textContent: text }));
    const add = (text, act, mono) => {
        const li = Object.assign(document.createElement('li'), { id: `pal-${options.length}`, role: 'option', textContent: text });
        if (mono) li.className = 'mono';
        li.addEventListener('click', () => choose(options.indexOf(entry)));
        const entry = { li, act };
        options.push(entry);
        rows.push(li);
    };
    if (q && !FLEET.includes(q) && apply(fleet, q).fleet) add(t('ops.runTyped', { command: q }), () => runFleet(q), true);
    if (fleetHits.length) head(t('ops.group.fleet'));
    for (const c of fleetHits) add(c, () => runFleet(c), true);
    if (goHits.length) head(t('ops.group.go'));
    for (const [k, act] of goHits) add(t(k), act, false);
    if (!options.length) rows.push(Object.assign(document.createElement('li'), { className: 'empty', role: 'presentation', textContent: t('ops.noResults') }));
    list.replaceChildren(...rows);
    focusOption(0);
}
function focusOption(i) {
    active = Math.max(0, Math.min(i, options.length - 1));
    options.forEach((o, k) => o.li.setAttribute('aria-selected', String(k === active)));
    if (options[active]) { input.setAttribute('aria-activedescendant', options[active].li.id); options[active].li.scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
}
function choose(i) {
    const o = options[i];
    if (!o) return;
    palette.close();
    o.act();
}
function openPalette() {
    if (palette.open) return;
    input.value = '';
    fill();
    palette.showModal();
    input.focus();
}
input.addEventListener('input', fill);
input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusOption(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusOption(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
});
palette.addEventListener('click', e => { if (e.target === palette) palette.close(); });
for (const b of document.querySelectorAll('[data-palette]')) b.addEventListener('click', openPalette);
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
});

/* the scroll stage: the step in the middle of the screen is the stage's state */
const stage = $('#stage');
if (stage && 'IntersectionObserver' in window) {
    // Without script the stage shows its last state, the whole picture; with it, the stage starts at the first.
    stage.dataset.step = '1';
    const seen = new IntersectionObserver(entries => {
        for (const e of entries) if (e.isIntersecting) stage.dataset.step = e.target.dataset.step;
    }, { rootMargin: '-64% 0px -35% 0px' });
    for (const step of document.querySelectorAll('.step-text')) seen.observe(step);
}

/* the section videos: play on screen, never with reduced motion, and a button stops each one */
const videos = [...document.querySelectorAll('video.loop')];
const held = new Set();
const watch = new IntersectionObserver(entries => {
    for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting && !reduced.matches && !held.has(v)) { v.preload = 'auto'; v.play().catch(() => {}); }
        else v.pause();
    }
}, { rootMargin: '200px 0px' });
for (const v of videos) {
    watch.observe(v);
    const button = v.parentElement.querySelector('.vid-toggle');
    if (!button) continue;
    // The button says what it will do: a held video stays paused until the visitor plays it again.
    const label = () => { button.setAttribute('aria-pressed', String(v.paused)); button.textContent = t(v.paused ? 'ops.play' : 'ops.pause'); };
    v.addEventListener('play', label);
    v.addEventListener('pause', label);
    button.hidden = false;
    button.addEventListener('click', () => {
        if (v.paused) { held.delete(v); v.play().catch(() => {}); }
        else { held.add(v); v.pause(); }
    });
    label();
}

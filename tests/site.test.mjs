// The site's own tests: the three locale pages, their links, and the console's planner.
// Run: node --test tests/ (or pnpm test)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { declaredCompute, poolOf, place } from '../app/plan.js';
import { CATALOG, samplePool, monthlyCost } from '../app/catalog.js';
import { parseWorkload } from '../app/parse.js';
import { MESSAGES } from '../app/messages.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(ROOT, rel), 'utf8');
const pages = { en: 'index.html', es: 'es/index.html', zh: 'zh/index.html' };

test('the site is a plain static folder with a valid site.json', () => {
    const site = JSON.parse(read('site.json'));
    assert.equal(site.slug, 'vibecloud');
    assert.equal(site.status, 'active');
    assert.equal(site.build, undefined, 'a static folder: no build');
    for (const file of ['index.html', 'about.html', 'style.css', 'app/console.js', 'app/plan.js', 'es/index.html', 'zh/index.html'])
        assert.ok(existsSync(join(ROOT, file)), file);
});

test('each locale page declares its language, its canonical page and all three alternates', () => {
    const langs = { en: 'en', es: 'es', zh: 'zh-Hans' };
    for (const [lang, file] of Object.entries(pages)) {
        const html = read(file);
        assert.match(html, new RegExp(`<html lang="${langs[lang]}">`), file);
        assert.match(html, /<link rel="canonical" href="https:\/\/vibecloud\.commandagi\.app\/[^"]*">/, file);
        for (const tag of ['en', 'es', 'zh-Hans', 'x-default'])
            assert.match(html, new RegExp(`<link rel="alternate" hreflang="${tag}" href="https://vibecloud\\.commandagi\\.app/`), `${file}: ${tag}`);
        assert.equal((html.match(/hreflang="(?:en|es|zh-Hans)"/g) ?? []).length >= 3, true, file);
    }
});

test('every page has the A/文 button and a dialog linking the three locales', () => {
    for (const file of Object.values(pages)) {
        const html = read(file);
        assert.match(html, /commandfor="lang-dialog" command="show-modal"/, `${file}: the button opens the dialog with no script`);
        assert.match(html, /A\/文/, `${file}: the glyph`);
        const dialog = html.slice(html.indexOf('<dialog id="lang-dialog"'));
        for (const href of ['href="/"', 'href="/es/"', 'href="/zh/"']) assert.ok(dialog.includes(href), `${file}: ${href}`);
        assert.match(dialog, /aria-current="true"/, `${file}: the current language`);
        assert.ok(html.includes('<noscript>'), `${file}: links stand in without script`);
    }
});

test('every local link and script resolves, and nothing is fetched from another host', () => {
    for (const [lang, file] of Object.entries(pages)) {
        const html = read(file);
        const base = dirname(join(ROOT, file));
        for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
            const target = m[1];
            if (target.startsWith('#') || target.startsWith('mailto:') || target.startsWith('https://vibecloud.commandagi.app') || target === '/')
                continue;
            if (target.startsWith('/')) {
                assert.ok(existsSync(join(ROOT, target.slice(1))), `${file}: ${target} is not a file`);
                continue;
            }
            assert.ok(existsSync(resolve(base, target)), `${file}: ${target} is not a file`);
        }
        assert.doesNotMatch(html, /(?:src|href)="https?:\/\/(?!vibecloud\.commandagi\.app)[^"]+"/, `${file}: no other host`);
    }
});

test('the pages ship no inline script and no network call', () => {
    for (const file of Object.values(pages)) {
        const html = read(file);
        assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/, `${file}: no inline script (the CSP refuses it)`);
        assert.match(html, /connect-src 'none'/, `${file}: the page cannot call out`);
    }
    for (const file of readdirSync(join(ROOT, 'app')).filter(f => f.endsWith('.js'))) {
        const js = read(`app/${file}`);
        assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts/, `app/${file}: no network`);
    }
});

test('the three locales have the same messages', () => {
    const keys = Object.keys(MESSAGES.en).sort();
    for (const lang of ['es', 'zh']) assert.deepEqual(Object.keys(MESSAGES[lang]).sort(), keys, lang);
    for (const lang of ['es', 'zh']) for (const key of keys) assert.ok(MESSAGES[lang][key].trim(), `${lang}: ${key} is empty`);
});

test('the sample catalog is well formed and its accounts are placed on', () => {
    const { declared, pool, problems } = samplePool();
    assert.deepEqual(problems, []);
    assert.equal(declared.length, 5);
    assert.equal(pool.length, 5);
    assert.ok(CATALOG.includes('database:postgres'), 'the catalog offers a managed Postgres');
});

test('the console sentence parses into the four resources it names, in a region, under a ceiling', () => {
    const parsed = parseWorkload('A web app in Europe with a Postgres database, a queue and object storage, under $250 a month.');
    assert.deepEqual(parsed.resources.map(r => r.label), ['database:postgres', 'storage', 'queue', 'container']);
    assert.equal(parsed.region, 'eu');
    assert.equal(parsed.budgetPerMonth, 250);
});

test('the console sentence works in Spanish and Chinese too', () => {
    const es = parseWorkload('Una aplicación web en Europa con una base de datos Postgres, una cola y almacenamiento de objetos, por menos de $250 al mes.');
    assert.deepEqual(es.resources.map(r => r.label), ['database:postgres', 'storage', 'queue', 'container']);
    assert.equal(es.region, 'eu');
    assert.equal(es.budgetPerMonth, 250);
    const zh = parseWorkload('一个在欧洲的网页应用，带 Postgres 数据库、队列和对象存储，每月不超过 250 美元。');
    assert.deepEqual(zh.resources.map(r => r.label), ['database:postgres', 'storage', 'queue', 'container']);
    assert.equal(zh.region, 'eu');
    assert.equal(zh.budgetPerMonth, 250);
});

test('placement picks the cheapest healthy account for each resource, and says why not the others', () => {
    const { pool } = samplePool();
    const database = place({ pool, want: { kind: 'database', name: 'postgres', region: 'eu' } });
    assert.equal(database.candidates[0].id, 'gcp/main', 'the cheapest Postgres in the region');
    assert.equal(database.candidates[0].price, 0.1);
    assert.equal(database.candidates[1].id, 'aws/main');
    assert.ok(database.why.some(w => w.id === 'cloudflare/main' && w.reason === 'offers no database:postgres'), 'cloudflare offers D1, not Postgres');
    assert.ok(database.why.some(w => w.id === 'hetzner/eu' && w.reason === 'offers no database:postgres'), 'the reason a VM-only account is out');
    assert.ok(database.why.some(w => w.id === 'runpod/gpu' && w.reason === 'offers no database:postgres'));
    const vm = place({ pool, want: { kind: 'vm', region: 'us' } });
    assert.equal(vm.candidates[0].id, 'gcp/main');
    assert.ok(vm.why.some(w => w.id === 'hetzner/eu' && w.reason === 'other region'));
});

test('a ceiling too low to meet leaves the resource unplaced, and the plan says so', () => {
    const { pool } = samplePool();
    const { candidates, why } = place({ pool, want: { kind: 'container', region: 'eu', maxPrice: 0.001 } });
    assert.equal(candidates.length, 0);
    assert.ok(why.every(w => w.reason === 'offers no container' || w.reason === 'container costs more than the ceiling'));
    assert.ok(why.some(w => w.reason === 'container costs more than the ceiling'), 'an account that has a container is out on price, and says so');
});

test('a provider marked down is never chosen, and the workload moves to the next account', () => {
    const { pool } = samplePool();
    const down = place({ pool, want: { kind: 'database', name: 'postgres', region: 'eu' }, health: { 'gcp/main': 'down' } });
    assert.equal(down.candidates[0].id, 'aws/main');
    assert.equal(down.candidates[0].price, 0.11);
    const both = place({ pool, want: { kind: 'database', name: 'postgres' }, health: { 'gcp/main': 'down', 'aws/main': 'down' } });
    assert.equal(both.candidates.length, 0);
});

test('a month costs hours, requests or tokens by the family', () => {
    assert.equal(monthlyCost(0.06, 'h'), 43.8);
    assert.equal(monthlyCost(0.0000002, 'req'), 0.4);
    assert.equal(monthlyCost(2, 'Mtok'), 4);
    assert.equal(monthlyCost(null, 'h'), null);
});

test('an empty or unrelated description names no resource', () => {
    assert.deepEqual(parseWorkload('hello').resources, []);
    assert.deepEqual(parseWorkload('').resources, []);
});

test('the hero fleet: a command proposes a diff priced by the planner, and refuses what it cannot draw', async () => {
    const { START, apply, diff } = await import('../app/fleet.js');
    const up = apply(START, 'scale api to 6 in us-west');
    assert.equal(up.fleet['us-west'].api, 6);
    assert.equal(START['us-west'].api, 3, 'a command never changes the fleet it reads');
    const change = diff(START, up.fleet);
    assert.deepEqual(change.rows, [{ region: 'us-west', service: 'api', count: 3, account: 'cloudflare/main', monthly: 87.6 }]);
    const down = diff(START, apply(START, 'remove db in eu-central').fleet);
    assert.equal(down.rows[0].count, -1);
    assert.equal(down.rows[0].account, 'gcp/main', 'Postgres in eu prices on the cheapest account, as the console places it');
    assert.equal(down.monthly, -73);
    assert.deepEqual(apply(START, 'scale api to 9 in us-west'), { error: 'cap' });
    assert.deepEqual(apply(START, 'scale api to 2 in mars'), { error: 'unknown' });
    assert.deepEqual(apply(START, 'make it fast'), { error: 'unknown' });
});

test('draining a region moves each replica to another region and loses none', async () => {
    const { START, REGIONS, SERVICES, apply } = await import('../app/fleet.js');
    const { fleet } = apply(START, 'drain us-east');
    for (const s of SERVICES) assert.equal(fleet['us-east'][s], 0, s);
    const total = f => REGIONS.reduce((n, r) => n + SERVICES.reduce((m, s) => m + f[r][s], 0), 0);
    assert.equal(total(fleet), total(START));
});

test('the pages are generated from one layout, and the topology without script is the fleet the page starts with', async () => {
    const { START, summary } = await import('../app/fleet.js');
    for (const file of Object.values(pages)) {
        const html = read(file);
        assert.match(html, /id="ops-map"[^>]*><svg class="topo"/, `${file}: the topology is in the page`);
        assert.equal((html.match(/class="n run"/g) ?? []).length, 13, `${file}: every replica of the starting fleet`);
        assert.ok(html.includes(summary(START)), `${file}: the topology's accessible name`);
        assert.match(html, /media-src 'self'/, `${file}: videos only from the site`);
        for (const name of ['deck-loop', 'relief-loop']) {
            assert.match(html, new RegExp(`poster="/media/${name}-poster.jpg"`), `${file}: ${name} has a poster`);
            assert.match(html, new RegExp(`<video class="loop" muted loop playsinline preload="none"`), `${file}: muted, lazy`);
        }
        assert.doesNotMatch(html, /autoplay/, `${file}: nothing autoplays; the page plays a video on screen and never with reduced motion`);
    }
});

test('the media fit the deploy and each loop stays under 3 MB', () => {
    let bytes = 0;
    for (const file of readdirSync(join(ROOT, 'media'))) {
        const size = readFileSync(join(ROOT, 'media', file)).length;
        if (/\.(webm|mp4)$/.test(file)) assert.ok(size < 3 * 1024 * 1024, `${file}: ${size} bytes`);
        bytes += size;
    }
    assert.ok(bytes < 5 * 1024 * 1024, `media: ${bytes} bytes`);
});

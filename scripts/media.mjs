// The site's generated media, made at build time with fal and kept as files in media/ (scripts/encode.sh).
// The key never reaches the page: it is read here from the environment or the CommandAGI .env cascade, and never printed.
// Run: COMMANDAGI_ENV_ROOT=<CommandAGI checkout> node scripts/media.mjs [name …]
// Each job is written once; delete its file in .media-raw/ to make it again. Prompts, models and costs: redesign/NOTES.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// A dot folder: the site host never serves it, and git ignores it (.gitignore). Only the encoded files in media/ ship.
const RAW = join(ROOT, '.media-raw');

function falKey() {
    if (process.env.SVC__FAL__MAIN__API_KEY) return process.env.SVC__FAL__MAIN__API_KEY;
    const root = process.env.COMMANDAGI_ENV_ROOT;
    for (const file of root ? ['.env.api', '.env'].map(f => join(root, f)) : []) {
        if (!existsSync(file)) continue;
        const line = readFileSync(file, 'utf8').split('\n').find(l => l.startsWith('SVC__FAL__MAIN__API_KEY='));
        if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
    }
    throw new Error('SVC__FAL__MAIN__API_KEY is not set (set COMMANDAGI_ENV_ROOT to the CommandAGI checkout)');
}

const STYLE = 'deep midnight navy, ice blue, a few warm amber points, calm, minimal, cinematic, fine film grain, no text, no letters, no logos, no people';

/** The jobs. `from` names a still whose image the video starts from. */
const JOBS = {
    'deck-still': {
        model: 'fal-ai/flux-pro/v1.1-ultra',
        input: { aspect_ratio: '21:9', output_format: 'jpeg', raw: false, num_images: 1, enable_safety_checker: true,
            prompt: `Seen from above at night, a vast calm sea of clouds lit by moonlight, soft ice-blue highlights on the cloud tops, the gaps between clouds deep midnight navy, far below through one gap a few tiny warm amber lights, ${STYLE}` },
        out: 'deck-still.jpg',
    },
    'deck-loop': {
        model: 'fal-ai/kling-video/v2.1/standard/image-to-video',
        from: 'deck-still',
        input: { duration: '10', negative_prompt: 'text, flashing, strobe, fast motion, camera shake, people, logos',
            prompt: 'The camera drifts very slowly forward above the moonlit sea of clouds; the clouds roll gently; the tiny amber lights below glow steadily. Calm, slow, no flashing.' },
        out: 'deck-loop.mp4',
    },
    'relief-still': {
        model: 'fal-ai/flux-pro/v1.1-ultra',
        input: { aspect_ratio: '16:9', output_format: 'jpeg', raw: false, num_images: 1, enable_safety_checker: true,
            prompt: `An abstract terrain relief drawn only in thin ice-blue contour lines on a deep midnight navy ground, like an engraved topographic chart, three small amber points on three far apart ridges joined by thin hairline arcs, top-down, ${STYLE}` },
        out: 'relief-still.jpg',
    },
    'relief-loop': {
        model: 'fal-ai/kling-video/v2.1/standard/image-to-video',
        from: 'relief-still',
        input: { duration: '10', negative_prompt: 'text, flashing, strobe, fast motion, camera shake, people, logos',
            prompt: 'A very slow top-down pan across the engraved contour-line terrain; the hairline arcs between the amber points draw themselves slowly; calm, no flashing.' },
        out: 'relief-loop.mp4',
    },
};

async function call(key, model, input) {
    const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
    const submit = await fetch(`https://queue.fal.run/${model}`, { method: 'POST', headers, body: JSON.stringify(input) });
    if (!submit.ok) throw new Error(`${model}: ${submit.status} ${await submit.text()}`);
    const { status_url, response_url } = await submit.json();
    for (;;) {
        await new Promise(r => setTimeout(r, 5000));
        const status = await (await fetch(status_url, { headers })).json();
        if (status.status === 'COMPLETED') break;
        if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS') throw new Error(`${model}: ${JSON.stringify(status)}`);
    }
    const result = await fetch(response_url, { headers });
    if (!result.ok) throw new Error(`${model}: ${result.status} ${await result.text()}`);
    return result.json();
}

async function upload(file) {
    // A still goes to the video model as a data URI: no third storage, nothing public.
    const type = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${type};base64,${readFileSync(file).toString('base64')}`;
}

async function run(name) {
    const job = JOBS[name];
    const target = join(RAW, job.out);
    if (existsSync(target)) return console.log(`${name}: kept ${job.out}`);
    const key = falKey();
    const input = { ...job.input };
    if (job.from) input.image_url = await upload(join(RAW, JOBS[job.from].out));
    const started = Date.now();
    const result = await call(key, job.model, input);
    const url = result.images?.[0]?.url ?? result.video?.url;
    if (!url) throw new Error(`${name}: no media in the reply`);
    writeFileSync(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
    writeFileSync(join(RAW, `${name}.json`), JSON.stringify({ model: job.model, prompt: job.input.prompt, seconds: Math.round((Date.now() - started) / 1000), seed: result.seed ?? null }, null, 2));
    console.log(`${name}: wrote ${job.out}`);
}

mkdirSync(RAW, { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
for (const name of names) await run(name);

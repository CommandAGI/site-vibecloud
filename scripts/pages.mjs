// The three locale home pages from one layout: index.html, es/index.html, zh/index.html. The pages are committed
// and served as they are (the site has no build); run this after changing a word or the layout.
// Run: node scripts/pages.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { START, summary } from '../app/fleet.js';
import { topology } from '../app/topology.js';
import { makeT } from '../app/messages.js';
import { SENTENCES } from '../app/catalog.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://vibecloud.commandagi.app';

const LOCALES = {
    en: {
        file: 'index.html', html: 'en', og: 'en_US', path: '/', name: 'English',
        title: 'VibeCloud — say what the fleet should be',
        description: 'VibeCloud: describe a workload and it plans, provisions, wires and runs it across AWS, Google Cloud and Cloudflare. When a provider refuses, the workload moves.',
        ogDescription: 'Describe a workload. VibeCloud plans it across providers, provisions it, wires it and runs it.',
        company: 'a company of CommandAGI', main: 'Main', skip: 'Skip to the console',
        nav: { top: 'fleet', product: 'how', console: 'console', providers: 'providers', pricing: 'status', about: 'about', team: 'team' },
        paletteButton: 'Command palette',
        kicker: 'cloud control plane · v0 · early access',
        h1: ['Say what the fleet', 'should be.'],
        lede: 'One sentence in, a plan out. You approve before anything starts.',
        hint: ['Press', 'or type a command below.'],
        command: 'Command', plan: 'Plan', approve: 'Approve', apply: 'Apply', reset: 'Reset',
        rail: { proposed: 'proposed', approved: 'approved', provisioned: 'provisioned', verified: 'verified' },
        legend: { run: 'running', add: 'proposed', del: 'removing', ok: 'verified' },
        illustrative: 'Illustrative fleet, simulated in this page. Nothing is provisioned.',
        deck: { k: '§01 · the description', h: ['Capabilities,', 'not product names.'], p: 'You name a web service, a database, a queue. The plan names the provider.', cap: 'Generated footage (fal · Kling 2.1). Not a real place.' },
        how: {
            k: '§02 · how a plan moves', h: 'Four states. One description.',
            steps: [
                ['described', 'Describe', 'A web app in Europe, a Postgres database, a queue, object storage. A ceiling for the month.'],
                ['planned', 'Plan', 'Each resource goes to the cheapest healthy account that offers it there. The plan says why the others are out.'],
                ['wired', 'Provision and wire', 'Each provider’s API is called once. Every resource is read back, then wired: URLs, endpoints, policies.'],
                ['moved', 'Fail over', 'Google Cloud refuses. The database moves to AWS under the same description, and the record says what moved.'],
            ],
            stage: 'The sample plan for a web app in Europe: container, storage and queue on Cloudflare, Postgres on Google Cloud; when Google Cloud is down, Postgres moves to AWS.',
            down: 'refused', moved: 'moved',
        },
        console: { k: '§03 · the console', h: 'Plan a real sentence.', p: 'The planner runs in this browser against a sample catalog of five accounts.', simulated: 'Simulated in your browser: no provider is called, and the prices are a sample.', noscript: ['The console plans in your browser, so it needs JavaScript. The rules it follows are in', 'About'], label: 'Describe what you need', try: 'Try', button: 'Plan it', outage: 'One provider answers nothing', healthy: 'All providers healthy' },
        providers: {
            k: '§04 · the sample catalog', h: 'Five accounts. Rows, not code.', cap: 'Generated relief (fal · Kling 2.1). An illustration, not a map of data centers.',
            rows: [['AWS', 'aws/main', 'us-east-1 · eu-central-1 · ap-southeast-1'], ['Google Cloud', 'gcp/main', 'us-central1 · europe-west3 · asia-south1'], ['Cloudflare', 'cloudflare/main', 'edge, every region: containers, D1, R2, queues, CDN'], ['Hetzner', 'hetzner/eu', 'eu: the cheapest virtual machine in the sample'], ['Runpod', 'runpod/gpu', 'us and eu: GPU by the hour']],
            note: 'Placement: capability and region first, then health, then price.',
        },
        status: {
            k: '§05 · where it stands', h: 'What runs today, and what does not.',
            rows: [['built', 'The planner, in your browser, on a sample catalog'], ['built', 'The fleet console above: a simulation'], ['not built', 'Provider accounts and the provisioners'], ['not built', 'The live failover runner']],
            pricing: 'Pricing: early access. VibeCloud runs the first workloads of the companies of CommandAGI. No public plan, no sign-up.', prices: 'The provider prices here are round numbers for a demo, not quotes.', write: 'For a workload of your own, write to',
            legend: 'A list of what is built, not live status.',
        },
        foot: { about: 'About', contact: 'Contact', footer: 'Footer', language: 'Language', hint: ['/es/', 'es', 'Ver en español'] },
        dialog: { title: 'Choose a language', close: 'Close' },
    },
    es: {
        file: 'es/index.html', html: 'es', og: 'es_ES', path: '/es/', name: 'Español',
        title: 'VibeCloud — di cómo debe ser la flota',
        description: 'vibeCloud: describe lo que necesitas y lo planifica, aprovisiona, conecta y ejecuta en AWS, Google Cloud y Cloudflare. Si un proveedor falla, la carga se mueve.',
        ogDescription: 'Describe una carga. vibeCloud la planifica entre proveedores, la aprovisiona, la conecta y la ejecuta.',
        company: 'una empresa de CommandAGI', main: 'Principal', skip: 'Ir a la consola',
        nav: { top: 'flota', product: 'cómo', console: 'consola', providers: 'proveedores', pricing: 'estado', about: 'acerca de', team: 'equipo' },
        paletteButton: 'Paleta de comandos',
        kicker: 'plano de control en la nube · v0 · acceso anticipado',
        h1: ['Di cómo debe ser', 'la flota.'],
        lede: 'Entra una frase, sale un plan. Apruebas antes de que empiece nada.',
        hint: ['Pulsa', 'o escribe un comando abajo.'],
        command: 'Comando', plan: 'Planificar', approve: 'Aprobar', apply: 'Aplicar', reset: 'Reiniciar',
        rail: { proposed: 'propuesto', approved: 'aprobado', provisioned: 'aprovisionado', verified: 'verificado' },
        legend: { run: 'en marcha', add: 'propuesto', del: 'se retira', ok: 'verificado' },
        illustrative: 'Flota ilustrativa, simulada en esta página. No se aprovisiona nada.',
        deck: { k: '§01 · la descripción', h: ['Capacidades,', 'no nombres de productos.'], p: 'Nombras un servicio web, una base de datos, una cola. El plan nombra el proveedor.', cap: 'Imágenes generadas (fal · Kling 2.1). No es un lugar real.' },
        how: {
            k: '§02 · cómo avanza un plan', h: 'Cuatro estados. Una descripción.',
            steps: [
                ['described', 'Describe', 'Una aplicación web en Europa, una base de datos Postgres, una cola, almacenamiento de objetos. Un techo para el mes.'],
                ['planned', 'Planifica', 'Cada recurso va a la cuenta sana más barata que lo ofrece allí. El plan dice por qué quedan fuera las demás.'],
                ['wired', 'Aprovisiona y conecta', 'Se llama una vez a la API de cada proveedor. Cada recurso se vuelve a leer y se conecta: URL, extremos, políticas.'],
                ['moved', 'Migra', 'Google Cloud se niega. La base de datos pasa a AWS con la misma descripción, y el registro dice qué se movió.'],
            ],
            stage: 'El plan de ejemplo para una aplicación web en Europa: contenedor, almacenamiento y cola en Cloudflare, Postgres en Google Cloud; si Google Cloud cae, Postgres pasa a AWS.',
            down: 'se niega', moved: 'movido',
        },
        console: { k: '§03 · la consola', h: 'Planifica una frase real.', p: 'El planificador se ejecuta en este navegador con un catálogo de ejemplo de cinco cuentas.', simulated: 'Simulado en tu navegador: no se llama a ningún proveedor y los precios son una muestra.', noscript: ['La consola planifica en tu navegador, así que necesita JavaScript. Las reglas que sigue están en', 'Acerca de'], label: 'Describe lo que necesitas', try: 'Prueba', button: 'Planificar', outage: 'Un proveedor no responde', healthy: 'Todos los proveedores sanos' },
        providers: {
            k: '§04 · el catálogo de ejemplo', h: 'Cinco cuentas. Filas, no código.', cap: 'Relieve generado (fal · Kling 2.1). Una ilustración, no un mapa de centros de datos.',
            rows: [['AWS', 'aws/main', 'us-east-1 · eu-central-1 · ap-southeast-1'], ['Google Cloud', 'gcp/main', 'us-central1 · europe-west3 · asia-south1'], ['Cloudflare', 'cloudflare/main', 'edge en todas las regiones: contenedores, D1, R2, colas, CDN'], ['Hetzner', 'hetzner/eu', 'eu: la máquina virtual más barata de la muestra'], ['Runpod', 'runpod/gpu', 'us y eu: GPU por hora']],
            note: 'Colocación: primero capacidad y región, luego salud, luego precio.',
        },
        status: {
            k: '§05 · en qué punto está', h: 'Qué funciona hoy y qué no.',
            rows: [['hecho', 'El planificador, en tu navegador, con un catálogo de ejemplo'], ['hecho', 'La consola de flota de arriba: una simulación'], ['sin hacer', 'Las cuentas de proveedores y los aprovisionadores'], ['sin hacer', 'El ejecutor de migración en vivo']],
            pricing: 'Precios: acceso anticipado. VibeCloud ejecuta las primeras cargas de las empresas de CommandAGI. No hay plan público ni registro.', prices: 'Los precios de proveedores son números redondos para una demostración, no cotizaciones.', write: 'Para una carga tuya, escribe a',
            legend: 'Una lista de lo que está hecho, no un estado en vivo.',
        },
        foot: { about: 'Acerca de', contact: 'Contacto', footer: 'Pie de página', language: 'Idioma', hint: ['/es/', 'es', 'Ver en español'] },
        dialog: { title: 'Elige un idioma', close: 'Cerrar' },
    },
    zh: {
        file: 'zh/index.html', html: 'zh-Hans', og: 'zh_CN', path: '/zh/', name: '简体中文',
        title: 'VibeCloud — 说出舰队应有的样子',
        description: 'vibeCloud：描述你的需求，它在 AWS、Google Cloud 和 Cloudflare 上规划、开通、连接并运行。某个服务商不可用时，工作负载会迁移。',
        ogDescription: '描述一个工作负载。vibeCloud 在多个服务商之间规划、开通、连接并运行它。',
        company: 'CommandAGI 旗下公司', main: '主导航', skip: '跳到控制台',
        nav: { top: '舰队', product: '原理', console: '控制台', providers: '服务商', pricing: '现状', about: '关于', team: '团队' },
        paletteButton: '命令面板',
        kicker: '云控制平面 · v0 · 抢先体验',
        h1: ['说出舰队', '应有的样子。'],
        lede: '输入一句话，得到一份方案。任何东西启动之前都由你批准。',
        hint: ['按', '或在下面输入命令。'],
        command: '命令', plan: '规划', approve: '批准', apply: '执行', reset: '重置',
        rail: { proposed: '已提议', approved: '已批准', provisioned: '已开通', verified: '已验证' },
        legend: { run: '运行中', add: '已提议', del: '撤下中', ok: '已验证' },
        illustrative: '示意舰队，在本页模拟。不会开通任何资源。',
        deck: { k: '§01 · 描述', h: ['写能力，', '不写产品名。'], p: '你写网页服务、数据库、队列。方案写出服务商。', cap: '生成的影像（fal · Kling 2.1）。不是真实地点。' },
        how: {
            k: '§02 · 方案如何推进', h: '四个状态，一份描述。',
            steps: [
                ['described', '描述', '欧洲的网页应用、Postgres 数据库、队列、对象存储，以及每月上限。'],
                ['planned', '规划', '每个资源去往当地提供它的、最便宜的健康账户。方案写明其他账户为何落选。'],
                ['wired', '开通并连接', '每个服务商的 API 只调用一次。每个资源都会被读回，然后连接：URL、端点、策略。'],
                ['moved', '故障转移', 'Google Cloud 拒绝服务。数据库在同一描述下迁到 AWS，记录写明迁移了什么。'],
            ],
            stage: '欧洲网页应用的示例方案：容器、存储和队列在 Cloudflare，Postgres 在 Google Cloud；Google Cloud 不可用时，Postgres 迁到 AWS。',
            down: '拒绝', moved: '已迁移',
        },
        console: { k: '§03 · 控制台', h: '规划一句真实的话。', p: '规划器在本浏览器中运行，使用含五个账户的示例目录。', simulated: '在你的浏览器中模拟：不会调用任何服务商，价格为示例。', noscript: ['控制台在你的浏览器中规划，因此需要 JavaScript。它遵循的规则见', '关于'], label: '描述你需要什么', try: '试试', button: '开始规划', outage: '某个服务商无响应', healthy: '所有服务商正常' },
        providers: {
            k: '§04 · 示例目录', h: '五个账户。是数据行，不是代码。', cap: '生成的地形（fal · Kling 2.1）。仅为插图，不是数据中心地图。',
            rows: [['AWS', 'aws/main', 'us-east-1 · eu-central-1 · ap-southeast-1'], ['Google Cloud', 'gcp/main', 'us-central1 · europe-west3 · asia-south1'], ['Cloudflare', 'cloudflare/main', '边缘，覆盖所有区域：容器、D1、R2、队列、CDN'], ['Hetzner', 'hetzner/eu', '欧洲：示例中最便宜的虚拟机'], ['Runpod', 'runpod/gpu', '美国和欧洲：按小时计费的 GPU']],
            note: '放置规则：先看能力和区域，再看健康状况，最后看价格。',
        },
        status: {
            k: '§05 · 现状', h: '今天能运行什么，不能运行什么。',
            rows: [['已完成', '规划器：在你的浏览器中，基于示例目录'], ['已完成', '上方的舰队控制台：一个模拟'], ['未完成', '服务商账户和开通器'], ['未完成', '实时故障转移执行器']],
            pricing: '价格：抢先体验。VibeCloud 正在运行 CommandAGI 各公司的第一批工作负载。没有公开方案，也不提供注册。', prices: '这里的服务商价格是演示用的整数，不是报价。', write: '如需运行你自己的负载，请写信至',
            legend: '这是已完成事项的清单，不是实时状态。',
        },
        foot: { about: '关于', contact: '联系我们', footer: '页脚', language: '语言', hint: ['/zh/', 'zh-Hans', '在简体中文中查看'] },
        dialog: { title: '选择语言', close: '关闭' },
    },
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The wordmark: a console window whose bottom edge is a horizon, then the name, kerned by hand. */
export const wordmark = label => `<svg class="wordmark" viewBox="0 -3 132 30" role="img" aria-label="${esc(label)}">
<path class="wm-mark" d="M1 1h15l5 5v17H1z M1 15h20" />
<path class="wm-caret" d="M5 6.5l3.5 3l-3.5 3"/>
<text class="wm-word" x="28" y="17.5"><tspan>vibe</tspan><tspan class="wm-cloud" dx="0.4">cloud</tspan></text>
</svg>`;

/** The scroll stage's picture: the sample plan for a web app in Europe (the console's first sentence). */
function stage(L) {
    const lanes = [['Cloudflare', 'cloudflare/main', 92], ['Google Cloud', 'gcp/main', 232], ['AWS', 'aws/main', 372]];
    const chip = (cls, x, y, text) => `<g class="chip ${cls}"><rect x="${x}" y="${y}" width="118" height="28"/><text x="${x + 10}" y="${y + 18}">${text}</text></g>`;
    return `<svg class="stage-svg" viewBox="0 0 480 400" role="img" aria-label="${esc(L.how.stage)}">
<g class="s s1"><rect class="sentence" x="10" y="12" width="460" height="40"/><text class="sentence-t" x="24" y="37">› web app · eu · postgres · queue · storage · ≤ $250</text></g>
<g class="s s2"><path class="fan" d="M240 52 C 240 80, 92 90, 92 120 M240 52 C 240 90, 232 240, 232 270"/>${lanes.map(([name, id, x], i) => `<g class="lane lane-${i}"><line x1="${x}" x2="${x}" y1="96" y2="388"/><text class="lane-t" x="${x}" y="84" text-anchor="middle">${name}</text><text class="lane-id" x="${x}" y="384" text-anchor="middle">${id}</text></g>`).join('')}
${chip('c-ct', 33, 120, 'container')}${chip('c-st', 33, 170, 'storage')}${chip('c-qu', 33, 220, 'queue')}${chip('c-db', 173, 270, 'postgres')}</g>
<g class="s s3"><path class="wire" d="M92 148 V170 M92 198 V220 M151 134 H200 C 220 134, 232 200, 232 270"/><text class="ok-t" x="300" y="140">✓ read back</text><text class="ok-t" x="300" y="160">✓ wired</text></g>
<g class="s s4"><rect class="down" x="173" y="96" width="118" height="270"/><text class="down-t" x="232" y="118" text-anchor="middle">${esc(L.how.down)}</text>
${chip('c-db2', 313, 270, 'postgres')}<path class="move" d="M291 284 H313"/><text class="move-t" x="372" y="320" text-anchor="middle">${esc(L.how.moved)}: gcp → aws</text></g>
</svg>`;
}

function page(key) {
    const L = LOCALES[key];
    // Assets by a relative path, so the page draws the same wherever its folder is served (the gate serves seed/ as its root).
    const up = L.file.includes('/') ? '../' : '';
    const t = makeT(L.html);
    const alt = Object.values(LOCALES).map(o => `<link rel="alternate" hreflang="${o.html}" href="${SITE}${o.path}">`).join('\n');
    const nav = Object.entries(L.nav).map(([id, word]) => id === 'about' || id === 'team'
        ? `<a href="/${id}.html">${esc(word)}</a>` : `<a href="#${id}">${esc(word)}</a>`).join('');
    const langs = Object.values(LOCALES).map(o => `<li><a href="${o.path}" data-lang="${o.html === 'zh-Hans' ? 'zh' : o.html}" lang="${o.html}"${o === L ? ' aria-current="true"' : ''}>${o.name}</a></li>`).join('\n    ');
    const video = (name, cap) => `<div class="reel">
    <video class="loop" muted loop playsinline preload="none" poster="${up}media/${name}-poster.jpg" aria-hidden="true">
      <source src="${up}media/${name}.webm" type="video/webm; codecs=av01.0.05M.08">
      <source src="${up}media/${name}.mp4" type="video/mp4">
    </video>
    <button class="vid-toggle" type="button" aria-pressed="false" hidden>${esc(t('ops.pause'))}</button>
    <p class="reel-cap">${esc(cap)}</p>
  </div>`;
    return `<!doctype html>
<html lang="${L.html}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0b1423">
<title>${esc(L.title)}</title>
<meta name="description" content="${esc(L.description)}">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<link rel="canonical" href="${SITE}${L.path}">
${alt}
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta property="og:title" content="${esc(L.title)}">
<meta property="og:description" content="${esc(L.ogDescription)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${L.path}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:locale" content="${L.og}">
${Object.values(LOCALES).filter(o => o !== L).map(o => `<meta property="og:locale:alternate" content="${o.og}">`).join('\n')}
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="preload" href="${up}fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${up}style.css">
<script src="${up}app/lang.js" defer></script>
<script src="${up}app/console.js" type="module"></script>
<script src="${up}app/ops.js" type="module"></script>
</head>
<body class="home">
<a class="skip" href="#console">${esc(L.skip)}</a>
<header class="top">
  <a class="brand" href="${L.path}">${wordmark('VibeCloud')}<span>${esc(L.company)}</span></a>
  <nav class="main" aria-label="${esc(L.main)}">${nav}</nav>
  <button class="kbar" type="button" data-palette hidden aria-haspopup="dialog" aria-label="${esc(L.paletteButton)}"><kbd>⌘</kbd><kbd>K</kbd></button>
</header>

<main>
  <section class="hero" id="top" aria-labelledby="hero-title">
    <div class="hero-copy">
      <p class="kicker">${esc(L.kicker)}</p>
      <h1 id="hero-title"><span>${esc(L.h1[0])}</span> <span class="h1-b">${esc(L.h1[1])}</span></h1>
      <p class="lede">${esc(L.lede)}</p>
      <p class="hint">${esc(L.hint[0])} <kbd>⌘</kbd><kbd>K</kbd> ${esc(L.hint[1])}</p>
    </div>
    <div class="ops" id="ops" data-phase="idle">
      <div class="ops-bar"><span class="ops-path">fleet <span aria-hidden="true">›</span> illustrative</span><output id="ops-state" class="ops-state">${esc(t('ops.state.idle'))}</output></div>
      <form id="ops-form" class="ops-form">
        <label for="ops-cmd" class="vh">${esc(L.command)}</label>
        <span class="prompt" aria-hidden="true">›</span>
        <input id="ops-cmd" name="cmd" value="scale api to 6 in us-west" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en">
        <button type="submit" class="key">${esc(L.plan)} <span aria-hidden="true">↵</span></button>
      </form>
      <div id="ops-map" class="ops-map">${topology(START, START, t('ops.topology', { summary: summary(START) }))}</div>
      <ul class="legend" aria-hidden="true"><li class="lg-run">${esc(L.legend.run)}</li><li class="lg-add">${esc(L.legend.add)}</li><li class="lg-del">${esc(L.legend.del)}</li><li class="lg-ok">${esc(L.legend.ok)}</li></ul>
      <ol class="rail">${Object.entries(L.rail).map(([state, word]) => `<li data-state="${state}">${esc(word)}</li>`).join('')}</ol>
      <div class="ops-actions">
        <button type="button" id="ops-approve" class="key" disabled>${esc(L.approve)}</button>
        <button type="button" id="ops-apply" class="key amber" disabled>${esc(L.apply)}</button>
        <button type="button" id="ops-reset" class="key quiet">${esc(L.reset)}</button>
      </div>
      <ul id="ops-log" class="ops-log" aria-live="polite"></ul>
      <p class="illus">${esc(L.illustrative)}</p>
    </div>
  </section>

  <section class="deck" aria-labelledby="deck-title">
  ${video('deck-loop', L.deck.cap)}
    <div class="deck-type">
      <p class="kicker">${esc(L.deck.k)}</p>
      <h2 id="deck-title"><span>${esc(L.deck.h[0])}</span> <span class="dim">${esc(L.deck.h[1])}</span></h2>
      <p>${esc(L.deck.p)}</p>
    </div>
  </section>

  <section class="how" id="product" aria-labelledby="how-title">
    <header class="how-head"><p class="kicker">${esc(L.how.k)}</p><h2 id="how-title">${esc(L.how.h)}</h2></header>
    <div class="how-body">
      <div class="steps-col">
        ${L.how.steps.map(([id, h, p], i) => `<article class="step-text" data-step="${i + 1}"><p class="step-n">0${i + 1} · ${id}</p><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('\n        ')}
      </div>
      <figure class="stage" id="stage" data-step="4">${stage(L)}</figure>
    </div>
  </section>

  <section class="desk" id="console" aria-labelledby="console-title">
    <header class="desk-head"><p class="kicker">${esc(L.console.k)}</p><h2 id="console-title">${esc(L.console.h)}</h2><p class="sub">${esc(L.console.p)}</p></header>
    <div class="console">
      <p class="note" data-i18n="console.simulated">${esc(L.console.simulated)}</p>
      <noscript><p class="note">${esc(L.console.noscript[0])} <a href="/about.html">${esc(L.console.noscript[1])}</a>.</p></noscript>
      <form id="plan-form">
        <label for="describe">${esc(L.console.label)}</label>
        <textarea id="describe" name="describe" rows="3" spellcheck="false">${esc(SENTENCES[key][0])}</textarea>
        <div class="tries"><span>${esc(L.console.try)}</span>${SENTENCES[key].map((s, i) => `<button type="button" class="try" data-sentence="${esc(s)}">${i + 1}</button>`).join('')}</div>
        <div class="controls">
          <button class="key amber" type="submit">${esc(L.console.button)} <span aria-hidden="true">↵</span></button>
          <label for="outage">${esc(L.console.outage)}</label>
          <select id="outage" name="outage"><option value="">${esc(L.console.healthy)}</option></select>
        </div>
      </form>
      <div id="plan" aria-live="polite"></div>
    </div>
  </section>

  <section class="ledger" id="providers" aria-labelledby="providers-title">
  ${video('relief-loop', L.providers.cap)}
    <div class="ledger-type">
      <p class="kicker">${esc(L.providers.k)}</p>
      <h2 id="providers-title">${esc(L.providers.h)}</h2>
      <table class="accounts">
        <tbody>${L.providers.rows.map(([name, id, where]) => `<tr><th scope="row">${esc(name)}</th><td class="mono">${id}</td><td>${esc(where)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="note">${esc(L.providers.note)}</p>
    </div>
  </section>

  <section class="status" id="pricing" aria-labelledby="status-title">
    <p class="kicker">${esc(L.status.k)}</p>
    <h2 id="status-title">${esc(L.status.h)}</h2>
    <ul class="board" aria-describedby="board-legend">${L.status.rows.map(([state, what], i) => `<li class="${i < 2 ? 'is-built' : 'is-not'}"><span class="mono">${esc(state)}</span>${esc(what)}</li>`).join('')}</ul>
    <p class="note" id="board-legend">${esc(L.status.legend)}</p>
    <p class="pricing">${esc(L.status.pricing)}</p>
    <p class="note">${esc(L.status.prices)} ${esc(L.status.write)} <a href="mailto:hello@vibecloud.pro">hello@vibecloud.pro</a>.</p>
  </section>
</main>

<footer class="foot">
  <p id="lang-hint" hidden><a href="${L.foot.hint[0]}" hreflang="${L.foot.hint[1]}">${esc(L.foot.hint[2])}</a></p>
  <div class="row">
    <p>© 2026 VibeCloud · ${esc(L.company)} · <a href="mailto:hello@vibecloud.pro">hello@vibecloud.pro</a></p>
    <nav aria-label="${esc(L.foot.footer)}">
      <a href="/about.html">${esc(L.foot.about)}</a>
      <a href="mailto:hello@vibecloud.pro">${esc(L.foot.contact)}</a>
      <button class="lang-button" type="button" id="lang-button" commandfor="lang-dialog" command="show-modal" aria-haspopup="dialog" aria-label="${esc(L.foot.language)}">A/文</button>
    </nav>
  </div>
  <noscript><p><a href="/" hreflang="en">English</a> · <a href="/es/" hreflang="es">Español</a> · <a href="/zh/" hreflang="zh-Hans">简体中文</a></p></noscript>
</footer>

<dialog id="lang-dialog" aria-labelledby="lang-title">
  <h2 id="lang-title">${esc(L.dialog.title)}</h2>
  <ul>
    ${langs}
  </ul>
  <form method="dialog"><button class="lang-button close" type="submit">${esc(L.dialog.close)}</button></form>
</dialog>

<dialog id="palette" class="palette" aria-label="${esc(t('ops.palette'))}">
  <div class="pal-in"><span class="prompt" aria-hidden="true">›</span><input id="palette-input" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${esc(t('ops.paletteHint'))}" aria-label="${esc(t('ops.paletteHint'))}"><kbd>esc</kbd></div>
  <ul id="palette-list" role="listbox" aria-label="${esc(t('ops.palette'))}"></ul>
</dialog>
</body>
</html>
`;
}

for (const key of Object.keys(LOCALES)) writeFileSync(join(ROOT, LOCALES[key].file), page(key));
console.log('wrote', Object.values(LOCALES).map(l => l.file).join(', '));

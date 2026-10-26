// A description in one sentence → the resources it asks for, a region and a monthly ceiling.
// Deterministic on purpose: the console plans in the visitor's browser, with no key and no request.
import { CAPABILITIES } from './plan.js';

/** The regions a description can name, and the words that name them. */
export const REGIONS = Object.freeze([
    { key: 'eu', words: ['eu', 'europe', 'european', 'frankfurt', 'dublin', 'amsterdam', 'paris', 'london', 'germany', 'ireland', 'berlin', 'madrid', 'europa', 'europea', 'alemania', 'irlanda', '欧洲', '德国', '爱尔兰', '巴黎', '伦敦'] },
    { key: 'us', words: ['us', 'usa', 'u.s.', 'united states', 'virginia', 'oregon', 'california', 'america', 'ohio', 'estados unidos', 'ee. uu.', '美国', '弗吉尼亚', '俄勒冈', '加利福尼亚'] },
    { key: 'ap', words: ['asia', 'asia-pacific', 'apac', 'singapore', 'tokyo', 'mumbai', 'india', 'sydney', 'japan', 'asia-pacífico', 'singapur', 'india', '亚洲', '亚太', '新加坡', '东京', '孟买', '印度', '悉尼'] },
]);

/** The words that ask for a capability, in the order they are tried. `name` fixes the kind's flavour. */
export const CAPABILITY_WORDS = Object.freeze([
    { kind: 'gpu', name: 'h100', words: ['gpu', 'h100', 'cuda', 'training', 'entrenamiento', '显卡', '训练'] },
    { kind: 'database', name: 'postgres', words: ['postgres', 'postgresql', 'database', 'sql', 'db', 'base de datos', 'datos', '数据库'] },
    { kind: 'database', name: 'mysql', words: ['mysql', 'mariadb'] },
    { kind: 'database', name: 'd1', words: ['d1', 'sqlite'] },
    { kind: 'storage', words: ['object storage', 'storage', 'bucket', 's3', 'r2', 'blob', 'files', 'almacenamiento', 'cubo', 'objetos', '存储', '对象存储', '存储桶'] },
    { kind: 'queue', words: ['queue', 'sqs', 'pubsub', 'kafka', 'messages', 'events', 'cola', 'mensajes', '队列', '消息队列'] },
    { kind: 'cdn', words: ['cdn', 'edge cache', 'cache', 'caché', '缓存'] },
    { kind: 'container', words: ['web app', 'web application', 'web service', 'api', 'http', 'frontend', 'backend', 'container', 'docker', 'service', 'aplicación web', 'app web', 'servicio web', 'contenedor', 'servicio', '网页应用', '网页服务', '容器', '应用', '服务', '接口'] },
    { kind: 'vm', words: ['virtual machine', 'vm', 'server', 'servidor', 'máquina virtual', '服务器', '虚拟机'] },
    { kind: 'serverless', words: ['function', 'serverless', 'lambda', 'función', '函数'] },
    { kind: 'model', name: 'deepseek-chat', words: ['model', 'llm', 'inference', 'modelo', '模型'] },
]);

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (text, word) => new RegExp(`(^|[^a-z0-9])${escapeRe(word)}([^a-z0-9]|$)`, 'i').test(text);

/** The region a sentence names, or null. */
export function regionOf(text) {
    for (const r of REGIONS) if (r.words.some(w => has(text, w))) return r.key;
    return null;
}

/** A monthly ceiling in dollars (`$250`, `250 a month`, `250 美元`, `menos de 300`), or null. */
export function budgetOf(text) {
    const patterns = [
        /\$\s?(\d[\d,]*(?:\.\d+)?)/,
        /(\d[\d,]*(?:\.\d+)?)\s*(?:dollars?|usd|euros?|eur|dólares|美元|美金|欧元)/i,
        /(\d[\d,]*(?:\.\d+)?)\s*(?:a|per)\s*month/i,
        /(\d[\d,]*(?:\.\d+)?)\s*(?:al mes|por mes|每月)/i,
        /(?:under|below|max(?:imum)?|budget of|menos de|不超过)\s+\$?(\d[\d,]*(?:\.\d+)?)/i,
    ];
    for (const pattern of patterns) {
        const m = pattern.exec(text);
        if (!m) continue;
        const n = Number(m[1].replace(/,/g, ''));
        if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
}

/**
 * The resources a sentence asks for, in the order it names them. Each is `{ id, kind, name, label }`; a capability
 * named twice is one resource. → { resources, region, budgetPerMonth, unknown }
 */
export function parseWorkload(text) {
    const s = String(text ?? '');
    const found = [];
    for (const c of CAPABILITY_WORDS) {
        if (!c.words.some(w => has(s, w))) continue;
        if (found.some(f => f.kind === c.kind && (f.name ?? null) === (c.name ?? null))) continue;
        // "database" and "postgres" name one resource, not two.
        if (c.kind === 'database' && found.some(f => f.kind === 'database')) continue;
        if (c.kind === 'container' && found.some(f => f.kind === 'container')) continue;
        found.push({ id: `r${found.length + 1}`, kind: c.kind, name: c.name ?? null, label: c.name ? `${c.kind}:${c.name}` : c.kind });
    }
    return { resources: found, region: regionOf(s), budgetPerMonth: budgetOf(s), unknown: CAPABILITIES.every(k => !found.some(f => f.kind === k)) };
}

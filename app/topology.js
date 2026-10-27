// The hero's topology as SVG markup: a replica is a square, in rows by service, grouped by region.
// Wide: regions are columns. Narrow (a phone): regions are stacked, so the type stays legible at 320 px.
// One function for the page script and for scripts/pages.mjs, so the page without script draws the same fleet.
import { REGIONS, SERVICES } from './fleet.js';

const NODE = 18, GAP = 7;
const WIDE = { w: 600, h: 252, region: (i, j) => ({ x: 76 + i * 176, y: 62 + j * 46, head: [76 + i * 176, 22] }) };
const NARROW = { w: 320, h: 3 * 150, region: (i, j) => ({ x: 70, y: i * 150 + 36 + j * 28, head: [0, i * 150 + 18] }) };

/**
 * `from` is the fleet now, `to` the fleet a command proposes (none: no change). A replica is `run` (in both),
 * `add` (only in `to`) or `del` (only in `from`); the page sets each one's phase by its classes.
 */
export function topology(from, to = from, label = '', { narrow = false } = {}) {
    const L = narrow ? NARROW : WIDE;
    const parts = [`<svg class="topo${narrow ? ' narrow' : ''}" viewBox="0 0 ${L.w} ${L.h}" role="img" aria-label="${label.replace(/"/g, '&quot;')}">`];
    if (!narrow) SERVICES.forEach((s, j) => {
        const y = 62 + j * 46;
        parts.push(`<text class="t-svc" x="0" y="${y + 13}">${s}</text>`);
        parts.push(`<line class="t-row" x1="56" x2="600" y1="${y + NODE + 13}" y2="${y + NODE + 13}"/>`);
    });
    REGIONS.forEach((r, i) => {
        const [hx, hy] = L.region(i, 0).head;
        parts.push(`<text class="t-region" x="${hx}" y="${hy}">${r}</text>`);
        parts.push(`<line class="t-col" x1="${hx}" x2="${narrow ? L.w : hx + 160}" y1="${hy + 10}" y2="${hy + 10}"/>`);
        SERVICES.forEach((s, j) => {
            const { x, y } = L.region(i, j);
            if (narrow) parts.push(`<text class="t-svc" x="0" y="${y + 13}">${s}</text>`);
            const a = from[r][s], b = to[r][s];
            for (let k = 0; k < Math.max(a, b); k++) {
                const kind = k < Math.min(a, b) ? 'run' : b > a ? 'add' : 'del';
                const nx = x + k * (NODE + GAP);
                parts.push(`<g class="n ${kind}" data-node="${r}/${s}/${k}"><rect x="${nx}" y="${y}" width="${NODE}" height="${NODE}"/>`
                    + (kind === 'del' ? `<path d="M${nx} ${y + NODE} L${nx + NODE} ${y}"/>` : '')
                    + (kind === 'add' ? `<path class="tick" d="M${nx + 4} ${y + 9.5} l3.5 3.5 l6.5 -7"/>` : '')
                    + '</g>');
            }
        });
    });
    parts.push('</svg>');
    return parts.join('');
}

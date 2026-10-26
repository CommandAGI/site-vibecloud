// The three rules a placement needs from CommandAGI's service-account model
// (packages/domain/world/services.js): an account's id, whether a provider's refusal still holds it, and what a
// provider's answer says. Copied so the console runs on the same rules with no bundler and no network.

export const accountId = (service, account) => `${service}/${account}`;

export const HOLD_STATES = Object.freeze(['limited', 'exhausted', 'refused']);
export const HOLD_MS = Object.freeze({ limited: 30_000, exhausted: 15 * 60_000, refused: 15 * 60_000 });
export const HOLD_MAX_MS = 24 * 3600_000;
const USED_UP = /insufficient_quota|quota[ _-]?exceeded|exceeded your (current )?quota|credit balance is too low|billing[ _-]?(hard[ _-]?)?limit|payment required|out of credits/i;

/** Whether a mark `{ state, until }` holds its account at `now`. */
export const heldAt = (mark, now) => !!mark && HOLD_STATES.includes(mark.state) && Number(mark.until) > now;

function retryTimeOf(headers, now) {
    if (!headers) return null;
    const value = typeof headers.get === 'function' ? headers.get('retry-after') : (headers['retry-after'] ?? headers['Retry-After']);
    if (value === undefined || value === null || value === '') return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return now + seconds * 1000;
    const at = Date.parse(String(value));
    return Number.isFinite(at) ? at : null;
}

/**
 * What a provider's refusal says of its account: 429 is `limited` (or `exhausted` when the body says the quota is
 * gone), 402 is `exhausted`, 401 is `refused`, 403 is `forbidden` (no hold: the key itself is wrong). Any other
 * answer says nothing about the account.
 */
export function signalOf(answer, now) {
    const status = Number(answer?.status);
    const body = typeof answer?.body === 'string' ? answer.body.slice(0, 4000) : '';
    let state = null;
    if (status === 402) state = 'exhausted';
    else if (status === 429) state = USED_UP.test(body) ? 'exhausted' : 'limited';
    else if (status === 401) state = 'refused';
    else if (status === 403) state = USED_UP.test(body) ? 'exhausted' : 'forbidden';
    else if (status === 400 && USED_UP.test(body)) state = 'exhausted';
    if (!state) return null;
    if (state === 'forbidden') return { state, status, until: null, given: false };
    const given = retryTimeOf(answer?.headers, now);
    const until = given === null ? now + HOLD_MS[state] : Math.min(given, now + HOLD_MAX_MS);
    return { state, status, until, given: given !== null };
}

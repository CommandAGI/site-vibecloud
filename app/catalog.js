// The sample catalog the console plans against. A row is an account; a capability is a word, not a product name.
// The prices are round numbers for a demo, not quotes (docs/providers.md).
import { declaredCompute, poolOf } from './plan.js';

export const CATALOG = `service,account,region,capacity,offers,note
aws,main,us;eu;ap,,container@0.060/h;vm@0.042/h;gpu:h100@2.49/h;database:postgres@0.110/h;storage@0.023/h;queue@0.011/h;cdn@0.085/h;serverless@0.0000002/req,us-east-1 / eu-central-1 / ap-southeast-1
gcp,main,us;eu;ap,,container@0.048/h;vm@0.038/h;gpu:h100@2.20/h;database:postgres@0.100/h;storage@0.020/h;queue@0.010/h;cdn@0.080/h;serverless@0.0000002/req,us-central1 / europe-west3 / asia-south1
cloudflare,main,global,,container@0.040/h;database:d1@0.050/h;storage@0.015/h;queue@0.009/h;cdn@0.060/h;serverless@0.0000003/req,edge in every region
hetzner,eu,eu,,vm@0.006/h,the cheapest virtual machine in the sample
runpod,gpu,us;eu,,gpu:h100@1.99/h,GPU by the hour`;

/** What a month's estimate assumes for a family the catalog prices by request or by token. */
export const ASSUMPTIONS = Object.freeze({ hours: 730, requests: 2_000_000, tokens: 2_000_000 });

/** A month's cost in dollars for one offer, at the assumptions above. */
export function monthlyCost(price, unit) {
    if (price === null || price === undefined) return null;
    const cost = unit === 'req' ? price * ASSUMPTIONS.requests
        : unit === 'Mtok' ? price * (ASSUMPTIONS.tokens / 1_000_000)
            : price * ASSUMPTIONS.hours;
    return Number(cost.toFixed(4));
}

const csvLine = line => line.split(',').map(c => c.trim());

/** The sample pool, and anything wrong with the catalog (a problem is a bug in this file, tested). */
export function samplePool() {
    const { declared, problems } = declaredCompute(CATALOG.split('\n').map(csvLine));
    return { declared, pool: poolOf(declared), problems };
}

/** The sentence the console starts with, and a few more a visitor can try. */
export const SENTENCES = Object.freeze({
    en: [
        'A web app in Europe with a Postgres database, a queue and object storage, under $250 a month.',
        'A GPU for model training in the US, and a Postgres database, under $3,000 a month.',
        'An API in Singapore with a queue and a CDN, under $120 a month.',
    ],
    es: [
        'Una aplicación web en Europa con una base de datos Postgres, una cola y almacenamiento de objetos, por menos de $250 al mes.',
        'Una GPU para entrenar modelos en EE. UU. y una base de datos Postgres, por menos de $3,000 al mes.',
        'Una API en Singapur con una cola y una CDN, por menos de $120 al mes.',
    ],
    zh: [
        '一个在欧洲的网页应用，带 Postgres 数据库、队列和对象存储，每月不超过 250 美元。',
        '美国的一台 GPU 用于模型训练，加一个 Postgres 数据库，每月不超过 3,000 美元。',
        '新加坡的一个 API，带队列和 CDN，每月不超过 120 美元。',
    ],
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PangramProvider, normalizePangram } = require('../.test-dist/aiDetection/PangramProvider');
const { text, pangram, json } = require('./fixtures.cjs');

test('submit once, poll, preserve qualifications and usage; never create public dashboard links', async () => {
  const calls = [];
  const replies = [json({ task_id: 'task' }), json({ stage: 'STAGE_PREPROCESSING' }), json(pangram())];
  const provider = new PangramProvider('TEST_ONLY_KEY', 'pangram-4', 0.05, async (url, options) => {
    calls.push({ url, options }); return replies.shift();
  }, async () => {});
  const r = await provider.analyze(text, { signal: new AbortController().signal });
  assert.equal(calls.length, 3);
  assert.equal(calls.filter(c => c.options.method === 'POST').length, 1);
  assert.deepEqual(JSON.parse(calls[0].options.body), { text, model: 'pangram-4', public_dashboard_link: false });
  assert.equal(calls[0].options.headers['x-api-key'], 'TEST_ONLY_KEY');
  assert.equal(r.headline, 'Possibly AI'); assert.equal(r.segments[0].confidence, 'Low');
  assert.equal(r.version, 'fixture-4.1'); assert.equal(r.usage.estimated, true);
  assert.equal(r.balance, undefined);
});

test('mixed, assisted and human mappings are text fractions, independent of confidence', () => {
  for (const [label, key] of [['Human Written', 'human'], ['AI-Assisted', 'assisted'], ['AI-Generated', 'ai']]) {
    const r = normalizePangram(pangram(text, label), 'pangram-4');
    assert.equal(r.textFractions[key], 1); assert.equal(r.segments[0].category, key);
  }
  const p = pangram(); p.fraction_ai = 0.2; p.fraction_ai_assisted = 0.3; p.fraction_human = 0.5;
  assert.deepEqual(normalizePangram(p, 'pangram-4').textFractions, { ai: .2, assisted: .3, human: .5 });
});

test('validates normalized Unicode offsets in either unit without text-search guessing', () => {
  const p = pangram('🙂 café. café.');
  p.windows = [{ text: 'café.', label: 'New label', start_index: 8, end_index: 13 }];
  let r = normalizePangram(p, 'pangram-4');
  assert.deepEqual(r.segments[0].range, { start: 9, end: 14 });
  assert.equal(r.segments[0].category, 'unknown');
  p.windows[0].start_index = 9; p.windows[0].end_index = 14;
  assert.deepEqual(normalizePangram(p, 'pangram-4').segments[0].range, { start: 9, end: 14 });
  p.windows[0].start_index = 1;
  assert.equal(normalizePangram(p, 'pangram-4').segments[0].range, undefined);
});

test('preserves overlaps and gaps without changing provider aggregate fractions', () => {
  const p = pangram('abcdef');
  p.windows = [
    { text: 'abc', label: 'AI-Generated', start_index: 0, end_index: 3 },
    { text: 'bcde', label: 'Human Written', start_index: 1, end_index: 5 },
  ];
  const r = normalizePangram(p, 'pangram-4');
  assert.equal(r.segments.length, 2); assert.equal(r.textFractions.ai, 1);
  assert.equal(r.segments[1].range.end, 5);
});

test('rejects invalid fractions, empty results, malformed JSON and failed tasks', async () => {
  for (const change of [{ fraction_ai: NaN }, { fraction_ai: -1 }, { fraction_ai: 2 }, { text: '' }, { windows: [{}] }]) {
    assert.throws(() => normalizePangram({ ...pangram(), ...change }, 'pangram-4'), { code: 'response' });
  }
  for (const terminal of [json({ stage: 'STAGE_FAILED', headline: text }), new Response('{bad')]) {
    const replies = [json({ task_id: 'task' }), terminal];
    const provider = new PangramProvider('TEST', 'pangram-4', .05, async () => replies.shift(), async () => {});
    await assert.rejects(provider.analyze(text, { signal: new AbortController().signal }), e => !e.message.includes(text));
  }
});

test('HTTP failures are private-safe and ambiguous submission is never retried', async () => {
  for (const status of [401, 402, 403, 404, 422, 429, 500, 503]) {
    let calls = 0;
    const provider = new PangramProvider('TEST', 'pangram-4', .05, async () => { calls++; return json({ secret: text }, status); });
    await assert.rejects(provider.analyze(text, { signal: new AbortController().signal }), { code: `http_${status}` });
    assert.equal(calls, 1);
  }
  let calls = 0;
  const provider = new PangramProvider('TEST', 'pangram-4', .05, async () => { calls++; throw new Error(text); });
  await assert.rejects(provider.analyze(text, { signal: new AbortController().signal }), { code: 'connection' });
  assert.equal(calls, 1);
});

test('polling retries transport/5xx/429 failures and honors Retry-After', async () => {
  const delays = [];
  const replies = [json({ task_id: 'task' }), new Error('network'), json({}, 503), json({}, 429, { 'Retry-After': '12' }), json(pangram())];
  const provider = new PangramProvider('TEST', 'pangram-4', .05, async () => {
    const next = replies.shift(); if (next instanceof Error) throw next; return next;
  }, async ms => { delays.push(ms); });
  await provider.analyze(text, { signal: new AbortController().signal });
  assert.deepEqual(delays, [1000, 2000, 4000, 12000]);
});

test('deadline abort tells requester a charge may still occur', async () => {
  const controller = new AbortController();
  const provider = new PangramProvider('TEST', 'pangram-4', .05, async () => json({ task_id: 'task' }), async () => {
    controller.abort(); throw new Error('aborted');
  });
  await assert.rejects(provider.analyze(text, { signal: controller.signal }), e => e.code === 'timeout' && /charge/.test(e.message));
});

test('interrupted poll body retries GET without resubmitting paid work', async () => {
  const broken = new Response(new ReadableStream({ start(controller) { controller.error(new Error('transport interrupted')); } }));
  const replies = [json({ task_id: 'task' }), broken, json(pangram())];
  const methods = [];
  const provider = new PangramProvider('TEST', 'pangram-4', .05, async (_url, options) => {
    methods.push(options.method); return replies.shift();
  }, async () => {});
  await provider.analyze(text, { signal: new AbortController().signal });
  assert.deepEqual(methods, ['POST', 'GET', 'GET']);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AiCheckService, PublishRejected } = require('../.test-dist/aiDetection/AiCheckService');
const { text, result, context } = require('./fixtures.cjs');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const setup = t => {
  let now = 1_000_000, calls = 0;
  const service = new AiCheckService({ name: 'Fixture', minimumWords: 50, analyze: async source => { calls++; return result(source); } }, () => now);
  t.after(() => service.dispose());
  return { service, calls: () => calls, now: () => now, tick: ms => { now += ms; } };
};

test('deduplicates interactions, binds owner/guild/channel, and does not charge invalid input', async t => {
  const s = setup(t);
  const session = s.service.create(context, 'i1');
  assert.throws(() => s.service.create(context, 'i1'), { code: 'duplicate' });
  for (const change of [{ userId: 'other' }, { guildId: 'other' }, { channelId: 'other' }]) {
    assert.throws(() => s.service.get(session.id, { ...context, ...change }), { code: 'owner' });
  }
  await assert.rejects(s.service.analyze(session, async () => 'tiny', s.now()), { code: 'short' });
  assert.equal(s.calls(), 0);
  const next = s.service.create(context, 'i2');
  await s.service.analyze(next, async () => text, s.now());
  assert.equal(s.calls(), 1);
  await assert.rejects(s.service.analyze(next, async () => text, s.now()), { code: 'duplicate' });
  const third = s.service.create(context, 'i3');
  await assert.rejects(s.service.analyze(third, async () => text, s.now()), { code: 'cooldown' });
  s.tick(60_000);
  await s.service.analyze(third, async () => text, s.now());
  assert.equal(s.calls(), 2);
});

test('reserves one user and two global slots atomically; releases slots on errors', async t => {
  const gate = deferred();
  const service = new AiCheckService({ name: 'Fixture', minimumWords: 50, analyze: async () => { await gate.promise; return result(); } });
  t.after(() => service.dispose());
  const first = service.create(context, '1');
  const second = service.create({ ...context, userId: 'second' }, '2');
  const sameUser = service.create(context, '3');
  const third = service.create({ ...context, userId: 'third' }, '4');
  const a = service.analyze(first, async () => text, Date.now());
  const b = service.analyze(second, async () => text, Date.now());
  await assert.rejects(service.analyze(sameUser, async () => text, Date.now()), { code: 'active' });
  await assert.rejects(service.analyze(third, async () => text, Date.now()), { code: 'busy' });
  gate.reject(new Error('sensitive raw response'));
  await assert.rejects(a, { code: 'analysis' }); await assert.rejects(b, { code: 'analysis' });
  // Invalid input reaches validation: both capacity reservations were released.
  await assert.rejects(service.analyze(third, async () => 'tiny', Date.now()), { code: 'short' });
});

test('report controls expire before token deadline; restart loses controls; cancelled modals expire', async t => {
  const s = setup(t);
  const cancelled = s.service.create(context, 'cancelled');
  s.tick(600_001);
  assert.throws(() => s.service.get(cancelled.id, context), { code: 'expired' });
  const session = s.service.create(context, 'scan');
  const interactionTime = s.now() - 5 * 60_000;
  await s.service.analyze(session, async () => text, interactionTime);
  assert.equal(session.expiresAt, interactionTime + 14 * 60_000);
  s.tick(9 * 60_000 + 1);
  assert.throws(() => s.service.get(session.id, context), { code: 'expired' });
  const another = s.service.create(context, 'restart');
  s.service.dispose();
  assert.throws(() => s.service.get(another.id, context), { code: 'expired' });
});

test('bounded session store evicts old completed/input sessions, not active work', async t => {
  const s = setup(t);
  const first = s.service.create(context, 'first');
  for (let n = 0; n < 100; n++) s.service.create(context, `next-${n}`);
  assert.throws(() => s.service.get(first.id, context), { code: 'expired' });
});

test('a session that expires while access is being checked cannot scan or publish', async t => {
  const s = setup(t), input = s.service.create(context, 'input');
  s.tick(600_001);
  await assert.rejects(s.service.analyze(input, async () => text, s.now()), { code: 'expired' });
  assert.equal(s.calls(), 0);
  const ready = s.service.create(context, 'ready');
  await s.service.analyze(ready, async () => text, s.now());
  s.tick(600_001);
  await assert.rejects(s.service.publish(ready, async () => assert.fail('must not publish')), { code: 'expired' });
});

test('sharing locks double clicks, reuses result and remembers success before UI acknowledgement', async t => {
  const s = setup(t), session = s.service.create(context, 'scan');
  await s.service.analyze(session, async () => text, s.now());
  const gate = deferred(); let sends = 0;
  const a = s.service.publish(session, async () => { sends++; return gate.promise; });
  await assert.rejects(s.service.publish(session, async () => { sends++; }), { code: 'sharing' });
  gate.resolve({ id: 'public', url: 'https://discord.com/channels/g/c/public' });
  await a;
  assert.equal((await s.service.publish(session, async () => { sends++; })).id, 'public');
  assert.equal(sends, 1); assert.equal(s.calls(), 1);
});

test('definite publish rejection permits retry; ambiguous failure permanently locks this report', async t => {
  const s = setup(t), session = s.service.create(context, 'scan');
  await s.service.analyze(session, async () => text, s.now());
  await assert.rejects(s.service.publish(session, async () => { throw new PublishRejected(); }), { code: 'publish_rejected' });
  assert.equal(session.share, 'available');
  await assert.rejects(s.service.publish(session, async () => { throw new Error('lost response'); }), { code: 'share_unknown' });
  await assert.rejects(s.service.publish(session, async () => assert.fail('must not send again')), { code: 'share_unknown' });
  assert.equal(s.calls(), 1);
});

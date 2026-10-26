const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wordCount, validateText, readTextAttachment, readLimited } = require('../.test-dist/aiDetection/input');
const { text } = require('./fixtures.cjs');
const signal = () => new AbortController().signal;
const attachment = { name: 'comment.txt', size: 100, url: 'https://cdn.discordapp.com/attachments/fixture.txt' };

test('Unicode word counts and inclusive minimum/maximum boundaries', () => {
  assert.equal(wordCount('Café 🙂 Seattle'), 2);
  for (const n of [50, 5000]) assert.doesNotThrow(() => validateText('word '.repeat(n), 50));
  for (const [n, code] of [[49, 'short'], [5001, 'long']]) assert.throws(() => validateText('word '.repeat(n), 50), { code });
  assert.throws(() => validateText(' \n\t', 50), { code: 'empty' });
  assert.throws(() => validateText(text + '\0', 50), { code: 'binary' });
  assert.throws(() => validateText('x'.repeat(262145), 50), { code: 'size' });
});

test('reads supplied UTF-8 .txt attachment, removing only BOM', async () => {
  const original = '\ufeff# Markdown\r\n\n  ' + text;
  const decoded = await readTextAttachment(attachment, signal(), async (_url, options) => {
    assert.equal(options.redirect, 'error'); return new Response(original);
  });
  assert.equal(decoded, original.slice(1));
});

test('rejects attachment format, declared size and external host before any fetch', async () => {
  let called = false;
  for (const change of [{ name: 'report.pdf' }, { size: 262145 }, { url: 'http://cdn.discordapp.com/x' }, { url: 'https://evil.example/x' }]) {
    await assert.rejects(readTextAttachment({ ...attachment, ...change }, signal(), async () => { called = true; }), { code: 'file' });
  }
  assert.equal(called, false);
});

test('enforces streamed byte limits even with misleading metadata; rejects invalid UTF-8', async () => {
  await assert.rejects(readTextAttachment(attachment, signal(), async () => new Response('x'.repeat(262145))), { code: 'size' });
  await assert.rejects(readTextAttachment(attachment, signal(), async () => new Response(new Uint8Array([0xc3, 0x28]))), { code: 'file' });
  await assert.rejects(readLimited(new Response('12345'), 4), { code: 'size' });
});

test('test harness refuses real network access', () => {
  assert.throws(() => globalThis.fetch('https://example.invalid'), /forbidden/);
  assert.throws(() => require('node:net').connect(443, 'example.invalid'), /forbidden/);
});

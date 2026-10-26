const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summaryEmbed, segmentPages, fullReport, segmentChart, reportFiles, budgetText } = require('../.test-dist/aiDetection/report');
const { result, text, context } = require('./fixtures.cjs');
const session = (r = result()) => ({ ...context, id: '123', result: r, submittedText: text, completedAt: 1_000_000, expiresAt: 1_600_000 });

test('a second provider can lack percentage, segments, usage and balance without inventing values', () => {
  const r = { provider: 'Another detector', model: 'test', analyzedText: text, headline: 'Inconclusive', explanation: 'Document confidence only', segments: [] };
  const embed = summaryEmbed(session(r));
  assert.match(embed.fields[0].value, /Unavailable/);
  assert.doesNotMatch(embed.fields[0].value, /0\.0%/);
  assert.equal(segmentChart(r), undefined);
  assert.match(segmentPages(r)[0], /did not return/);
  assert.match(budgetText(r), /unavailable/);
});

test('small nonzero fractions stay visible and reported balances include units and timestamp', () => {
  const r = result(); r.textFractions.ai = .0002;
  r.balance = { amount: 12.5, unit: 'USD', observedAt: 0 };
  assert.match(summaryEmbed(session(r)).fields[0].value, /<0.1%/);
  assert.match(budgetText(r), /12.5 USD \(observed 1970/);
});

test('long segments paginate within Discord limits after escaping; full attachment preserves original', () => {
  const source = '**@everyone** 🙂 `text`\n'.repeat(1000);
  const r = result(source), s = session(r);
  s.submittedText = source;
  const pages = segmentPages(r);
  assert.ok(pages.length > 1);
  assert.ok(pages.every(p => p.length <= 4096));
  assert.ok(pages.every(p => !p.includes('@everyone')));
  const complete = fullReport(s).toString();
  assert.ok(complete.includes(source));
  assert.match(complete, /confidence: Low/);
});

test('normalization and unverified ranges are disclosed; all classified text remains in report', () => {
  const r = result('Provider normalized the input.'); r.segments[0].range = undefined;
  const s = session(r);
  assert.match(summaryEmbed(s).fields[1].value, /normalized/);
  assert.match(fullReport(s).toString(), /ANALYZED TEXT/);
  assert.match(fullReport(s).toString(), /position unavailable/);
  assert.equal(segmentChart(r), undefined);
});

test('chart is an actual PNG and rendering failure still delivers complete text', () => {
  const image = segmentChart(result());
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 1000);
  assert.equal(reportFiles(session()).length, 2);
  const files = reportFiles(session(), () => { throw new Error('canvas failed'); });
  assert.equal(files.length, 1); assert.equal(files[0].name, 'ai-report.txt');
});

test('summary fields fit individual and aggregate Discord limits with hostile provider strings', () => {
  const r = result(); r.provider = '*'.repeat(10_000); r.explanation = '@everyone'.repeat(10_000); r.model = 'm'.repeat(5000);
  const e = summaryEmbed(session(r));
  assert.ok(e.title.length <= 256); assert.ok(e.description.length <= 4096);
  assert.ok(e.fields.every(f => f.value.length <= 1024));
  const length = e.title.length + e.description.length + e.footer.text.length + e.fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
  assert.ok(length <= 6000);
});

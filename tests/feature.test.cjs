const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const { createAiCheckFeature } = require('../.test-dist/aiDetection/createAiCheckFeature');
const { text, result } = require('./fixtures.cjs');

const validSettings = () => ({
  config: { enabled: true, guildId: '12345678901234567', provider: 'pangram', model: 'pangram-4', usdPer100Words: .05 },
  channelId: '12345678901234568', roleId: '12345678901234569', apiKey: 'SYNTHETIC_TEST_KEY',
});

test('feature factory imports without loading the server entrypoint', () => {
  assert.equal(require.cache[require.resolve('../.test-dist/server')], undefined);
});

test('configuration validation fails closed using fixtures, not deployment config values', async t => {
  for (const change of [
    s => { s.config = undefined; }, s => { s.config.enabled = false; },
    s => { s.apiKey = ''; }, s => { s.channelId = ''; }, s => { s.roleId = ''; },
    s => { s.config.guildId = ''; }, s => { s.config.model = ''; },
    s => { s.config.provider = 'unsupported'; }, s => { s.config.usdPer100Words = NaN; },
  ]) {
    const settings = validSettings(); change(settings);
    const feature = createAiCheckFeature(() => settings, { provider: () => assert.fail('must not construct provider') });
    t.after(() => feature.dispose());
    await assert.rejects(feature.commands[0].execute({}), { code: 'disabled' });
  }
});

test('enabled configuration composes an injected provider and completes a private report offline', async t => {
  const settings = validSettings();
  let analyses = 0, providerConstructions = 0, modal;
  const edits = [], replies = [];
  const feature = createAiCheckFeature(() => settings, { provider: (config, key) => {
    providerConstructions++;
    assert.equal(config.model, 'pangram-4'); assert.equal(key, 'SYNTHETIC_TEST_KEY');
    return { name: 'Offline provider', minimumWords: 50, analyze: async input => { analyses++; return result(input); } };
  } });
  t.after(() => feature.dispose());
  const command = feature.commands[0];
  assert.equal(command.builder.toJSON().name, command.name);
  assert.equal(command.builder.toJSON().description, command.description);
  assert.equal(command.privateErrors, true); assert.equal(command.telemetry, false);
  const channel = { id: settings.channelId, isThread: () => false, permissionsFor: () => ({ has: () => true }) };
  const member = { id: 'user', roles: { cache: new Map() } };
  const input = {
    id: 'command', user: { id: 'user' }, guildId: settings.config.guildId, channelId: channel.id, channel, member,
    guild: { members: { fetch: async () => member }, channels: { fetch: async () => channel } },
    options: { getAttachment: () => null }, showModal: async value => { modal = value.toJSON(); },
  };
  await command.execute(input);
  const submit = {
    ...input, id: 'modal', customId: modal.custom_id, createdTimestamp: Date.now(),
    isButton: () => false, isModalSubmit: () => true,
    components: { getTextInputValue: () => text },
    deferReply: async p => { assert.equal(p.flags, MessageFlags.Ephemeral); submit.deferred = true; },
    editReply: async p => { edits.push(p); return { id: 'report' }; },
    reply: async p => replies.push(p),
  };
  await feature.handleInteraction(submit);
  assert.equal(analyses, 1); assert.equal(providerConstructions, 1);
  assert.ok(edits.at(-1).files.some(f => f.name === 'ai-report.txt'));
  settings.config.enabled = false;
  await assert.rejects(command.execute(input), { code: 'disabled' });
  await feature.handleInteraction({ ...submit, deferred: false, reply: async p => replies.push(p) });
  assert.equal(replies.at(-1).flags, MessageFlags.Ephemeral);
  assert.match(replies.at(-1).content, /disabled/);
});

test('component boundary keeps unexpected handler failures private without raw details', async t => {
  const feature = createAiCheckFeature(validSettings, { provider: () => ({ name: 'Fixture', minimumWords: 50, analyze: async () => result() }) });
  t.after(() => feature.dispose());
  const followups = [];
  const input = {
    customId: 'ai-check:summary:' + 'a'.repeat(24), deferred: true,
    isButton: () => true, isModalSubmit: () => false,
    deferUpdate: async () => { throw new Error('SENSITIVE SDK DATA'); },
    followUp: async p => followups.push(p),
  };
  await feature.handleInteraction(input);
  assert.equal(followups[0].flags, MessageFlags.Ephemeral);
  assert.ok(!followups[0].content.includes('SENSITIVE'));
});

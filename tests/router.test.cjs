const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
// Stub the composition root BEFORE importing the router. Never execute server.js.
const serverPath = require.resolve('../.test-dist/server');
const debugPosts = [];
require.cache[serverPath] = { id: serverPath, filename: serverPath, loaded: true,
  exports: { configuration: { channelIds: { DEBUG: 'debug' } }, expressServer: { getTelemetry: () => null } } };
const Router = require('../.test-dist/commands/slash/SlashCommandRouter').default;
const { Environment } = require('../.test-dist/utils/constants');

test('shared router keeps private-policy failures private and never writes diagnostic payloads', async () => {
  Environment.DEBUG = true;
  let handler;
  new Router({ addEventListener: (_event, callback) => { handler = callback; } },
    { client: { guilds: { cache: { map: () => [] } } } }, [{
      name: 'ai-check', privateErrors: true, telemetry: false, builder: { toJSON: () => ({}) },
      execute: async () => { throw new Error('SECRET'); },
    }]);
  const responses = [];
  await handler({
    isChatInputCommand: () => true, commandName: 'ai-check', replied: false, deferred: false,
    isButton: () => false, options: { data: [{ name: 'text', value: 'SECRET' }], getSubcommand: () => null },
    guild: { channels: { fetch: async () => ({ isTextBased: () => true, send: async p => debugPosts.push(p) }) } },
    reply: async p => responses.push(p),
  });
  assert.equal(debugPosts.length, 0); assert.equal(responses[0].flags, MessageFlags.Ephemeral);
  assert.ok(!responses[0].content.includes('SECRET'));
});

test('command composition fails closed without tokens/configuration and defaults remain disabled', async () => {
  const commands = require('../.test-dist/commands/slash/aiCheck').default;
  const command = commands.find(c => c.name === 'ai-check');
  assert.equal(command.privateErrors, true);
  assert.equal(command.telemetry, false);
  await assert.rejects(command.execute({}), { code: 'disabled' });
  const root = require.cache[serverPath].exports;
  root.configuration.aiDetection = { enabled: true, guildId: '12345678901234567', provider: 'pangram', model: 'pangram-4', usdPer100Words: .05 };
  root.configuration.channelIds.SUBREDDIT_CHAT = '12345678901234568';
  root.configuration.roleIds = { subredditModerator: '12345678901234569' };
  Environment.pangramApiKey = '';
  await assert.rejects(command.execute({}), { code: 'disabled' });
  for (const config of [require('../src/devConfig.json'), require('../src/seabotConfig.json')]) {
    assert.equal(config.aiDetection.enabled, false);
    assert.equal(config.aiDetection.guildId, '');
  }
});

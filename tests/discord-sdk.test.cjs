const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client, ThreadMemberManager, InteractionWebhook, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { AiCheckService } = require('../.test-dist/aiDetection/AiCheckService');
const { AiCheckInteractions } = require('../.test-dist/aiDetection/interactions');
const { result, text, context } = require('./fixtures.cjs');

test('real SDK thread cache cannot authorize a removed private-thread member', async t => {
  const client = new Client({ intents: [] });
  t.after(() => client.destroy());
  let requests = 0;
  client.rest.get = async () => { requests++; throw Object.assign(new Error('Synthetic missing member'), { status: 404 }); };
  const member = { id: 'requester', roles: { cache: new Map() } };
  const channel = {
    id: 'thread', client, type: ChannelType.PrivateThread, parentId: 'chat',
    isThread: () => true, permissionsFor: () => ({ has: p => p === PermissionFlagsBits.ViewChannel }),
  };
  channel.members = new ThreadMemberManager(channel);
  channel.members.cache.set(member.id, { id: member.id });
  const service = new AiCheckService({ name: 'Fixture', minimumWords: 50, analyze: async () => assert.fail('must not scan') });
  t.after(() => service.dispose());
  const handlers = new AiCheckInteractions(service, { guildId: 'guild', channelId: 'chat', roleId: 'mod' });
  await assert.rejects(handlers.execute({
    id: 'input', user: member, member, guildId: 'guild', channelId: channel.id, channel,
    guild: { members: { fetch: async () => member }, channels: { fetch: async () => channel } },
    options: { getAttachment: () => ({ name: 'post.txt' }) }, deferReply: async () => {},
  }), { code: 'access' });
  assert.equal(requests, 1);
});

test('SDK webhook serialization preserves report attachments through private navigation', async t => {
  const client = new Client({ intents: [] });
  t.after(() => client.destroy());
  const webhook = new InteractionWebhook(client, '12345678901234567', 'SYNTHETIC_TOKEN');
  const patches = [];
  let message = {
    id: '12345678901234568', channel_id: '12345678901234569', type: 0,
    author: { id: '12345678901234567', username: 'Fixture', discriminator: '0000', avatar: null, bot: true },
    content: '', timestamp: new Date().toISOString(), edited_timestamp: null,
    attachments: [], embeds: [], components: [], mentions: [], mention_roles: [], flags: MessageFlags.Ephemeral,
  };
  client.rest.patch = async (_route, request) => {
    patches.push(request);
    const { body, files } = request;
    for (const key of ['content', 'embeds', 'components']) if (body[key] !== undefined) message[key] = body[key];
    if (body.attachments !== undefined) {
      message.attachments = body.attachments.map((attachment, i) => ({
        id: String(100 + i), filename: files[i].name, size: files[i].data.length,
        url: `https://example.invalid/${files[i].name}`, proxy_url: `https://example.invalid/${files[i].name}`,
      }));
    }
    return { ...message };
  };
  const service = new AiCheckService({ name: 'Fixture', minimumWords: 50, analyze: async () => result() });
  t.after(() => service.dispose());
  const session = service.create(context, 'scan');
  await service.analyze(session, async () => text, Date.now());
  const handlers = new AiCheckInteractions(service, { guildId: 'guild', channelId: 'chat', roleId: 'mod' });
  await handlers.deliver({
    user: { id: 'requester' }, guildId: 'guild', channelId: 'chat',
    editReply: payload => webhook.editMessage('@original', payload),
    fetchReply: async () => assert.fail('first delivery must work'),
    followUp: async () => assert.fail('delivery must not fail'),
  }, session);
  const channel = { id: 'chat', isThread: () => false, permissionsFor: () => ({ has: () => true }) };
  const member = { id: 'requester', roles: { cache: new Map() } };
  const button = action => ({
    customId: `ai-check:${action}:${session.id}${action === 'page' ? ':0' : ''}`,
    user: member, member, guildId: 'guild', channelId: 'chat', channel,
    guild: { members: { fetch: async () => member }, channels: { fetch: async () => channel } },
    isButton: () => true, isModalSubmit: () => false, message: { id: session.messageId },
    deferUpdate: async () => {}, editReply: payload => webhook.editMessage('@original', payload),
  });
  await handlers.handle(button('page'));
  await handlers.handle(button('summary'));
  assert.equal(patches.length, 3);
  assert.equal(patches[0].files.length, 2);
  assert.ok(patches[0].files.every(file => Buffer.isBuffer(file.data)));
  for (const patch of patches) {
    assert.deepEqual(patch.body.allowed_mentions.parse, []);
    assert.ok(patch.body.components[0].components.length <= 5);
  }
  for (const patch of patches.slice(1)) {
    assert.equal(patch.body.attachments, undefined);
    assert.equal(patch.files.length, 0);
  }
  assert.deepEqual(message.attachments.map(a => a.filename), ['ai-report.txt', 'ai-segments.png']);
  assert.equal(message.embeds[0].image.url, 'attachment://ai-segments.png');
  assert.equal(message.flags, MessageFlags.Ephemeral);
});

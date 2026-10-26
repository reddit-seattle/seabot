const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const { AiCheckService } = require('../.test-dist/aiDetection/AiCheckService');
const { AiCheckInteractions, authorized, aiCheckBuilder } = require('../.test-dist/aiDetection/interactions');
const { respondPrivateError } = require('../.test-dist/discord/privateErrors');
const { result, text } = require('./fixtures.cjs');

const access = { guildId: 'guild', channelId: 'chat', roleId: 'subreddit-mod' };
function harness(t, changes = {}) {
  const calls = { edits: [], replies: [], followups: [], modals: [], sends: [], defers: [], analyses: 0 };
  const state = { roles: [], channelId: 'chat', parentId: null, canView: true, canSend: true, botAttach: true, privateThread: false, member: true, ...changes };
  const member = () => ({ id: 'requester', roles: { cache: new Map(state.roles.map(r => [r, r])) } });
  const channel = {
    get id() { return state.channelId; }, get parentId() { return state.parentId; },
    get type() { return state.privateThread ? 12 : 0; },
    isThread: () => !!state.parentId, isSendable: () => true,
    permissionsFor: user => ({ has: permissions => {
      const all = Array.isArray(permissions) ? permissions : [permissions];
      return all.every(p => p === PermissionFlagsBits.ViewChannel ? state.canView :
        p === PermissionFlagsBits.ManageThreads ? false :
        p === PermissionFlagsBits.AttachFiles && user.id === 'bot' ? state.botAttach : state.canSend);
    } }),
    members: { fetch: async () => state.member ? { id: 'requester' } : null },
    send: async payload => { calls.sends.push(payload); if (state.sendError) throw state.sendError; return { id: 'public', url: 'https://discord.com/channels/guild/chat/public' }; },
  };
  const service = new AiCheckService({ name: 'Fixture provider', minimumWords: 50, analyze: async source => { calls.analyses++; return { ...result(source), billingUrl: 'https://example.invalid/billing' }; } });
  t.after(() => service.dispose());
  const handlers = new AiCheckInteractions(service, access, async () => new Response(text), changes.chart);
  const interaction = (kind, extra = {}) => {
    const i = {
      id: Math.random().toString(), guildId: 'guild', channelId: state.channelId, channel,
      user: { id: 'requester' }, member: { roles: [...state.roles] },
      guild: { members: { fetch: async () => member(), fetchMe: async () => ({ id: 'bot' }) }, channels: { fetch: async () => channel } },
      createdTimestamp: Date.now(), message: { id: 'private' }, deferred: false, replied: false,
      options: { getAttachment: () => null }, components: { getTextInputValue: () => text },
      isChatInputCommand: () => kind === 'slash', isModalSubmit: () => kind === 'modal', isButton: () => kind === 'button',
      showModal: async modal => { calls.modals.push(modal.toJSON()); i.replied = true; },
      deferReply: async payload => { calls.defers.push(payload); i.deferred = true; },
      deferUpdate: async () => { calls.defers.push('update'); i.deferred = true; },
      editReply: async payload => { calls.edits.push(payload); if (state.editError) throw new Error('TOKEN SECRET'); return { id: 'private' }; },
      reply: async payload => { calls.replies.push(payload); i.replied = true; },
      followUp: async payload => { calls.followups.push(payload); }, ...extra,
    };
    return i;
  };
  const scan = async () => {
    await handlers.execute(interaction('slash'));
    const customId = calls.modals.at(-1).custom_id;
    await handlers.handle(interaction('modal', { customId }));
    return customId.split(':')[2];
  };
  return { calls, state, handlers, service, interaction, scan };
}

test('exact channel/role OR rule, including threads, with no administrator bypass', () => {
  assert.equal(authorized(access, 'guild', 'chat', null, []), true);
  assert.equal(authorized(access, 'guild', 'thread', 'chat', []), true);
  assert.equal(authorized(access, 'guild', 'elsewhere', null, ['subreddit-mod']), true);
  for (const args of [['other', 'chat', null, ['subreddit-mod']], [null, 'chat', null, []], ['guild', 'elsewhere', null, ['administrator']]]) {
    assert.equal(authorized(access, ...args), false);
  }
  const definition = aiCheckBuilder().toJSON();
  assert.equal(definition.name, 'ai-check'); assert.equal(definition.options[0].name, 'file');
  assert.equal(definition.default_member_permissions, undefined);
});

test('modal uses pinned builder API; scanning and navigation are private and sharing costs no rescan', async t => {
  const h = harness(t);
  const id = await h.scan();
  assert.equal(h.calls.modals[0].components[0].component.max_length, 4000);
  assert.equal(h.calls.modals[0].components[0].label, 'Text to send to Fixture provider');
  assert.equal(h.calls.defers[0].flags, MessageFlags.Ephemeral);
  assert.equal(h.calls.sends.length, 0);
  assert.equal(h.calls.edits.at(-1).files.length, 2);
  await h.handlers.handle(h.interaction('button', { customId: `ai-check:page:${id}:0` }));
  const page = h.calls.edits.at(-1);
  assert.match(page.embeds[0].description, /Confidence: Low/);
  assert.equal(page.components[0].toJSON().components.length, 5);
  assert.deepEqual(page.allowedMentions.parse, []);
  await h.handlers.handle(h.interaction('button', { customId: `ai-check:summary:${id}` }));
  assert.equal(h.calls.edits.at(-1).embeds[0].image.url, 'attachment://ai-segments.png');
  await h.handlers.handle(h.interaction('button', { customId: `ai-check:share:${id}` }));
  await h.handlers.handle(h.interaction('button', { customId: `ai-check:share:${id}` }));
  assert.equal(h.calls.sends.length, 1); assert.equal(h.calls.analyses, 1);
  const shared = h.calls.sends[0];
  assert.equal(shared.nonce, id); assert.equal(shared.enforceNonce, true);
  assert.deepEqual(shared.allowedMentions.parse, []);
  assert.equal(shared.components, undefined);
  assert.ok(shared.files.every(f => Buffer.isBuffer(f.attachment)));
});

test('file input defers privately, reads once, and returns text even if chart rendering fails', async t => {
  const h = harness(t, { chart: () => { throw new Error('canvas'); } });
  await h.handlers.execute(h.interaction('slash', { options: { getAttachment: () => ({ name: 'post.txt', size: text.length, url: 'https://cdn.discordapp.com/attachments/f.txt' }) } }));
  assert.equal(h.calls.modals.length, 0); assert.equal(h.calls.analyses, 1);
  assert.equal(h.calls.defers[0].flags, MessageFlags.Ephemeral);
  assert.equal(h.calls.edits.at(-1).files.length, 1);
  assert.match(h.calls.edits.at(-1).embeds[0].fields.at(-1).value, /chart could not be rendered/);
});

test('denied guild/DM/channel inputs stay private and never scan', async t => {
  const h = harness(t, { channelId: 'elsewhere' });
  await h.handlers.execute(h.interaction('slash'));
  await h.handlers.execute(h.interaction('slash', { guildId: null, guild: null }));
  assert.equal(h.calls.analyses, 0); assert.equal(h.calls.modals.length, 0);
  assert.ok(h.calls.replies.every(r => r.flags === MessageFlags.Ephemeral));
});

test('supports uncached and cached member role representations outside allowed channel', async t => {
  const h = harness(t, { channelId: 'elsewhere', roles: ['subreddit-mod'] });
  await h.handlers.execute(h.interaction('slash'));
  await h.handlers.execute(h.interaction('slash', { member: { roles: { cache: new Map([['subreddit-mod', {}]]) } } }));
  assert.equal(h.calls.modals.length, 2);
});

test('authorization is checked again after opening a modal', async t => {
  const h = harness(t, { channelId: 'elsewhere', roles: ['subreddit-mod'] });
  await h.handlers.execute(h.interaction('slash'));
  const customId = h.calls.modals[0].custom_id;
  h.state.roles = [];
  await h.handlers.handle(h.interaction('modal', { customId }));
  assert.equal(h.calls.analyses, 0); assert.match(h.calls.edits.at(-1).content, /Subreddit Mod/);
});

test('buttons enforce requester/message binding and reject expired state privately', async t => {
  const h = harness(t), id = await h.scan();
  for (const extra of [{ user: { id: 'other' } }, { message: { id: 'other' } }, {}]) {
    if (Object.keys(extra).length === 0) h.service.dispose();
    await h.handlers.handle(h.interaction('button', { customId: `ai-check:share:${id}`, ...extra }));
  }
  assert.equal(h.calls.sends.length, 0);
  assert.ok(h.calls.followups.every(r => r.flags === MessageFlags.Ephemeral));
});

test('revoked view/post/attachment access blocks publishing without destroying private results', async t => {
  for (const change of [{ canView: false }, { canSend: false }, { botAttach: false }]) {
    const h = harness(t), id = await h.scan();
    Object.assign(h.state, change);
    await h.handlers.handle(h.interaction('button', { customId: `ai-check:share:${id}` }));
    assert.equal(h.calls.sends.length, 0);
    assert.equal(h.calls.followups.at(-1).flags, MessageFlags.Ephemeral);
  }
});

test('private-thread membership loss blocks scan even when parent channel is allowed', async t => {
  const h = harness(t, { channelId: 'thread', parentId: 'chat', privateThread: true, member: false });
  await h.scan();
  assert.equal(h.calls.analyses, 0); assert.match(h.calls.edits.at(-1).content, /no longer a member/);
});

test('navigation rechecks current channel access even when interaction roles appear valid', async t => {
  const h = harness(t), id = await h.scan();
  const before = h.calls.edits.length;
  h.state.canView = false;
  await h.handlers.handle(h.interaction('button', { customId: `ai-check:page:${id}:0` }));
  assert.equal(h.calls.edits.length, before);
  assert.match(h.calls.followups.at(-1).content, /no longer have access/);
  assert.equal(h.calls.followups.at(-1).flags, MessageFlags.Ephemeral);
});

test('unconfirmed publish disables posting; lost private acknowledgement cannot duplicate successful post', async t => {
  const h = harness(t), id = await h.scan();
  h.state.sendError = new Error('SECRET request body');
  await h.handlers.handle(h.interaction('button', { customId: `ai-check:share:${id}` }));
  h.state.sendError = undefined;
  await h.handlers.handle(h.interaction('button', { customId: `ai-check:share:${id}` }));
  assert.equal(h.calls.sends.length, 1);
  assert.ok(h.calls.followups.every(r => !r.content.includes('SECRET')));
  const second = harness(t), next = await second.scan();
  second.state.editError = true;
  await second.handlers.handle(second.interaction('button', { customId: `ai-check:share:${next}` }));
  await second.handlers.handle(second.interaction('button', { customId: `ai-check:share:${next}` }));
  assert.equal(second.calls.sends.length, 1);
});

test('private error boundary handles fresh, deferred, component and modal acknowledgements without raw errors', async t => {
  const h = harness(t);
  await respondPrivateError(h.interaction('slash'), new Error('SECRET'));
  await respondPrivateError(h.interaction('modal', { deferred: true }), new Error('SECRET'));
  await respondPrivateError(h.interaction('button', { deferred: true }), new Error('SECRET'));
  await respondPrivateError(h.interaction('slash', { replied: true }), new Error('SECRET'));
  assert.ok(h.calls.replies.every(p => p.flags === MessageFlags.Ephemeral));
  assert.ok(h.calls.followups.every(p => p.flags === MessageFlags.Ephemeral));
  assert.ok([...h.calls.replies, ...h.calls.followups, ...h.calls.edits].every(p => !p.content.includes('SECRET')));
  h.state.editError = true;
  const warnings = []; const old = console.warn; console.warn = (...args) => warnings.push(args.join(' '));
  try { await respondPrivateError(h.interaction('slash', { deferred: true }), new Error('SECRET')); }
  finally { console.warn = old; }
  assert.equal(warnings.length, 1); assert.ok(!warnings[0].includes('SECRET'));
});

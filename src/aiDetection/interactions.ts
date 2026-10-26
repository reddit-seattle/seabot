import {
  ActionRowBuilder, ChatInputCommandBuilder, LabelBuilder, LinkButtonBuilder,
  ModalBuilder, SecondaryButtonBuilder, TextInputBuilder,
} from "@discordjs/builders";
import {
  MessageFlags, PermissionFlagsBits, TextInputStyle, ChannelType,
} from "discord.js";
import type {
  ButtonInteraction, ChatInputCommandInteraction, GuildMember, Interaction,
  ModalSubmitInteraction, GuildBasedChannel,
} from "discord.js";
import { respondPrivateError } from "../discord/privateErrors";
import { AiCheckService, PublishRejected, ReportSession, RequestContext } from "./AiCheckService";
import { readTextAttachment } from "./input";
import { reportFiles, segmentPages, summaryEmbed, segmentChart } from "./report";
import { AiCheckError, Fetch, LIMITS } from "./types";

export interface AccessConfig { guildId: string; channelId: string; roleId: string }
type InputInteraction = ChatInputCommandInteraction | ModalSubmitInteraction;

export function authorized(access: AccessConfig, guildId: string | null, channelId: string,
  parentId: string | null | undefined, roles: string[]): boolean {
  return guildId === access.guildId && (channelId === access.channelId || parentId === access.channelId || roles.includes(access.roleId));
}

function roleIds(member: ChatInputCommandInteraction["member"]): string[] {
  if (!member) return [];
  return Array.isArray(member.roles) ? member.roles : [...member.roles.cache.keys()];
}

export function aiCheckBuilder(): ChatInputCommandBuilder {
  return new ChatInputCommandBuilder().setName("ai-check")
    .setDescription("Check Reddit text for AI-generated content with a private report")
    .addAttachmentOptions([o => o.setName("file").setDescription("Optional UTF-8 .txt file, 50–5,000 words, up to 256 KiB")]);
}

export class AiCheckInteractions {
  constructor(
    private readonly service: AiCheckService,
    private readonly access: AccessConfig,
    private readonly fetcher: Fetch = globalThis.fetch,
    private readonly chart: typeof segmentChart = segmentChart,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      this.check(interaction);
      const attachment = interaction.options.getAttachment("file");
      if (attachment) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await this.currentAccess(interaction);
        const session = this.service.create(this.context(interaction), interaction.id);
        await this.analyze(interaction, session, signal => readTextAttachment(attachment, signal, this.fetcher));
      } else {
        const session = this.service.create(this.context(interaction), interaction.id);
        const modal = new ModalBuilder().setCustomId(`ai-check:input:${session.id}`).setTitle("Check Reddit text for AI")
          .addLabelComponents(new LabelBuilder().setLabel(`Text to send to ${this.service.providerName}`)
            .setDescription(`${this.service.minimumWords}+ words. Your report is private until you choose to post it.`)
            .setTextInputComponent(new TextInputBuilder().setCustomId("text").setStyle(TextInputStyle.Paragraph)
              .setRequired(true).setMaxLength(LIMITS.modalCharacters)));
        await interaction.showModal(modal);
      }
    } catch (error) { await respondPrivateError(interaction, error); }
  }

  async handle(interaction: Interaction): Promise<void> {
    if ((!interaction.isModalSubmit() && !interaction.isButton()) || !interaction.customId.startsWith("ai-check:")) return;
    try {
      // Acknowledge before fetching current access or rendering images.
      if (interaction.isModalSubmit()) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      else await interaction.deferUpdate();
      const match = /^ai-check:(input|summary|page|share):([a-f0-9]{24})(?::(\d+))?$/.exec(interaction.customId);
      if (!match) throw new AiCheckError("control", "This report control is invalid.");
      const [, action, id, page] = match;
      this.check(interaction);
      const session = this.service.get(id, this.context(interaction));
      if (interaction.isModalSubmit()) {
        if (action !== "input") throw new AiCheckError("control", "This input form is invalid.");
        await this.currentAccess(interaction);
        await this.analyze(interaction, session, async () => interaction.components.getTextInputValue("text"));
        return;
      }
      if (session.phase !== "ready" || session.messageId !== interaction.message.id || action === "input") {
        throw new AiCheckError("control", "This report control is no longer available.");
      }
      const { channel, member } = await this.currentAccess(interaction);
      this.service.get(id, this.context(interaction));
      if (action === "share") {
        await this.share(interaction, session, channel, member);
      } else {
        const pages = segmentPages(session.result!);
        const index = action === "summary" ? -1 : Number(page);
        if (!Number.isSafeInteger(index) || index < -1 || index >= pages.length) throw new AiCheckError("page", "This segment page is invalid.");
        await interaction.editReply(this.view(session, index));
      }
    } catch (error) { await respondPrivateError(interaction, error); }
  }

  private check(interaction: ChatInputCommandInteraction | ModalSubmitInteraction | ButtonInteraction): void {
    const channel = interaction.channel;
    const parent = channel?.isThread() ? channel.parentId : undefined;
    if (!authorized(this.access, interaction.guildId, interaction.channelId!, parent, roleIds(interaction.member))) {
      throw new AiCheckError("access", "Use this command in #subreddit-chat or its threads, or with the Subreddit Mod role in this server.");
    }
  }

  private context(interaction: ChatInputCommandInteraction | ModalSubmitInteraction | ButtonInteraction): RequestContext {
    if (!interaction.guildId || !interaction.channelId) throw new AiCheckError("guild", "This command is available only in the configured server.");
    return { userId: interaction.user.id, guildId: interaction.guildId, channelId: interaction.channelId };
  }

  private async currentAccess(interaction: InputInteraction | ButtonInteraction) {
    if (!interaction.guild || interaction.guildId !== this.access.guildId) throw new AiCheckError("access", "This server is not configured for AI detection.");
    const [member, channel] = await Promise.all([
      interaction.guild.members.fetch({ user: interaction.user.id, force: true }),
      interaction.guild.channels.fetch(interaction.channelId!, { force: true }),
    ]);
    if (!channel || !authorized(this.access, interaction.guildId, channel.id,
      channel.isThread() ? channel.parentId : undefined, [...member.roles.cache.keys()]) ||
      !channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)) {
      throw new AiCheckError("access", "You no longer have access to use this report in this channel.");
    }
    if (channel.type === ChannelType.PrivateThread && !channel.permissionsFor(member)?.has(PermissionFlagsBits.ManageThreads)) {
      const membership = await channel.members.fetch(member.id).catch(() => null);
      if (!membership) throw new AiCheckError("access", "You are no longer a member of this private thread.");
    }
    return { member, channel };
  }

  private async analyze(interaction: InputInteraction, session: ReportSession, loadText: (signal: AbortSignal) => Promise<string>) {
    await this.service.analyze(session, loadText, interaction.createdTimestamp);
    const files = reportFiles(session, this.chart);
    // Chart availability is part of the session rather than a separate unbounded cache.
    session.hasChart = files.some(f => f.name === "ai-segments.png");
    const payload = this.view(session);
    const message = await interaction.editReply({ ...payload, files });
    session.messageId = message.id;
  }

  private view(session: ReportSession, page = -1) {
    const pages = segmentPages(session.result!);
    const button = (action: string, label: string, disabled = false) =>
      new SecondaryButtonBuilder().setCustomId(`ai-check:${action}:${session.id}`).setLabel(label).setDisabled(disabled);
    const row = new ActionRowBuilder();
    if (page < 0) {
      row.addComponents(new SecondaryButtonBuilder().setCustomId(`ai-check:page:${session.id}:0`).setLabel("View segments"));
    } else {
      row.addComponents(button("summary", "Summary"));
      for (const [index, label, disabled] of [[Math.max(0, page - 1), "Previous", page === 0], [Math.min(pages.length - 1, page + 1), "Next", page === pages.length - 1]] as const) {
        row.addComponents(new SecondaryButtonBuilder().setCustomId(`ai-check:page:${session.id}:${index}`).setLabel(label).setDisabled(disabled));
      }
    }
    row.addComponents(button("share", session.share === "published" ? "Posted" : session.share === "unknown" ? "Post unconfirmed" : "Post report to channel", session.share !== "available"));
    const billing = session.result!.billingUrl;
    if (billing?.startsWith("https://")) row.addComponents(new LinkButtonBuilder().setLabel("API billing").setURL(billing));
    const summary = summaryEmbed(session);
    if (session.hasChart) Object.assign(summary, { image: { url: "attachment://ai-segments.png" } });
    return {
      content: `Sharing posts the summary, chart, and complete text report to <#${session.channelId}>.${session.publicMessage ? ` Posted: ${session.publicMessage.url}` : ""}`,
      embeds: page < 0 ? [summary] : [{ title: `Segments · page ${page + 1}/${pages.length}`, description: pages[page] }],
      components: [row], allowedMentions: { parse: [] as never[] },
    };
  }

  private async share(interaction: ButtonInteraction, session: ReportSession, channel: GuildBasedChannel, member: GuildMember) {
    const sendPermission = channel.isThread() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages;
    const me = await interaction.guild!.members.fetchMe();
    if (!channel.isSendable() || !channel.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel, sendPermission]) ||
        !channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, sendPermission, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles]) ||
        (channel.isThread() && (channel.archived || channel.locked))) throw new PublishRejected();
    try {
      await this.service.publish(session, async () => {
        try {
          const files = reportFiles(session, this.chart);
          const embed = summaryEmbed({ ...session, hasChart: files.some(f => f.name === "ai-segments.png") }, true);
          if (files.some(f => f.name === "ai-segments.png")) Object.assign(embed, { image: { url: "attachment://ai-segments.png" } });
          const message = await channel.send({ content: `AI-content report requested by <@${session.userId}>`, embeds: [embed], files,
            allowedMentions: { parse: [] }, nonce: session.id, enforceNonce: true });
          return { id: message.id, url: message.url };
        } catch (error) {
          const status = (error as { status?: number })?.status;
          if (typeof status === "number" && status >= 400 && status < 500 && status !== 408) throw new PublishRejected();
          throw new Error("Unconfirmed Discord publish");
        }
      });
    } finally {
      // A failed acknowledgement must never escape into a second publish attempt.
      await interaction.editReply(this.view(session)).catch(() => undefined);
    }
  }
}

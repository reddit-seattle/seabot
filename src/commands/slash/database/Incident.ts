import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";

import { configuration } from "../../../server";
import { Database } from "../../../utils/constants";
import { DatabaseCommand } from "./DatabaseCommand";
import { Incident as IncidentModel } from "../../../models/DBModels";
import { millisecondsToDays } from "../../../utils/Time/conversion";

export default new DatabaseCommand<IncidentModel>(
  Database.Containers.INCIDENTS,
  {
    name: "incident",
    description: "How many days since our last incident?",
    help: "incident",
    builder: new SlashCommandBuilder()
      .addSubcommand((cmd) =>
        cmd.setName("last").setDescription("days since last `incident`")
      )
      .addSubcommand((cmd) =>
        cmd
          .setName("new")
          .setDescription("indicates that a new incident has occurred")
          .addStringOption((option) =>
            option
              .setName("link")
              .setDescription("message link to start of incident")
          )
          .addStringOption((option) =>
            option.setName("note").setDescription("what went down")
          )
      ),
    execute: handler,
  }
);

enum SubCommands {
  LAST = "last",
  NEW = "new",
}

async function handler(
  this: DatabaseCommand<IncidentModel>,
  interaction: ChatInputCommandInteraction
) {
  const cmd = interaction.options.getSubcommand(true);
  if (cmd === SubCommands.LAST) {
    //not a private response
    await interaction.deferReply({ ephemeral: false });
    // find the last incident
    const incident = await this.connector.getLastItem();
    if (!incident) {
      // uh, we got a problem
      interaction.followUp({
        content: "No incidents yet. Hmm...",
        ephemeral: true,
      });
      return;
    }
    const daysSince = millisecondsToDays(
      Date.now() - new Date(incident?.occurrence).getTime()
    );
    // tell everyone
    interaction.followUp({
      content: `It has been ${Math.round(daysSince)} day${
        daysSince === 1 ? "" : "s"
      } since the last incident.\n***${
        incident.note ?? "No note provided for this incident."
      }***${incident.link ? `\n${incident.link}` : ``}`,
      ephemeral: false,
    });
  } else if (cmd === SubCommands.NEW) {
    // private response
    await interaction.deferReply({ ephemeral: true });

    // mod only
    const { member } = interaction;
    if (
      (member?.roles as GuildMemberRoleManager).cache.has(
        configuration.roleIds.moderator
      )
    ) {
      //create a new incident
      const incident: IncidentModel = {
        occurrence: new Date(),
        note: interaction.options.getString("note") ?? undefined,
        link: interaction.options.getString("link") ?? undefined,
      };
      // db transaction
      const result = await this.connector.addItem(incident);
      if (result) {
        //make a statement confirming db transaction
        interaction.followUp(
          `Created incident id ${result.id}: ${result.note} at ${result.occurrence}`
        );
        //let everyone know we've reset to 0
        interaction.guild?.systemChannel?.send(
          `Congratulations! It has now been \`0\` days since our last incident!\n***${
            result.note ?? "No note provided for this incident."
          }***${result.link ? `\n${result.link}` : ``}`
        );
      } else {
        // db transaction failed
        interaction.followUp("Error creating incident record");
      }
    } else {
      // non-mod tried to add a new incident
      interaction.followUp("You cannot perform this action. Ping a mod");
    }
  } else {
    // idk somehow you used the command without a subcommand
    interaction.followUp("Subcommand required. RTFM");
  }
}

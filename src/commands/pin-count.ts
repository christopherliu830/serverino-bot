import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  userMention
} from "discord.js";
import { PinnedMessage } from "../models/pinned-message";

export const data = new SlashCommandBuilder()
  .setName("pin-count")
  .setDescription("Get the pin count")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to filter by. Leave blank for all users.")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser("user");
  if (user) {
    const count = await PinnedMessage.countDocuments({ authorId: user.id });
    await interaction.reply({
      allowedMentions: { repliedUser: false },
      content: `${userMention(user.id)} has **${count}** pins.`
    });
  } else {
    const counts = await PinnedMessage.aggregate().sortByCount("$authorId");

    await interaction.reply({
      allowedMentions: { repliedUser: false },
      content: counts
        .map(({ _id: authorId, count }) => `${userMention(authorId)}: ${count}`)
        .join("\n")
    });
  }
}

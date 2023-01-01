import {
  ActionRowBuilder,
  APIEmbed,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildBasedChannel,
  messageLink,
  SlashCommandBuilder,
  User,
  DiscordjsError,
  DiscordjsErrorCodes
} from "discord.js";
import { FilterQuery } from "mongoose";
import { PinnedMessage, PinnedMessageType } from "../models/pinned-message";

type PinnedMessageResponsePage = {
  content: string;
  embeds: APIEmbed[];
  components: ActionRowBuilder<ButtonBuilder>[];
};

export const data = new SlashCommandBuilder()
  .setName("pins")
  .setDescription("Get pins.")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user's pinned messages.")
      .setRequired(false)
  )
  .addNumberOption((option) =>
    option.setName("page").setDescription("The page number.").setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const user = interaction.options.getUser("user");
  const page = (interaction.options.getNumber("page") || 1) - 1;

  await interaction.deferReply();

  const pins = await getPins(0, user);

  const cache: Record<number, PinnedMessageResponsePage> = {};

  const content = `**Page ${page + 1}**`;
  const embeds = await buildEmbeds(pins, interaction);
  const components = buildActions(page);

  cache[0] = { content, embeds, components };

  await interaction.editReply(cache[0]);

  // Recursive function to change pages
  // Loop is broken out of once an error is thrown (timeout)
  async function getFollowups(oldPage: number) {
    const followup = await interaction.channel?.awaitMessageComponent({
      time: 5000
    });

    if (followup?.isButton()) {
      await followup.deferUpdate();
      await followup.editReply({ content: "Loading...", components: [] });

      const page = parseInt(followup.customId) || 0;

      let content, embeds, components;
      if (cache[page]) {
        content = cache[page].content;
        embeds = cache[page].embeds;
        components = cache[page].components;
      } else {
        try {
          const pins = await getPins(parseInt(followup.customId), user);
          embeds = await buildEmbeds(pins, interaction);
          components = buildActions(page);
          content = `**Page ${page + 1}**`;
          cache[page] = { content, embeds, components };
        } catch (error) {
          // Try again
          await followup.editReply(cache[oldPage]);
          await getFollowups(oldPage);
        }
      }
      await followup.editReply(cache[page]);
    }

    await getFollowups(page);
  }

  try {
    await getFollowups(page);
  } catch (error) {
    // No interactions received within timeout
    if (
      error instanceof DiscordjsError &&
      error.code === DiscordjsErrorCodes.InteractionCollectorError
    ) {
      return;
    } else {
      console.log(error);
    }
  }
}

async function getPins(skip: number, user?: User | null) {
  const options: FilterQuery<PinnedMessageType> = {};
  if (user) {
    options.authorId = user.id;
  }

  const pins = (
    await PinnedMessage.find(options)
      .sort({ timestamp: "desc" })
      .skip(skip * 5)
      .limit(5)
  ).reverse();

  if (pins.length === 0) {
    throw new Error("0 pins");
  }

  return pins;
}

async function buildEmbeds(
  pins: PinnedMessageType[],
  interaction: ChatInputCommandInteraction
) {
  const channels = {};

  return (
    (await Promise.all(pins.map(buildEmbed(interaction, channels))))
      // Needs type guard function for typescript to not complain
      // Equivalent to `.filter(e => e !== undefined)
      .filter(function notNull(embed): embed is EmbedBuilder {
        return embed !== undefined;
      })
      .map((embed) => embed.toJSON())
  );
}

function buildEmbed(
  interaction: ChatInputCommandInteraction,
  channels: Record<string, GuildBasedChannel>
) {
  return async (pin: PinnedMessageType) => {
    // Cache reused channels
    const channel =
      channels[pin.channelId] ||
      (await interaction.guild?.channels.fetch(pin.channelId));
    channels[pin.channelId] = channel;

    if (channel != null && channel.isTextBased()) {
      const message = await channel.messages.fetch(pin.messageId);
      const link = messageLink(channel.id, message.id);

      return new EmbedBuilder()
        .setAuthor({
          name: message.author.username,
          iconURL: message.author.avatarURL() ?? undefined,
          url: link
        })
        .setDescription(message.content)
        .setTimestamp(message.createdTimestamp);
    }
  };
}

function buildActions(page: number) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${Math.max(0, page - 1)}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("⬅️"),

      new ButtonBuilder()
        .setCustomId(`${page + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("➡️")
    )
  ];
}

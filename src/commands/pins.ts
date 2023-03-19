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

  const content = `**Page ${page + 1}**`;
  const embeds = await buildEmbeds(pins, interaction);
  const components = buildActions(page);

  setCachedPage(user, page, { content, embeds, components});

  await interaction.editReply(getCachedPage(user, 0));

  // Recursive function to change pages
  // interaction.channel.awaitMessageComponent will throw after the timeout
  // which will break out of the async recursive loop.
  async function getFollowups(oldPage: number) {
    let followup;
    try { 
      followup = await interaction.channel?.awaitMessageComponent();
    } catch (error) {
      // If the interaction times out, remove the interactive components
      // and exit the loop.
      await interaction.editReply({ ...getCachedPage(user, oldPage), components: [] });
      return;
    }

    if (followup?.isButton() && followup.message.interaction?.id === interaction.id) {
      await followup.deferUpdate();
      await followup.editReply({ content: "Loading...", components: [] });

      const pageNumber = parseInt(followup.customId) || 0;
      const page = getCachedPage(user, pageNumber);

      if (!page) {
        try {
          const pins = await getPins(parseInt(followup.customId), user);
          setCachedPage(user, pageNumber, {
            embeds:  await buildEmbeds(pins, interaction),
            components:  buildActions(pageNumber),
            content: `**Page ${pageNumber + 1}**`,
          });
        } catch (error) {
          // Show the old page as a fallback.
          await followup.editReply(getCachedPage(user, oldPage));
          await getFollowups(oldPage);
        }
      }

      await followup.editReply(getCachedPage(user, pageNumber));
    }

    await getFollowups(page);
  }

  await getFollowups(page);
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

const cache: Record<string, PinnedMessageResponsePage> = {};

function getCachedPage(user: User | null, page: number) {
  return cache[`${user}${page}`];
}

function setCachedPage(user: User | null, pageNumber: number, page: PinnedMessageResponsePage) {
  cache[`${user}${pageNumber}`] = page;
}
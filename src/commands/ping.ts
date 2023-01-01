import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('am I working? :)')

export async function execute (interaction: ChatInputCommandInteraction) {
  interaction.reply('pong')
}

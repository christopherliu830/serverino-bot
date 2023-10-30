import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('thanks')
  .setDescription('thanks bot')

export async function execute (interaction: ChatInputCommandInteraction) {
  interaction.reply('np bro')
}

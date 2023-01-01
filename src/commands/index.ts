import {
  ChatInputCommandInteraction,
  Client,
  Events,
  SlashCommandBuilder
} from 'discord.js'

import * as fs from 'fs'
import path from 'path'

interface Command {
  execute: (interaction: ChatInputCommandInteraction) => {}
  data: SlashCommandBuilder
}

const filename = path.parse(__filename).base
const commandFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file != filename && file.endsWith('.js')) // Emitted files get '.js'

export async function subscribe (client: Client) {
  const modules: Command[] = await Promise.all(
    commandFiles.map(async (commandFile) => {
      const fullPath = path.join(__dirname, commandFile)
      const module = await import(fullPath)
      return module as Command
    })
  )

  const commands = Object.fromEntries(
    modules.map((mod) => [mod.data.name, mod])
  )

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return
    const command = commands[interaction.commandName]

    try {
      await command.execute(interaction)
    } catch (error) {
      console.log(error)
      const options = {
        content: 'Oops! I messed up..',
        ephemeral: true
      }
      interaction.deferred ? interaction.editReply(options) : interaction.reply(options)
    }
  })
}

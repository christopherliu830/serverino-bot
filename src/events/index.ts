import { Client } from 'discord.js'

import * as fs from 'fs'
import path from 'path'

const filename = path.parse(__filename).base

const commandFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file != filename && file.endsWith('.js')) // Emitted files get '.js'

export async function subscribe (client: Client) {
  for (const commandFile of commandFiles) {
    const fullPath = path.join(__dirname, commandFile)
    const module = await import(fullPath)
    module.default(client)
  }
}

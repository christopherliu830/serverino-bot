import { Client, Events, Message } from 'discord.js'

const emoteRegex = /^<.*:\w*:[0-9]*>$/
const channel = '989413654040567858'

export default function subscribe (client: Client) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.channelId !== channel) {
      return
    }

    if (!emoteRegex.test(message.content)) {
      await message.delete()
    }
  })
}

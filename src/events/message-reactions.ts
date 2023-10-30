import {
  Channel,
  Client,
  Events,
  MessageReaction,
  PartialMessageReaction
} from 'discord.js'
import { url } from 'inspector'
import { PinnedMessage } from '../models/pinned-message'

async function sendMessage(channel: Channel, message: string) {
  if (channel.isTextBased()) {
    await channel.send(message)
  }
}

export default function subscribe (client: Client) {
  client.on(
    Events.MessageReactionAdd,
    async (reaction: MessageReaction | PartialMessageReaction, _) => {
      if (reaction.emoji.toString() === '📌') {
        if (reaction.partial) {
          await reaction.fetch()
        }

        const { id, channel, createdTimestamp } = reaction.message
        const author = reaction.message.author

        await PinnedMessage.findOneAndUpdate(
          {
            messageId: id,
            authorId: author?.id,
            channelId: channel.id,
            timestamp: createdTimestamp
          },
          {},
          { upsert: true }
        )
      }

      else if (reaction.emoji.toString() === '🩹') {
        if (reaction.partial) {
          await reaction.fetch()
        }

        const filters = [
          [/^https:\/\/(www.)?instagram.com.*/, 'instagram', 'dd'],
          [/^https:\/\/(www.)?x.com.*/, 'x', 'fixup'],
          [/^https:\/\/(www.)?twitter.com.*/, 'twitter', 'fx'],
        ]

        for(const [regex, spliceSearch, splice] of filters) {
          const message = reaction.message
          if (message.content?.match(regex)) {
            const p = message.content.indexOf(spliceSearch as string)
            const fixed = [message.content.slice(0, p), splice, message.content.slice(p)].join('')
            sendMessage(message.channel, fixed)
            break
          }
        }
      }
    }
  )

  client.on(
    Events.MessageReactionRemove,
    async (reaction: MessageReaction | PartialMessageReaction, _) => {
      if (reaction.emoji.toString() === '📌') {
        await PinnedMessage.findOneAndDelete({
          messageId: reaction.message.id
        })
      }
    }
  )
}

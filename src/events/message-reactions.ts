import {
  Client,
  Events,
  MessageReaction,
  PartialMessageReaction
} from 'discord.js'
import { PinnedMessage } from '../models/pinned-message'

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

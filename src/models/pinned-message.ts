import { Schema, model } from 'mongoose'

export interface PinnedMessageType {
  messageId: string
  authorId: string
  channelId: string
  timestamp: Date
}

const pinnedMessageSchema = new Schema<PinnedMessageType>({
  messageId: String,
  authorId: String,
  channelId: String,
  timestamp: Date
})

export const PinnedMessage = model<PinnedMessageType>(
  'PinnedMessage',
  pinnedMessageSchema
)

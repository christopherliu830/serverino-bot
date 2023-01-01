import { Client, GatewayIntentBits, Partials } from "discord.js";

import * as mongoose from "mongoose";
import * as dotenv from "dotenv";

import * as events from "./events";
import * as commands from "./commands";

dotenv.config();
const { DISCORD_TOKEN, MONGODB_URL } = process.env;

run();

async function run() {
  if (MONGODB_URL) {
    await mongoose.connect(MONGODB_URL);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
  });

  client.login(DISCORD_TOKEN);

  events.subscribe(client);
  commands.subscribe(client);
}

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import config from "../config.json";
import { REST, Routes } from "discord.js";

dotenv.config();

const { DISCORD_TOKEN: token } = process.env;
const { clientId, guildId } = config;

const commandFiles = fs
  .readdirSync(path.join(__dirname, "../commands"))
  .filter(
    (file) => file.endsWith(".js") && path.parse(file).base !== "index.js"
  );

const commands = [];

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(token || "");

// and deploy your commands!
(async () => {
  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const command = await import(`../commands/${file}`);
    commands.push(command.data.toJSON());
  }
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(`Successfully reloaded ${1} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();

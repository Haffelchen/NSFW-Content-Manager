const fs = require('node:fs');
const path = require('node:path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const client = require('./NSFW-Content-Manager').client;
const logger = require('./logger');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));


let deployCommands = function () {
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

    rest.put(Routes.applicationGuildCommands(client.user.id, "995083613521580194"), { body: commands })
        .then(() => logger.log.info('Successfully registered application commands.'))
        .catch(logger.log.error);
}

exports.deployCommands = deployCommands;
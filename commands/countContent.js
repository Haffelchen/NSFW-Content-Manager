const { SlashCommandBuilder } = require('@discordjs/builders');
const posting = require('../AutoPost');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('count-content')
        .setDescription('Counts how many content is sorted'),
    async execute(interaction) {
        await posting.countFilesAllContentFolders(interaction.channel.id);
        await interaction.reply("Counting done, daddy.");
    },
};
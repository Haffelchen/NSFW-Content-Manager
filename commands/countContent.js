const { SlashCommandBuilder } = require('@discordjs/builders');
const posting = require('../AutoPost');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('count-content')
        .setDescription('Counts how many content is sorted'),
    async execute(interaction) {
        await interaction.reply("I count those nudes for you daddy");
        await posting.countFilesAllContentFolders(interaction.channel.id);
    },
};
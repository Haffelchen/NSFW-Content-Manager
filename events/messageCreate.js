const logger = require('../logger');
const client = require('../NSFW-Content-Manager').client;
const { MessageEmbed } = require('discord.js');
const gsheet = require('../GSheet.js');

module.exports = {
    name: 'messageCreate_TODO',
    async execute(message) {
        if (message.author.id !== client.user.id) {
            const nsfw_channels = process.env.REQUEST_CHATS.split(";");

            if (nsfw_channels.includes(message.channelId)) {
                const keywords = process.env.SOURCE_KEYWORDS.split(";");

                if (keywords.some(keyword => message.content.includes(keyword))) {
                    if (message.reference !== null) {
                        let reference = await message.channel.messages.fetch(message.reference.messageId);

                        if (reference.attachments.size > 0) {
                            const userEmbed = new MessageEmbed()
                                .setColor('#0099ff')
                                .setTitle('Source Request')
                                .setDescription('<@' + message.author.id + '> requested source for ' + reference.url)
                                .setTimestamp();

                            //Emoji in discord mit \ davor eingeben, dann die pure Variante kopieren und in Code einfügen, darauf achten dass die '' neu gesetzt werden um allfällige versteckte zeichen zu entfernen
                            
                            let msgConfirmation;
                            
                            let confirmationMessage = await message.channel.send({ embeds: [userEmbed] }).then(async message => {
                                msgConfirmation = message;
                                await message.react('💤')
                                    .catch(logger.log.error);
                                await message.react('🚫')
                                    .catch(logger.log.error);

                            });

                            const adminEmbed = new MessageEmbed()
                                .setColor('#0099ff')
                                .setTitle('Source Request')
                                .addFields(
                                    { name: 'User', value: '<@' + message.author.id + '>', inline: true },
                                    { name: '\u200B', value: '\u200B' },
                                    { name: 'Channel', value: '<#' + message.channel.id + '>', inline: true },
                                    { name: 'Request Message', value: message.url, inline: true },
                                    { name: '\u200B', value: '\u200B' },
                                    { name: 'Content Message', value: reference.url, inline: true },
                                    { name: 'Content URL', value: reference.attachments.first().url, inline: true },
                                )
                                .setTimestamp();

                            await message.guild.channels.cache.get(process.env.ADMIN_CHAT).send({ embeds: [adminEmbed] }).then(async message => {
                                await message.react('💤')
                                    .catch(logger.log.error);
                                await message.react('🕛')
                                    .catch(logger.log.error);
                                await message.react('❓')
                                    .catch(logger.log.error);
                                await message.react('✅')
                                    .catch(logger.log.error);
                                await message.react('❌')
                                    .catch(logger.log.error);
                            });;
                            
                            gsheet.addSourceRequest(message, msgConfirmation, reference);
                        }
                    }
                }
            }
        }
    },
};
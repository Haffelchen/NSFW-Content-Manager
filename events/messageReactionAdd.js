const logger = require("../logger");
const client = require('../NSFW-Content-Manager').client;

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                logger.log.error('Something went wrong when fetching the message:', error);
                return;
            }
        }
        
        if (user.id === "285514708486979585") {
            if (reaction.emoji.name === '❌') {
                if (reaction.message.author.id === client.user.id) {
                    reaction.message.delete()
                        .then(msg => logger.log.info(`${user.id} deleted message ${msg.id}`))
                        .catch(logger.log.error);
                }
            }
        }
    }
}
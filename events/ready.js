const logger = require('../logger');
const gsheets = require('../GSheet');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        logger.log.info(`Logged in as ${client.user.tag}!`);

        gsheets.authorizeClient();
    },
};
const fs = require('fs');
const { MessageEmbed } = require('discord.js');
const client = require('./NSFW-Content-Manager').client
const logger = require('./logger');
const util = require('util');
const mv = require('mv');
const mvPromise = util.promisify(mv);

let continuePosting = true;
let waitUntilPost;

let startAutoPosting = async function () {
    continuePosting = true;

    waitUntilPost = setTimeout(post, calculateNextTime());
}

function calculateNextTime() {
    const postAtH = parseInt(process.env.POST_TIME.split(":")[0]);
    const postAtM = parseInt(process.env.POST_TIME.split(":")[1]);

    const now = new Date();
    const postAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), postAtH, postAtM, 0, 0);
    let waitFor = postAt - now;
    
    while (waitFor < 0) {
        waitFor += parseInt(process.env.POST_INTERVAL_MILLIS);
    }

    return waitFor;
}

async function post() {
    logger.log.info("Posting started...");
    
    const postsPerChat = parseInt(process.env.POSTS_PER_CHAT);
    const chatsAndPaths = process.env.CONTENT_CHATS.split(";");
    const postedFolder = process.env.POSTED_FOLDER;
    const failedFolder = process.env.FAILED_FOLDER;
    const contentFolder = process.env.CONTENT_FOLDER;

    for (let i = 0; i < chatsAndPaths.length; i++) {
        let chat = chatsAndPaths[i];

        const contentChatIds = chat.split(",")[0].split("*");
        const contentPaths = chat.split(",")[1].split("*");

        let nextOne = false;
        let contentPosted = 0;

        while (!nextOne && contentPosted < postsPerChat * contentChatIds.length) {
            if (contentPaths.length > 0) {
                const pathIndex = Math.floor(Math.random() * contentPaths.length);
                let contentPath = contentPaths[pathIndex];
                contentPath = contentPath + contentFolder;
                const postedPath = contentPath + postedFolder;
                const failedPath = contentPath + failedFolder;
                const dirents = fs.readdirSync(contentPath, { withFileTypes: true });
                const allFiles = dirents
                    .filter(dirent => dirent.isFile())
                    .map(dirent => dirent.name);

                await fs.promises.mkdir(postedPath).catch(err => {
                    if (err.code !== 'EEXIST') {
                        logger.log.error(err);
                    }
                });
                
                for (let j = 0; j < allFiles.length; j++) {
                    if (contentPosted < postsPerChat * contentChatIds.length) {
                        let file = allFiles[j];
                        let fileSuccess = true;
                        let errorCode;
                        
                        for (let k = 0; k < contentChatIds.length; k++) {
                            const contentChatId = contentChatIds[k];
                            
                            let contentChannel = await client.channels.fetch(contentChatId);
                            await contentChannel.send({
                                files: [{
                                    attachment: contentPath + "/" + file,
                                    name: file
                                }]
                            }).then(contentPosted++).catch(err => { logger.log.error(err); contentPosted--; fileSuccess = false; errorCode = err.message; });
                        }
                        
                        if (fileSuccess) {
                            await mvPromise(contentPath + "/" + file, postedPath + "/" + file).catch(logger.log.error);
                        } else {
                            await fs.promises.mkdir(failedPath + "/" + errorCode).catch(err => {
                                if (err.code !== 'EEXIST') {
                                    logger.log.error(err);
                                }
                            });
                            
                            await mvPromise(contentPath + "/" + file, failedPath + "/" + errorCode + "/" + file).catch(logger.log.error);
                        }
                    } else {
                        nextOne = true;
                    }
                }
                
                const allFilesAfterPost = fs.readdirSync(contentPath, { withFileTypes: true })
                    .filter(dirent => dirent.isFile())
                    .map(dirent => dirent.name);
                
                if (allFilesAfterPost.length == 0) {
                    let contentChannelNames = "";

                    for (let j = 0; j < contentChatIds.length; j++) {
                        const contentChannel = await client.channels.fetch(contentChatIds[j]);
                        contentChannelNames = contentChannelNames + ", " + contentChannel.name;
                    }

                    contentChannelNames = contentChannelNames.replace(', ', '');
                    
                    const embed = new MessageEmbed()
                        .setColor('#fc1303')
                        .setTitle('Content Alert')
                        .setDescription('A folder is empty')
                        .addFields(
                            { name: 'Path', value: contentPath, inline: true })
                        .addFields(
                            { name: 'Channel(s)', value: contentChannelNames, inline: true })
                        .setTimestamp();

                    const adminChannelIds = process.env.ADMIN_CHAT.split(";");
                    
                    for (let j = 0; j < adminChannelIds.length; j++) {
                        const adminChannel = await client.channels.fetch(adminChannelIds[j]);
                        
                        if (adminChannel !== null) {
                            await adminChannel.send({ embeds: [embed] }).catch(err => logger.log.error(err));
                            logger.log.info('Folder "' + contentPath + '" is empty');
                        }
                    }
                    
                    contentPaths.splice(pathIndex);

                } else if (allFilesAfterPost.length < postsPerChat * parseInt(process.env.MIN_POSTS_CONTAINING)) {
                    let contentChannelNames = "";

                    for (let j = 0; j < contentChatIds.length; j++) {
                        const contentChannel = await client.channels.fetch(contentChatIds[j]);
                        contentChannelNames = contentChannelNames + ", " + contentChannel.name;
                    }

                    contentChannelNames = contentChannelNames.replace(', ', '');
                    
                    const embed = new MessageEmbed()
                        .setColor('#fc8403')
                        .setTitle('Content Info')
                        .setDescription('A folder is going to be empty soon (' + allFilesAfterPost.length + ")")
                        .addFields(
                            { name: 'Path', value: contentPath, inline: true })
                        .addFields(
                            { name: 'Channel(s)', value: contentChannelNames, inline: true })
                        .setTimestamp();

                    const adminChannelIds = process.env.ADMIN_CHAT.split(";");

                    for (let j = 0; j < adminChannelIds.length; j++) {
                        const adminChannel = await client.channels.fetch(adminChannelIds[j]);
                        await adminChannel.send({ embeds: [embed] }).catch(err => logger.log.error(err));
                        logger.log.info('Folder "' + contentPath + '" is going to be empty soon');
                    }
                }
            } else {
                nextOne = true;
            }
        }
        
        if (contentPosted < postsPerChat * contentChatIds.length) {
            let contentChannelNames = "";

            for (let j = 0; j < contentChatIds.length; j++) {
                const contentChannel = await client.channels.fetch(contentChatIds[j]);
                contentChannelNames = contentChannelNames + ", " + contentChannel.name;
            }
            
            contentChannelNames = contentChannelNames.replace(', ', '');
            
            const embed = new MessageEmbed()
                .setColor('#8a1c00')
                .setTitle('Content urgent Alert')
                .setDescription('All folders for channel(s) are empty')
                .addFields(
                    { name: 'Channel(s)', value: contentChannelNames, inline: true })
                .setTimestamp();

            const adminChannelIds = process.env.ADMIN_CHAT.split(";");

            for (let j = 0; j < adminChannelIds.length; j++) {
                const adminChannel = await client.channels.fetch(adminChannelIds[j]);
                
                await adminChannel.send({ embeds: [embed] }).catch(err => logger.log.error(err));
                logger.log.info('All folders for channel(s) "' + contentChannelNames + '" are empty');
            }

        }
    }
    
    logger.log.info("Posting done");
    
    startAutoPosting();
}

async function countFilesAllContentFolders(responseChannelId) {
    const chatsAndPaths = process.env.CONTENT_CHATS.split(";");
    const postAmount = parseInt(process.env.POSTS_PER_CHAT);
    
    for (let i = 0; i < chatsAndPaths.length; i++) {
        let chat = chatsAndPaths[i];
        
        const contentChatIds = chat.split(",")[0].split("*");
        const contentPaths = chat.split(",")[1].split("*");
        
        for (let j = 0; j < contentPaths.length; j++) {
            let contentPath = contentPaths[j];

            const contentFolder = process.env.CONTENT_FOLDER;
            contentPath = contentPath + contentFolder;
            const dirents = fs.readdirSync(contentPath, { withFileTypes: true });
            const allFiles = dirents
                .filter(dirent => dirent.isFile())
                .map(dirent => dirent.name);
            
            if (allFiles.length == 0) {
                let contentChannelNames = "";

                for (let j = 0; j < contentChatIds.length; j++) {
                    const contentChannel = await client.channels.fetch(contentChatIds[j]);
                    contentChannelNames = contentChannelNames + ", " + contentChannel.name;
                }

                contentChannelNames = contentChannelNames.replace(', ', '');
                
                const embed = new MessageEmbed()
                    .setColor('#fc1303')
                    .setTitle('Content Alert')
                    .setDescription('A folder is empty')
                    .addFields(
                        { name: 'Path', value: contentPath, inline: true })
                    .addFields(
                        { name: 'Channel(s)', value: contentChannelNames, inline: false })
                    .setTimestamp();
                
                const channel = await client.channels.fetch(responseChannelId);
                await channel.send({ embeds: [embed] }).catch(err => logger.log.error(err));

            } else if (allFiles.length < postAmount * parseInt(process.env.MIN_POSTS_CONTAINING)) {
                let contentChannelNames = "";

                for (let j = 0; j < contentChatIds.length; j++) {
                    const contentChannel = await client.channels.fetch(contentChatIds[j]);
                    contentChannelNames = contentChannelNames + ", " + contentChannel.name;
                }

                contentChannelNames = contentChannelNames.replace(', ', '');
                
                const embed = new MessageEmbed()
                    .setColor('#fc8403')
                    .setTitle('Content Info')
                    .setDescription('A folder is going to be empty soon (' + allFiles.length + ")")
                    .addFields(
                        { name: 'Path', value: contentPath, inline: true })
                    .addFields(
                        { name: 'Channel(s)', value: contentChannelNames, inline: false })
                    .setTimestamp();

                const channel = await client.channels.fetch(responseChannelId);
                await channel.send({ embeds: [embed] }).catch(err => logger.log.error(err));
            } else {
                let contentChannelNames = "";

                for (let j = 0; j < contentChatIds.length; j++) {
                    const contentChannel = await client.channels.fetch(contentChatIds[j]);
                    contentChannelNames = contentChannelNames + ", " + contentChannel.name;
                }

                contentChannelNames = contentChannelNames.replace(', ', '');

                const embed = new MessageEmbed()
                    .setColor('#00de0f')
                    .setTitle('Content Info')
                    .setDescription('Currently enough content (' + allFiles.length + ")")
                    .addFields(
                        { name: 'Path', value: contentPath, inline: true })
                    .addFields(
                        { name: 'Channel(s)', value: contentChannelNames, inline: false })
                    .setTimestamp();

                const channel = await client.channels.fetch(responseChannelId);
                await channel.send({ embeds: [embed] }).catch(err => logger.log.error(err));
            }
        }
    }
}

exports.startAutoPosting = startAutoPosting;
exports.countFilesAllContentFolders = countFilesAllContentFolders;
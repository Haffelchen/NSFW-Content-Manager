const fs = require('fs');
const { MessageEmbed } = require('discord.js');
const client = require('./NSFW-Content-Manager').client
const logger = require('./logger');
const mv = require('mv');

let continuePosting = true;
let waitTillPost;

let startAutoPosting = async function () {
    continuePosting = true;

    waitTillPost = setTimeout(post, calculateNextTime());
}

function calculateNextTime() {
    let postAtH = parseInt(process.env.POST_TIME.split(":")[0]);
    let postAtM = parseInt(process.env.POST_TIME.split(":")[1]);

    let now = new Date();
    let postAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), postAtH, postAtM, 0, 0);
    let waitFor = postAt - now;
    while (waitFor < 0) {
        waitFor += parseInt(process.env.POST_INTERVAL_MILLIS);
    }

    return waitFor;
}

async function post() {
    logger.log.info("Posting started...");
    const postAmount = parseInt(process.env.POSTS_PER_CHAT);
    const chatsAndPaths = process.env.CONTENT_CHATS.split(";");
    const moveToAfterPost = process.env.POSTED_PATH;
    const moveToAfterFail = process.env.FAILED_PATH;
    const contentToPostPath = process.env.CONTENT_PATH;

    for (let i = 0; i < chatsAndPaths.length; i++) {
        let chat = chatsAndPaths[i];

        const chatIds = chat.split(",")[0].split("*");
        const contentPaths = chat.split(",")[1].split("*");

        let nextOne = false;
        let posted = 0;

        while (!nextOne && posted < postAmount * chatIds.length) {
            if (contentPaths.length > 0) {
                const pathIndex = Math.floor(Math.random() * contentPaths.length);
                let contentPath = contentPaths[pathIndex];
                const postedPath = contentPath + moveToAfterPost;
                const failedPath = contentPath + moveToAfterFail;
                contentPath = contentPath + contentToPostPath;
                const dirents = fs.readdirSync(contentPath, { withFileTypes: true });
                const allFiles = dirents
                    .filter(dirent => dirent.isFile())
                    .map(dirent => dirent.name);

                fs.mkdir(postedPath, function (err) {
                    if (err) {
                        if (err.code !== 'EEXIST') {
                            logger.log.error(err);
                        }
                    }
                });
                
                for (let j = 0; j < allFiles.length; j++) {
                    let file = allFiles[j];
                    let fileSuccess = true;
                    let errorCode;

                    if (posted < postAmount * chatIds.length) {
                        for (let k = 0; k < chatIds.length; k++) {
                            const chatId = chatIds[k];
                            
                            let channel = await client.channels.fetch(chatId);
                            await channel.send({
                                files: [{
                                    attachment: contentPath + "/" + file,
                                    name: file
                                }]
                            }).then(posted++).catch(err => { logger.log.error(err); posted--; fileSuccess = false; errorCode = err.message; });
                        }
                        
                        if (fileSuccess) {
                            mv(contentPath + "/" + file, postedPath + "/" + file, function (err) {
                                if (err) {
                                    logger.log.error(err);
                                }
                            });
                        } else {
                            fs.mkdir(failedPath + "/" + errorCode, function (err) {
                                if (err) {
                                    if (err.code !== 'EEXIST') {
                                        logger.log.error(err);
                                    }
                                }
                            });
                            
                            mv(contentPath + "/" + file, failedPath + "/" + errorCode + "/" + file, function (err) {
                                if (err) {
                                    logger.log.error(err);
                                }
                            });
                        }
                        
                    } else {
                        nextOne = true;
                    }
                }
                
                const allFilesAfter = dirents
                    .filter(dirent => dirent.isFile())
                    .map(dirent => dirent.name);
                
                if (allFilesAfter.length == 0) {
                    const embed = new MessageEmbed()
                        .setColor('#fc1303')
                        .setTitle('Content Alert')
                        .setDescription('A folder is empty')
                        .addFields(
                            { name: 'Path', value: contentPath, inline: true })
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

                } else if (allFilesAfter.length < postAmount * parseInt(process.env.MIN_POSTS_CONTAINING) && allFilesAfter.length == 0) {
                    const embed = new MessageEmbed()
                        .setColor('#fc8403')
                        .setTitle('Content Info')
                        .setDescription('A folder is going to be empty soon')
                        .addFields(
                            { name: 'Path', value: contentPath, inline: true })
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
        
        if (posted < postAmount * parseInt(process.env.MIN_POSTS_CONTAINING)) {
            const embed = new MessageEmbed()
                .setColor('#8a1c00')
                .setTitle('Content urgent Alert')
                .setDescription('All folders for channel are empty')
                .addFields(
                    { name: 'Channel', value: chatIds.toString(), inline: true })
                .setTimestamp();

            const adminChannelIds = process.env.ADMIN_CHAT.split(";");

            for (let j = 0; j < adminChannelIds.length; j++) {
                const adminChannel = await client.channels.fetch(adminChannelIds[j]);
                await adminChannel.send({ embeds: [embed] }).catch(err => logger.log.error(err));
                logger.log.info('All folders for channel "' + chatIds.toString() + '" are empty');
            }

        }
    }
    
    logger.log.info("Posting done");
    
    startAutoPosting();
}

exports.startAutoPosting = startAutoPosting;
const { write } = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const { promisify } = require('util');
const creds = require('./credentials.json');
let client;
const logger = require('./logger');

let authorizeClient = async function () {
    client = new google.auth.JWT(
        creds.client_email,
        null,
        creds.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    client.authorize(function (err, tokens) {
        if (err) {
            logger.error(err);
            return;
        }

        logger.log.info('Successfully connected');
    });
}



const _spreadsheetId = '18576_bXNwkjDOF-OxVQ5nCPeIekL0kOaIuzNzT0AcUE';
const _sheetId = '325018152';
const _sheetName = 'Source Requests';
const appendRowStart = 1;
const appendRowStop = 2;
const colGuildId = 0;
const colChannelId = 1;
const colRequestId = 2;
const colUserId = 3;
const colContentId = 4;
const colConfirmationId = 5;
const colState = 6;
const colAnswer = 7;
const colAnswerId = 8;
const colSearchTime = 9;
const colVisitedWebsites = 10;

const { Message } = require('discord.js');



let addSourceRequest = async function (msgRequest, msgConfirmation, msgReference) {
    if (client !== null) {
        const gsapi = google.sheets({ version: 'v4', auth: client });
        
        let lineData = [[]];
        
        lineData[0][colGuildId] = msgRequest.guildId;
        lineData[0][colChannelId] = msgRequest.channelId;
        lineData[0][colRequestId] = msgRequest.id;
        lineData[0][colUserId] = msgRequest.author.id;
        lineData[0][colContentId] = msgReference.id;
        lineData[0][colConfirmationId] = msgConfirmation.id;
        lineData[0][colState] = 'PENDING';
        
        await appendRow(_spreadsheetId, _sheetId, appendRowStart, appendRowStop);
        await writeToLine(_spreadsheetId, _sheetName, 2, lineData);
        
        /**
        try {
            await appendRow(_spreadsheetId, _sheetId, appendRowStart, appendRowStop);
            logger.log.info('Added column to sheet');
            await writeToLine(_spreadsheetId, _sheetId, 2, [["Test"]]);
            logger.log.info('Added test value');
        } catch (err) {
            logger.log.error(err);
        } */
    } else {
        logger.log.error('Google Sheets Client not authorized');
    }
}

async function appendRow(spreadsheet, sheet, start, stop) {
    const gsapi = google.sheets({ version: 'v4', auth: client });
    await gsapi.spreadsheets.batchUpdate(
        {
            spreadsheetId: spreadsheet,
            resource: {
                requests: [
                    {
                        insertDimension: {
                            range: {
                                sheetId: sheet,
                                dimension: "ROWS",
                                startIndex: start,
                                endIndex: stop
                            }
                        }
                    }
                ]
            }
        }
    );
}

async function writeToLine(spreadsheet, sheet, line, data) {
    const gsapi = google.sheets({ version: 'v4', auth: client });
    
    await gsapi.spreadsheets.values.update(
        {
            spreadsheetId: _spreadsheetId,
            range: sheet + '!' + line + ':' + line,
            valueInputOption: 'USER_ENTERED',
            resource: { values: data }
        });
}

function columnToLetter(column) {
    var temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}

function letterToColumn(letter) {
    var column = 0, length = letter.length;
    for (var i = 0; i < length; i++) {
        column += (letter.toUpperCase().charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column;
}



exports.authorizeClient = authorizeClient;
exports.addSourceRequest = addSourceRequest;

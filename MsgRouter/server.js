"use strict";

// Declare Variables
var localConfigs = null;
var globalConfigs = null;
var globalConfigsFilePath = "../config/globalConfig";

var postgresClient = null;
var telergamNotifierClient = null;

// Internals
var Postgres;
var TelergamNotifier = null;

// Externals
var Promise = null; // Promise Module

// Get Local Configurations
try {
    localConfigs = require("./config.local");
} catch (error) {
    console.error("FATAL: Missing or invalid ./config.local.js\n" + error);
    process.exitCode = 1;
}

// Get the Global Configurations File Path (from Local Configurations)
globalConfigsFilePath = localConfigs.globalConfigFilePath || globalConfigsFilePath;

// Get Global Configurations
try {
    globalConfigs = require(globalConfigsFilePath);
} catch (error) {
    console.warn("Missing or invalid global config file: " + globalConfigsFilePath);
}

// Set Configurations
global.config = {
    postgres: {
        connectionString: localConfigs.pgDb || globalConfigs.pgDb,
        host: localConfigs.pgHost || globalConfigs.pgHost,
        port: localConfigs.pgPort || globalConfigs.pgPort,
        database: localConfigs.pgDbName || globalConfigs.pgDbName,
        username: localConfigs.pgUser || globalConfigs.pgUser,
        password: localConfigs.pgPassw || globalConfigs.pgPassw,
        connectionTimeout: localConfigs.pgConnectionTimeout || globalConfigs.pgConnectionTimeout,
        poolSize: localConfigs.pgPoolSize || globalConfigs.pgPoolSize,
        poolIdleTimeout: localConfigs.pgPoolIdleTimeout || globalConfigs.pgPoolIdleTimeout,
    },
    logs: {
        filePath: localConfigs.logPath || globalConfigs.logPath,
        fileName: localConfigs.logName || globalConfigs.logName
    },
    server: {
        name: localConfigs.serverName || "MsgRouterService",
        debugMode: localConfigs.debugMode || false
    },
    telegram: {
        tokenId: localConfigs.telegramTokeId || globalConfigs.telegramTokeId,
        privateGroupID: localConfigs.telegramPrivateGroupID || globalConfigs.telegramPrivateGroupID
    }
};

// Create Promise Module
Promise = require("promise");

// Create Postgres Module
Postgres = require("./postgres.js");

// Get TelergamNotifier Object
TelergamNotifier = require("./telegram.js");

// Initialize Postgres Client.
postgresClient = new Postgres(
    global.config.postgres
);

// Initialize Telegram and get the TelegramBot
telergamNotifierClient = new TelergamNotifier(
    global.config.telegram.tokenId,
    global.config.telegram.privateGroupID
);

const manageMessage = function(message) {
    return new Promise(function (fulfill, reject) {
        if (message.sent.date !== null) {
            console.log(
                "Server] Message with ID '" + message.id +
                "' already Sent on: \n" + message.sent.date
            );
            console.log("Server] Sent Info:", message.sent.meta);
            reject(
                "Server] Message with ID '" + message.id +
                "' already Sent on: " + message.sent.date
            );
        }
        switch (message.transport.name) {
            case "Telegram":
                console.log("Server] Send Message with Telegram");
                telergamNotifierClient
                    .sendMessage(message)
                    .then(function(messageSent) {
                        return postgresClient.setMessageSent(
                            message.id,
                            messageSent.date,
                            messageSent
                        );
                    })
                    .then(function() {
                        fulfill();
                    })
                    .catch(function(error) {
                        console.error("Server] Cannot Get Message: ", error);
                        reject("Server] Cannot Get Message: ", error);
                    });
                // Once the message is sent, we update the DB "sent" value.
                break;
            default:
                console.log("Server] Message Protocol Uknown");
                break;
        }
    });
};

telergamNotifierClient.listenMessages();
telergamNotifierClient.listenInlineQuery();

postgresClient
    .listenNewMessage(function(messageId) {
        return postgresClient
            .getMessage(messageId)
            .catch(function(error) {
                console.log("Server] Cannot Get Message: ", error);
            })
            .then(function(message) {
                manageMessage(message);
            })
            .finally(function() {
                console.log("Server] Done Managing Message: ", messageId);
            })
            .catch(function(error) {
                console.error("Server] Cannot Listen to new Message: ", error);
            });
    });

setInterval(
    function() {
        console.log("Server] Check not sent Messages");
        postgresClient
            .getNotSentMessagesIDs()
            .then(function(messagesIDs) {
                console.log("Server] Retrived " + messagesIDs.length + " not sent Messages");
                if (messagesIDs.length > 0) {
                    messagesIDs.forEach(function(messageId) {
                        setTimeout(function() {
                            postgresClient
                                .getMessage(messageId)
                                .catch(function(error) {
                                    console.log("Server] Cannot Get Message: ", error);
                                })
                                .then(function(message) {
                                    manageMessage(message);
                                })
                                .finally(function() {
                                    console.log("Server] Done Managing Message: ", messageId);
                                })
                                .catch(function(error) {
                                    console.error("Server] Cannot Listen to new Message: ", error);
                                });
                            },
                            1000 // 1000 Milliseconds
                        );
                    });
                }
            });
    },
    10000 // Five Seconds
);

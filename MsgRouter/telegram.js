// Create TelegramBot Module
var TelegramBot = require("node-telegram-bot-api");

// Create Promise Module
const Promise = require("promise");

// Get Message Classes
const GenericMessage = require("./message").GenericMessage;
const SOSMessage = require("./message").SOSMessage;

class TelergamNotifier {
    constructor(botTokenID, privateGroupID) {
        this.botTokenID = botTokenID;
        this.privateGroupID = privateGroupID;

        // Setup polling way
        this.bot = new TelegramBot(
            this.botTokenID,
            { polling: true }
        );
    }

    notifyGroup(message) {
        const privateGroupID = this.privateGroupID;
        const bot = this.bot;
        return new Promise(function (fulfill, reject) {
            bot
                .sendMessage(
                    privateGroupID,
                    message
                )
                .then(function (sended) {
                    console.log("TelergamNotifier] Notified Private Group with message: ");
                    fulfill(sended);
                })
                .catch(function (error) {
                    console.error("TelergamNotifier] Cannot Notify Private Group: ", error); // printing the error;
                    reject(error);
                });
        });
    }

    listenMessages() {
        const privateGroupID = this.privateGroupID;
        const bot = this.bot;

        // Listen to any kind of message
        this.bot.on("message",
            function (msg) {
                var chatId = msg.chat.id;

                console.log("TelergamNotifier] Received Telegram Message ID: ", msg.id);

                if (chatId === privateGroupID) {
                    console.log("TelergamNotifier] Received Message From Group: ", msg);
                    //bot.sendMessage(chatId, "Please, do not write here, use private messaging!");
                } else {
                    bot.sendMessage(chatId, "This Bot works only for private intent!");
                }
            }
        );

        console.log("TelergamNotifier] Listen start listening any message");
    }

   listenInlineQuery() {
        const privateGroupID = this.privateGroupID;
        const bot = this.bot;

        // Listen to any kind of message
        this.bot.on("callback_query",
            function (msg) {
                let data = null;
                console.log("TelergamNotifier] Received Telegram Inline Query ID: ", msg.id);

                if (msg.message.chat.id === privateGroupID) {
                    data = JSON.parse(msg.data);
                    bot.
                        sendLocation(
                            privateGroupID,
                            data.latitude,
                            data.longitude,
                            {
                                "reply_to_message_id": msg.message.message_id
                            }
                        )
                        .then(function name(params) {
                            bot.answerCallbackQuery(
                                msg.id,
                                "Done!"
                            );
                        })
                        .catch(function (error) {
                            console.error("TelergamNotifier] Cannot Notify Private Group: ", error); // printing the error;
                            return;
                        });
                }
                return;
            }
        );

        console.log("TelergamNotifier] Listen start listening any InlineQuery");
    }

    sendMessage(message) {
        const privateGroupID = this.privateGroupID;
        const bot = this.bot;
        return new Promise(function (fulfill, reject) {
            switch (message.className) {
                case SOSMessage.className: {
                    console.log("TelergamNotifier] Sending SOS Message");
                    bot
                        .sendMessage(
                            privateGroupID,
                            message.toHTMLString(),
                            {
                                "parse_mode": "HTML",
                                "reply_markup": JSON.stringify({
                                    "inline_keyboard":
                                    [
                                        [
                                            {
                                                text: "Get Location",
                                                callback_data: JSON.stringify(
                                                    {
                                                        id: message.id,
                                                        latitude: message.latitude,
                                                        longitude: message.longitude
                                                    }
                                                ),
                                            }
                                        ]
                                    ]
                                })
                            }
                        )
                        .then(function (sended) {
                            console.log("TelergamNotifier] Notified Private Group with message: ", sended.message_id);
                            fulfill(sended);
                        })
                        .catch(function (error) {
                            console.error("TelergamNotifier] Cannot Notify Private Group: ", error); // printing the error;
                            reject(error);
                        });
                    break;
                }
                case GenericMessage.className:
                default: {
                    console.log("TelergamNotifier] Sending Generic Message '" + message.type.name + "' Message");

                    bot
                        .sendMessage(
                            privateGroupID,
                            message.toHTMLString(),
                            {
                                "parse_mode": "HTML"
                            }
                        )
                        .then(function (sended) {
                            console.log("TelergamNotifier] Notified Private Group with message: ", sended.message_id);
                            fulfill(sended);
                        })
                        .catch(function (error) {
                            console.error("TelergamNotifier] Cannot Notify Private Group: ", error); // printing the error;
                            reject(error);
                        });
                    break;
                }
            }
        });
    }

}

module.exports = TelergamNotifier;
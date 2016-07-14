// Create Postgres Objects
const PGClient = require("pg-native");
const PGPubsub = require("pg-pubsub");

// Create MomentJS Module
const moment = require("moment");

// Create Promise Module
const Promise = require("promise");

// Get SOSMessage
const SOSMessage = require("./message").SOSMessage;
const GenericMessage = require("./message").GenericMessage;

class Postgres {
    constructor (connectionParameters) {
        if (typeof connectionParameters !== "object") {
            return;
        }
        this.connectionParameters = connectionParameters;
        this.connectionStringKV = "host=" + connectionParameters.host +
            " port=" + connectionParameters.port +
            " dbname=" + connectionParameters.database +
            " user=" + connectionParameters.username +
            " password=" + connectionParameters.password +
            " connect_timeout=" + connectionParameters.connectionTimeout +
            " application_name=" + connectionParameters.name;
        this.connectionStringURI = "postgres://" + connectionParameters.username +
            ":" + connectionParameters.password + "@" + connectionParameters.host +
            ":" + connectionParameters.port + "/" + connectionParameters.database;
    }

    listenNewMessage(callback) {
        const connectionStringURI = this.connectionStringURI;
        const client = new PGPubsub(connectionStringURI);

        console.log("Postgres] Listen PG notifies");

        client.addChannel(
            "messages_outbox",
            function(payload) {
                const messageId = parseInt(payload, 10);

                console.log("Postgres] message -->", messageId);
                global.console.log("Postgres] Notify reservation:",messageId);

                callback(messageId);
            }
        );
    }

    getMessage(id) {
        let client = new PGClient();
        const connectionStringKV = this.connectionStringKV;

        return new Promise(function (fulfill, reject) {
            if (typeof id !== "number") {
                // @TODO throw new Exeption.
                reject();
            }
            client.connect(
                connectionStringKV,
                function(error) {
                    if (error) {
                        console.error("Postgres] Connection Error: ", error);
                        reject("Postgres] Connection Error: ", error);
                    }
                    const sql = "SELECT" +
                        " mo.id as id," +
                        " COALESCE( mo.transport , mts.default_transport ) as transport," +
                        " mtp.options as transport_options," +
                        " mo.destination as destination," +
                        " mts.name as type," +
                        " subject as subject," +
                        " text as text," +
                        " submitted as submitted," +
                        " sent as sent," +
                        " acknowledged as acknowledged," +
                        " meta as meta," +
                        " sent_meta as sent_meta" +
                        " FROM messages_outbox mo" +
                        " LEFT JOIN messages_types mts ON mo.type = mts.name" +
                        " LEFT JOIN messages_transports mtp ON mtp.name = COALESCE( mo.transport , mts.default_transport )" +
                        " WHERE mo.id = $1::integer";
                    //parameterized statements
                    client.query(
                        sql,
                        [id],
                        function(error, rows) {
                            if (error || rows.length !== 1) {
                                console.error("Postgres] Query Command Error ", error);
                                reject("Postgres] Query Command Error ", error);
                            }
                            // Now we try to retrive more information about this message
                            // and we convert-it to an Object.
                            return Postgres
                                .castMessage(client, rows.pop())
                                .then(function(msgObject) {
                                    fulfill(msgObject);
                                })
                                .catch(function (error) {
                                    console.error(error); // printing the error;
                                    reject(error);
                                });
                        }
                    );
                }
            );
        });
    }

    getNotSentMessagesIDs() {
        const client = new PGClient();
        const connectionStringKV = this.connectionStringKV;
        return new Promise(function (fulfill, reject) {
            client.connect(
                connectionStringKV,
                function(error) {
                    const sql = "SELECT mo.id" +
                        " FROM messages_outbox mo" +
                        " LEFT JOIN messages_types mt ON mo.type = mt.name" +
                        " WHERE" +
                        " mo.sent IS NULL" +
                        " AND mo.type IS NOT NULL" +
                        " AND mo.destination IS NOT NULL" +
                        " AND COALESCE( mo.transport , mt.default_transport ) IS NOT NULL" +
                        " ORDER BY submitted ASC" +
                        " LIMIT 5";
                    if (error) {
                        console.error("Postgres] Connection Error: ", error);
                        reject("Postgres] Connection Error: ", error);
                    }
                    client.query(
                        sql,
                        function(error, rows) {
                            if (error) {
                                console.error("Postgres] Query Command Error ", error);
                                reject("Postgres] Query Command Error ", error);
                            }
                            // Now we try to retrive more information about this message
                            // and we convert-it to an Object.
                            fulfill(
                                rows.map(function(message) {
                                    return message.id
                                })
                            );

                            client.end();
                        }
                    );
                }
            );
        });
    }

    setMessageSent(messageId, date, sentMetadata) {
        const client = new PGClient();
        const connectionStringKV = this.connectionStringKV;

        return new Promise(function (fulfill, reject) {
            let parsedDate;
            let parsedSentMeta;

            if (
                typeof messageId !== "number" ||
                (!date instanceof Date && typeof date !== "number")
            ) {
                // @TODO throw new Exeption.
                reject();
            }

            parsedDate = moment.unix(parseInt(date, 10));

            console.log("Postgres] Set Message ID: '" + messageId +
                "' sent on: '" + parsedDate.format());

            client.connect(
                connectionStringKV,
                function(error) {
                    const parameters = [];
                    let sql = "";

                    if (error) {
                        console.error("Postgres] Connection Error: ", error);
                        reject();
                    }

                    sql = "UPDATE messages_outbox SET sent = $1";
                    parameters.push(parsedDate.format());

                    if (typeof sentMetadata === "object") {
                        parsedSentMeta = JSON.stringify(sentMetadata);
                        sql += ", sent_meta = $2 WHERE id = $3";
                        parameters.push(parsedSentMeta);
                    } else {
                        sql += " WHERE id = $2";
                    }

                    parameters.push(messageId);

                    //parameterized statements
                    client.query(
                        sql,
                        parameters,
                        function(error, rows) {
                            if (error) {
                                console.error("Postgres] Connection Error: ", error);
                                reject(error);
                            }
                            fulfill();
                            client.end();
                        }
                    );
                }
            );
        });
    }

    // Statuc Method (no need initialized instance)
    static castMessage(postgresClient, message) {
        return new Promise(function (fulfill, reject) {
            console.log("Postgres] Casting Message Type: " + message.type);

            switch (message.type) {
                case SOSMessage.className: {
                    console.log("Postgres] Casting SOSMessage");
                    // Creating the new SOSMessage parsing Meta
                    const sosMessage = new SOSMessage().setFromMessageOutboxEntity(message);
                    let customer = null;

                    // Get Customer informations 
                    postgresClient.query(
                        "SELECT id, name, surname FROM customers WHERE id = $1::integer",
                        [sosMessage.customer.id],
                        function(error, rows) {
                            postgresClient.end();

                            if (error || rows.length !== 1) {
                                console.error("Postgres] Query Command Error ", error);
                                reject(error);
                            }

                            // Add Customer informations to SOSMessage
                            sosMessage.customer = rows.pop();

                            fulfill(sosMessage);
                        }
                    );
                    break;
                }
                case GenericMessage.className:
                default: {
                    console.log("Postgres] Casting GenericMessage");
                    // Creating the new GenericMessage parsing Meta
                    fulfill(
                        new GenericMessage().setFromMessageOutboxEntity(message)
                    );
                }
            }
        });
    }
}

module.exports = Postgres;
// DataBase
exports.pgHost = "dm-1";
exports.pgPort = 5432;
exports.pgDbName = "sharengo";
exports.pgUser = "sharengo";
exports.pgPassw = "gmjk51pa";
exports.pgConnectionTimeout = 5; // 5 seconds
exports.pgDb = "postgres://" + exports.pgUser +
    ":" + exports.pgPassw + "@" + exports.pgHost +
    ":" + exports.pgPort + "/" + exports.pgDbName;
exports.pgPoolSize = 25;
exports.pgPoolIdleTimeout = 5000; // 5 sec

// Server
exports.serverName = "MsgRouter";
exports.httpPort = 8126;
exports.httpUnsecurePort = 8127;

// Log
exports.logPath = "/var/log/services/";
exports.logName = exports.serverName + "_access.log";

// Certificates
exports.globalCertificateFilePath = "../ssl/server.cer";
exports.globalKeyFilePath = "../ssl/server.key";
exports.globalCAFilePath = "../ssl/ca.cer";

// Global Configurations File Path
exports.globalConfigFilePath = "../config/globalConfig";

// Telegram
exports.telegramTokeId = "224402891:AAGop9luiZtrh6yW2X50ZpyboyrJ9mqBE4M";
exports.telegramPrivateGroupID = -1001052334823;

// DEBUG
exports.debugMode = process.env.DEBUG === "true" || process.env.DEBUG === "1" || false;
exports.debugDockerMode = process.env.DOCKERDEBUG === "true" || process.env.DOCKERDEBUG === "1" || false;

if (exports.debugMode) {
  console.log("DebugMode Active");
  exports.httpPort += 10000;
  exports.httpUnsecurePort += 10000;
  exports.logPath += "debug/";
}

if (exports.debugDockerMode) {
  console.log("DebugMode Docker Active");
  exports.globalConfigFilePath = "./config.global.js";
  exports.globalCertificateFilePath = "./debug/ssl/server.cer";
  exports.globalKeyFilePath = "./debug/ssl/server.key";
  exports.globalCAFilePath = "./debug/ssl/ca.cer";
}

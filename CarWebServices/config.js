// db
exports.pgDb = "postgres://sharengo:gmjk51pa@dm-1:5432/sharengo";
exports.debugMode = process.env.DEBUG=='true' || process.env.DEBUG=='1' || false;
exports.httpPort =  8123;
exports.httpUnsecurePort =  8121;
exports.logPath = "/var/log/services/";
exports.serverName = "Sharengo";

if (exports.debugMode) {
  console.log("DebugMode active");
  exports.httpPort +=  10000;
  exports.httpUnsecurePort +=  10000;
  exports.logPath += "debug/";
}


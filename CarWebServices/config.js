// db
exports.pgDb = "postgres://sharengo:Sharengo1@127.0.0.1/sharengo";
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


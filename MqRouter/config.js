// db
exports.pgDb = "postgres://sharengo:gmjk51pa@dm-1:5432/sharengo";
exports.debugMode = process.env.DEBUG=='true' || process.env.DEBUG=='1' || false;
exports.inSockPort = 8000;   //Internal port for services connection
exports.outSockPort = 8001;  //External port for vehicles
exports.redisDb =  1;
exports.logPath = "/var/log/services/";
exports.serverName = "Sharengo";

if (exports.debugMode) {
  console.log("DebugMode active");
  exports.httpPort +=  10000;
  exports.httpUnsecurePort +=  10000;
  exports.logPath += "debug/";
}


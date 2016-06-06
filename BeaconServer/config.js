exports.debugMode = process.env.DEBUG=='true' || process.env.DEBUG=='1' || false;
exports.udpPort =  7600;
exports.httpPort =  7600;
exports.webPort =  7602;
exports.logPath = "/var/log/services/";
exports.serverName = "Sharengo";

if (exports.debugMode) {
  console.log("DebugMode active");
  exports.udpPort += 10000;
  exports.httpPort +=  10000;
  exports.httpUnsecurePort +=  10000;
  exports.logPath += "debug/";
}
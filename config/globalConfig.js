// db
exports.pgDb = "postgres://sharengo:gmjk51pa@127.0.0.1/sharengo";
exports.redisDb = "127.0.0.1:6379";
exports.redisCluster =   [{host: '127.0.0.1', port: 26379}];
exports.redisSentinels =  { sentinels: [{host: '127.0.0.1', port: 26379}],  name : 'localhost' };
exports.logPath = "/var/log/services/";


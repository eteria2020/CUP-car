// db
exports.pgDb = "postgres://sharengo:gmjk51pa@127.0.0.1/sharengo";
exports.redisDb = "dm-1:6379";
exports.redisCluster =   [{host: 'dm-1', port: 26379},{host: 'dm-2', port: 26379},{host: 'dm-3', port: 26379}];
exports.redisSentinels =  { sentinels: [{host: 'dm-1', port: 26379},{host: 'dm-2', port: 26379},{host: 'dm-3', port: 26379}],
                            name : 'dm-1' };
exports.logPath = "/var/log/services/";


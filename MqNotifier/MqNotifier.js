try {
    var globalConfig = require('../config/globalConfig');
}   catch(ex) {
    console.warn("Missing or invalid ../config/globalConfig.js");
    var globalConfig = {};
}

var logPath =  globalConfig.logPath;
var zmqRouterUrl =  globalConfig.zmqRouterUrl;

var zmq = require('zmq');

var pg = require('pg');
require('pg-spice').patch(pg);

var cstr = globalConfig.pgDb;

var bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: "MqNotifier",
  streams: [{ path : logPath + 'MqNotifier.log' , level : 'info' },
            { path : logPath + 'MqNotifier.log' , level : 'debug' },
            { path : logPath + 'MqNotifier.log' , level : 'warning' },
            { path : logPath + 'MqNotifier.log' , level : 'error' }
  ],
  serializers: bunyan.stdSerializers
});


var PGPubsub = require('pg-pubsub');
var pgpubsub = new PGPubsub(cstr);


function scanPendingReservations(car_plate) {
  log.debug("Scan pending reservations START");
  pg.connect(cstr,function (err,client,done) {
    if (err) {
      console.error('PgConnect error',err);
      log.error('PgConnect error',err);
      return;
    }

    var where_carplate = (typeof car_plate!= 'undefined' ?" AND car_plate='"+car_plate+"'":"");
    var sql = "SELECT car_plate  FROM reservations WHERE to_send = TRUE " + where_carplate;
    var query = client.query(sql, null , function(err,result) {
      if (err) {
        console.error('Query reservations error',err);
        log.error("Scan pending reservations (Where:"+where_carplate+")",err);
        return;
      }
    });


    query.on('row', function(row) {
       notifyReservation(row.car_plate,true);
    });

    query.on('end', function(result) {
       done(client);
       log.debug("Scan pending reservations END")
    });

  });
}

function scanPendingCommands(car_plate) {
 log.debug("Scan pending commands START");
 pg.connect(cstr,function (err,client,done) {
    if (err) {
      console.error('PgConnect error',err);
      log.error('PgConnect error',err);
      return;
    }

    var where_carplate = (typeof car_plate!= 'undefined' ?" AND car_plate='"+car_plate+"'":"");

    var sql = "SELECT car_plate, count(*) as cnt FROM commands WHERE to_send = TRUE " + where_carplate + " GROUP BY car_plate ";
    var query = client.query(sql, null , function(err,result) {
      if (err) {
        console.error('Query commands error',err);
        log.error("Scan pending commands (Where:"+where_carplate+")",err);
        return;
      }
    });


    query.on('row', function(row) {
       notifyCommand(row.car_plate,true);
    });

    query.on('end', function(result) {
       done(client);
      log.debug("Scan pending commands END");
    });

  });
}


function doListen() {
  log.debug("Listen PG notifies");

  pgpubsub.addChannel('reservations', function(payload) {
     console.log("reservations -->",payload);
     log.debug("Notify reservation:",payload);
     var p = payload.split(',');
     notifyReservation(p[1],p[2]);
  });

    pgpubsub.addChannel('commands', function(payload) {
     console.log("commands -->",payload);
     log.debug("Notify command:",payload);
     var p = payload.split(',');
      notifyCommand(p[1],p[2]); ;
  });

}

function notifyReservation(car_plate,to_send) {
  if (to_send) {
    sock.send([car_plate,'{"reservations":1}']);
    console.log('SEND:', car_plate,'{"reservation":1}');
    log.debug('SEND:', car_plate,'{"reservation":1}');
  }
}


function notifyCommand(car_plate,to_send) {
  if (to_send) {
    sock.send([car_plate,'{"commands":1}']);
    console.log('SEND:', car_plate,'{"command":1}');
    log.debug('SEND:', car_plate,'{"command":1}');
  }
}

var sock = zmq.socket('xpub');

var count =0;

sock.connect(zmqRouterUrl);
console.log('Publisher connect to ' + zmqRouterUrl);
log.debug('Publisher connect to ' + zmqRouterUrl);

sock.on("message",function(data) {

    var isSubscribe = data[0]===1;
    var type =  isSubscribe ? 'subscribe' : 'unsubscribe';
    var channel = (data.length>1) ?  data.slice(1).toString() : "*";

    console.info(type + ':' + channel);
    log.info(type + ':' + channel);

    if (isSubscribe && channel != "*" && channel != "COMMON") {
        scanPendingCommands(channel);
        scanPendingReservations(channel);
    }


 });

scanPendingCommands();
scanPendingReservations();

setInterval(scanPendingCommands,60000);
setInterval(scanPendingReservations,60000);

doListen();

log.debug("Started");
console.log(log.levels());


<<<<<<< HEAD
=======
//#!/usr/bin/env nodemon -e js,ls

'use strict';


// Basic modules
var stamp =     require('console-stamp')(console, 'dd/mm/yyyy HH:MM:ss.l');
var cluster =   require('cluster');


// Configurations
var config = require('./config');
var globalConfig = require('../config/globalConfig');


>>>>>>> 865b8e9babbec10176fd481d9131480c55f9f9aa

//require('v8-profiler');


/*
var logger = require('winston');
logger.add(logger.transports.DailyRotateFile, { filename: 'logs/udpserver.log', datePattern : '.dd', json : false, level : 'info' });
logger.add(logger.transports.File, { filename: 'logs/udpserver-errors.log', maxsize: 1000000, maxFiles : 10, json : false, level : 'error' });
*/


var mcrypt = require('mcrypt');
var md5 = require("blueimp-md5").md5;
var dgram = require('dgram');
var async = require('async');
var zlib = require('zlib');
var http = require('http');
var url  = require('url');

var pg = require('pg');
require('pg-spice').patch(pg);

var udpPort = config.udpPort;
var httpPort = config.httpPort;
var webPort = config.webPort;
var cstr = globalConfig.conString;



var kue = require('kue');
var jkue = kue.createQueue({
  prefix: 'q',
  redis: {
    port: 6379,
    host: '127.0.0.1',
    auth: '',
    db: 2,
    options: {
      // see https://github.com/mranney/node_redis#rediscreateclient
    }
  }
});
kue.app.listen(webPort);



var cacheComandi={};
var cachePrenotazioni={};

var beaconparser = require('./BeaconParser');
beaconparser.init(cstr);



  var CountBeacon=0;
  var CountQuery=0;
  var Count10=0;
  var Count10Prev=0;

  var Count60=0;
  var Count60Prev=0;


  function update10(){
    Count10 = (CountBeacon+CountQuery)-Count10Prev;
    Count10Prev = (CountBeacon+CountQuery);

  }

  function update60(){
    Count60 = (CountBeacon+CountQuery)-Count60Prev;
    Count60Prev = (CountBeacon+CountQuery);
    console.log("Last 60 sec: " + Count60);
  }

  function startStats(){
    //setInterval(update10,10000);
    setInterval(update60,60000);
  }




function pkcs5_pad (text, blocksize) {
    var pad = blocksize - (text.length % blocksize);
    return text  + Array(pad+1).join(String.fromCharCode(pad));

}


function javacrypt(text) {
  var Ecb = new mcrypt.MCrypt('des', 'ecb');
  var key="+xBE450u";
  var blockSize = Ecb.getBlockSize();

  Ecb.validateKeySize(false);
  Ecb.open(key);

  //console.log("BlockSize=" + blockSize);
  //console.log("Text=" + text + " " + text.length);
  text = pkcs5_pad(text, blockSize);
  //console.log("Text(pkcs5)=" + text + " " + text.length );

  var cipherText = Ecb.encrypt(text)

  return cipherText.toString('base64');

}

function doListen() {
  pg.connect(cstr,function (err,client,done) {
    if (err) {
      console.error('Connect error',err);
      done(client);
      return;
    }

    var sql = "LISTEN reservations";
    var query = client.query(sql, function(err,result) {
      if (err) {
        console.error('Query error',err);
        return;
      }
    });

    var sql = "LISTEN commands";
    var query = client.query(sql, function(err,result) {
      if (err) {
        console.error('Query error',err);
        return;
      }
    });


    client.on('notification', function(msg) {
      console.log("Notification:", msg);
      var p = msg.payload.split(',');
      if (msg.channel=='reservations') {
          cachePrenotazioni[p[1]]=(p[2] === 'true');
          console.log("Set cache prenotazioni : " + p[1] + "=" + cachePrenotazioni[p[1]]);
          doUpdateCachePrenotazioni();
      } else if (msg.channel=='commands') {
          cacheComandi[p[1]]=(p[2] === 'true');
          console.log("Set cache comandi : " + p[1] + "=" + cacheComandi[p[1]]);
          doUpdateCacheComandi();
      }

    });

    query.on('end', function(result) {
       //done(client);
       //console.log("Closed listen");
    });


  });
}


function  doExpireReservations() {
 pg.connect(cstr,function (err,client,done) {
    if (err) {
      console.error('Connect error',err);
      return;
    }

    var sql = "update reservations set  active=false, to_send=true where  active=true and consumed_ts is null and length > 0  and beginning_ts < NOW() - INTERVAL '31 minutes';";

    var query = client.query(sql, null , function(err,result) {
      if (err) {
        console.error(' Expire reservations error',err);
        return;
      }
    });

    query.on('end', function(result) {
       console.log("* Expire reservations done ");
       done(client);
    });


  });
}



function doUpdateCachePrenotazioni() {
 pg.connect(cstr,function (err,client,done) {
    if (err) {
      console.error('Connect error',err);
      return;
    }

    var tmpCachePrenotazioni={};
    var sql = "SELECT  car_plate  FROM reservations WHERE to_send = TRUE";
    var query = client.query(sql, null , function(err,result) {
      if (err) {
        console.error('Query error',err);
        return;
      }
    });


    query.on('row', function(row) {
       tmpCachePrenotazioni[row.car_plate]=true;
    });

    query.on('end', function(result) {
       cachePrenotazioni =  tmpCachePrenotazioni;
       console.log("* Update Prenotazioni: ");
       //console.log(cachePrenotazioni);
       done(client);
    });


  });
}

function doUpdateCacheComandi() {
 pg.connect(cstr,function (err,client,done) {
    if (err) {
      console.error('Connect error',err);
      return;
    }

    var tmpCacheComandi={};
    var sql = "SELECT DISTINCT car_plate  FROM commands WHERE  to_send = TRUE";
    var query = client.query(sql, null, function(err,result) {
      if (err) {
        console.error('Query error',err);
        return;
      }
    });


    query.on('row', function(row) {
       tmpCacheComandi[row.car_plate]=true;
    });

    query.on('end', function(result) {
       cacheComandi =  tmpCacheComandi;
       console.log("* Update Comandi")
       //console.log(cacheComandi);
       done(client);
    });


  });
}

function doCheckPrenotazioni(targa, extCallback) {
  if (cachePrenotazioni.hasOwnProperty(targa) && cachePrenotazioni[targa]==true)  {
     extCallback(null,{count : 1});
  } else {
     extCallback(null, {count : 0});
  }
}



function doCheckComandi(targa, extCallback) {
  if (cacheComandi.hasOwnProperty(targa) && cacheComandi[targa]==true)  {
     extCallback(null,{count : 1});
  } else {
     extCallback(null,{count : 0});
  }
}



function enqueueBeacon(id, xsender, xpayload) {
  //console.log("JSON2 lenght=" + xpayload.length + xpayload );
  jkue.create('beacons', {
    title: xsender,
    id:  id,
    sender : xsender,
    payload : xpayload
  }).ttl(10000).save(function (err) {
    if (err)
        console.error(err);
    else
        console.log("Queued : " + CountBeacon);
        //console.log("enqueue:"  + xpayload);
  })
}


function startDequeueBeacon() {
  console.log("Start dequeue");
  jkue.process('beacons', function (job,ctx,done) {
       console.log("--Begin JOB: " + job.id + "("+job.title+")");
       beaconparser.process(job.data.payload,job,done);
       //done();

       //console.log(job);
  });
}


function doCleanQueue() {
  kue.Job.rangeByState( 'complete', 0, 1000, 'asc', function( err, jobs ) {
  jobs.forEach( function( job ) {
    if (parseInt(job.started_at) + 120000 < Date.now() ) {
      job.remove( function(){
        console.log( 'removed ', job.id );
      });
    }
  });
});
}

var prevQueueSize=Number.MAX_VALUE;

function doQueueCheck() {
  jkue.inactiveCount( function( err, total ) {
    //If queue size is > 1500 or from last checkpoint  is incresed, restart service
    if( (total>1500) || (total - prevQueueSize > 50) ) {
      console.error('Queue stuck - restarting' );
      process.exit(0);
    }
    prevQueueSize = total;
  });
}



function processDgram(msg,rinfo,server) {


  var targa = '';
  var logstr = '';


  if (msg.length>5 && msg[0]=='?') {
        targa=msg.substr(1).trim();
        logstr='?';
        CountQuery++;
        b=new Buffer("*");
        server.send(b,0,b.length,udpPort,rinfo.address, function (err,bytes) {});
    } else {
      logstr='!';
      //var a = msg.indexOf('{');
      //var b = msg.indexOf('}');

      //if (a>=0 && b>a) {
          var  json = msg;
          //targa = beaconparser.process(json);
          enqueueBeacon(CountBeacon++,rinfo.address,json);
      //}
    }

}


function getNotifies(targa, cb) {

  if ( targa!=null  && targa.length>0 ) {
       var logstr = targa;
       async.auto({
         queryPrenotazioni: function(callback) {
            doCheckPrenotazioni(targa,callback);
         },

         queryComandi : function(callback) {
            doCheckComandi(targa,callback);
         },

         answer: ['queryPrenotazioni','queryComandi', function(callback, results) {

           var robj = {};

           if (results.queryComandi.count>0)
            robj.commands =  results.queryComandi.count;

           if (results.queryPrenotazioni.count>0)
            robj.reservations =  results.queryPrenotazioni.count;


           rmsg = JSON.stringify(robj);



           var emsg = javacrypt(rmsg);

           var rbuf = new Buffer(rmsg);

           console.log(logstr + ":" + rmsg);
           cb(rmsg);

         }]
        }, function(err,result) {
            console.log('err = ', err);
            console.log('results = ', results)

       });


  }

}



var server = dgram.createSocket('udp4');

server.on('error',function(err) {
  //logger.error('Socket error' + err.stack);
  console.log('Server error:\n' + err.stack);
  server.close();
});

server.on('message', function(msg,rinfo) {
    var umsg;
    try {
     umsg = zlib.gunzipSync(msg);
    } catch (ex) {
      console.error(msg.toString(),ex);
      return;
    }
    //console.log('!');
    //console.log(msg.length,umsg.length,umsg.toString());

    processDgram(umsg.toString(),rinfo,server);
});

server.on('listening', function() {
   var address = server.address();
   console.log("Server started: " +  address.address + ':' + address.port);
   //logger.info("Server started: " +  address.address + ':' + address.port);
});





var httpserver = http.createServer(function (req, res) {

  var url_parts = url.parse(req.url, true);

  var query = url_parts.query;
  var path = url_parts.pathname;


  if (path='/notifies' && query.plate) {

      getNotifies(query.plate, function(body) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(body);
      });

      if (query.beaconText) {
          console.log("*******************");
          enqueueBeacon(CountBeacon++,query.plate, query.beaconText);
          if (query.plate=="CSDEMO04")
            console.log("CSDEMO04 =" + query.beaconText);
          //targa = beaconparser.process(query.beaconText);
      }
  } else {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end("");
  }

});


setInterval(doUpdateCachePrenotazioni,60000);
setInterval(doUpdateCacheComandi,60000);
setInterval(doCleanQueue,60000);
setInterval(doQueueCheck,15000);


//setInterval(doExpireReservations,60000);
doUpdateCachePrenotazioni();
doUpdateCacheComandi();
doCleanQueue();

startDequeueBeacon();

server.bind(udpPort);
startStats();
doListen();

httpserver.listen(httpPort,"0.0.0.0" , function() { console.log("HTTP listening on : "+ httpPort);});

console.log("Running");
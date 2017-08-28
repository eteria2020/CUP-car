// Configurations
try {
    var config = require('./config');
} catch(ex) {
    console.error("FATAL: Missing or invalid ./config.js ");
    exit(1);
}


try {
    var globalConfig = require('../config/globalConfig');
}   catch(ex) {
    console.warn("Missing or invalid ../config/globalConfig.js");
    var globalConfig = {};
}

//Porta socket rivolto verso server
var inSockPort = config.inSockPort || 8000;

//Porta socket rivolto verso tablet
var outSockPort = config.outSockPort || 8001;


var cstrRedis = globalConfig.redisDb;

var debug=true;
var withZap=false;
var withCrypto=true;
var withSegfaultHandler=false;
var withRRD=false;
var withRedis=true;
var withProcMonitor=true;

var logPath = globalConfig.logPath;

var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: "mq.r",
  streams: [{
    path : logPath + 'MqRouter.log'
  }],
  serializers: bunyan.stdSerializers
});



//Contatori

var nMsgIn=0;
var nMsgOut=0;
var nSubs=0;
var nUnsubs=0;


if (withSegfaultHandler) {
  //Inizializza handler eccezioni segmentation fault
  var SegfaultHandler = require('segfault-handler');
  SegfaultHandler.registerHandler();
}

if (withCrypto) {
  log.info("Crypto layer enabled");
  var crypto = require("crypto");
  var cryptoAlgorithm = "aes-128-ecb";
  var cryptoKey = "ew3J8M4aGBZhIMMLkPJgUAdKPduqiYxezZhJymNgNkmS3NlXhzO1FYT0o6ONRL4";
}


if (withRedis) {
    var Redis = require('ioredis');
    var redis = new Redis(cstrRedis);
}


if (withRRD) {
  var rrd = require('rrd')
}

if (withProcMonitor) {
  var pstat = require('pidusage');
  var cpuAlarms = 0;
}

//Inizializza  zeroMQ
var zmq = require('zmq')
var inSock=null;
var outSock=null;

var subscriptors;

function timestampRRD() { return Math.ceil((new Date).getTime() / 1000); }

//DS:nMsgOut:COUNTER:120:0:U DS:nSubs:COUNTER:120:0:U DS:nUnsubs:COUNTER:120:0:U      RRA:AVERAGE:0.5:1d:5y
function initRRD() {

  var dataSources = [
  'DS:nMsgIn:COUNTER:15:0:U',
  'DS:nMsgOut:COUNTER:15:0:U'
  ];

  var graphs = [
  'RRA:AVERAGE:0.5:12:1440',
  'RRA:MAX:0.5:12:1440',
  'RRA:AVERAGE:0.5:180:2880',
  'RRA:MAX:0.5:180:2880',
  'RRA:AVERAGE:0.5:17280:1825'
  ];


  rrd.create('/var/lib/rrd/MqRouter.rdb', 5, timestampRRD(), dataSources.concat(graphs), function (error) {
      if (error !== null) {
        log.error('Error creating RRD: ' + error);
        console.log('Error creating RRD: ' + error);
      }
  });

}

function updateRRD() {
  var now = timestampRRD();
  var data = [[now, nMsgIn,nMsgOut].join(':')];
  //console.log("RRD update : " + data);
  rrd.update('/var/lib/rrd/MqRouter.rdb', 'nMsgIn:nMsgOut', [['N', nMsgIn,nMsgOut].join(':')], function (error) {
      if (error) console.log("Error:", error);
  });


}


function startRRD() {
  setInterval( function(){ updateRRD(); }, 5000);
}


function addSubscriptor(id) {

}





function encryptBuffer(buffer) {
  var string;

  if (withCrypto) {
        var cipher = crypto.createCipher(cryptoAlgorithm, new Buffer(cryptoKey,'utf8'));
        cipher.setAutoPadding(true);
        string = new Buffer(Buffer.concat([cipher.update(buffer),cipher.final()]).toString('base64'));
    }  else {
        string =  buffer.toString();
    }
    return string;
}



function decryptBuffer(buffer) {
  var ebuffer;
  if (withCrypto) {
      var decipher = crypto.createDecipher(cryptoAlgorithm, new Buffer(cryptoKey,'utf8'));
      ebuffer = Buffer.concat([decipher.update(new Buffer(buffer.toString(),'base64')), decipher.final()]);
  } else {
    ebuffer = buffer;
  }
  return ebuffer;
}

//Inizializza ZAP
function initZAP() {
    var z85 = require('z85');
    var dbg = require('debug')('zmq-zap');
    var zmqzap = require('zmq-zap');
    var ZAP = zmqzap.ZAP;
    var CurveMechanism = zmqzap.CurveMechanism;
    var zap = new ZAP();
    var serverPublicKey = z85.decode('E&ahzm6FilM:*[[7G1Df!cd$}(Z8}=K!>#QwNrnn'),
    	serverPrivateKey = z85.decode('a6*<Em>Zd^a4ENdsGp>MNZ8-PevbUblDfk(9NJA<'),
    	clientPublicKey = z85.decode('(kW)UE2vR%M^!mp9LPJ]3%[o?Y-344U?#LKW8m>('),
    	clientPrivateKey = z85.decode('Gzy#j=-mi{2iCF2vi]N?pketY7+cI*xc8YXRFjH1');

    zap.use(new CurveMechanism(function(data,cb) {
    	debug('Authenticating %s', JSON.stringify(data, true, 2));

    	// This is where you'd check to see if you want to let the socket connect.
    	// The CURVE mechanism lets you authenticate based on domain and address and a pre-exchanged publickey.

    	// For this example, let sockets connect where the "server" is in the "test" domain and the "client"'s address is "127.0.0.1"
    	if ((data.domain == 'test') && (data.address == "127.0.0.1")) {
    		// and where the publickey matches the one we have for the client
    		if (data.publickey == '(kW)UE2vR%M^!mp9LPJ]3%[o?Y-344U?#LKW8m>(') callback(null, true);
    		else callback(null, false);
    	}
    	else callback(null, false);
    }));

    var zapSocket = zmq.socket('router');

    zapSocket.on('message', function() {
      //Ricevuto messaggio di richiesta autenticazione
      zap.authenticate(arguments, function(err,response) {
        if (err) console.error("ZAP error:", err);

        //Risposta anche nel caso di errore
        if (response) zapSocket.send(response);
      })
    })

    zapSocket.bindSync('inproc://zeromq.zap.01');

}


function handleServerToTablet(channel,data) {
  console.log(channel.toString(),data);
  var msg = data;
  if (withCrypto) {
     msg =  encryptBuffer(data);
  }

  if (debug) {
    var logTxt = "";
    if (channel && data)
        logTxt =  'Routing to "' +  channel.toString() + '"   Plain msg :"' + data.toString() + '"';
    if  (withCrypto)
        logTxt +=  '  Raw msg: "' + msg.toString() + '"';
    log.info(logTxt);
  }

  outSock.send([channel,msg]);
  nMsgOut++;
}

function handleTabletToServer(data) {
  if (debug) {
    // The data is a slow Buffer
    // The first byte is the subscribe (1) /unsubscribe flag (0)
    var type = data[0]===0 ? 'unsubscribe' : 'subscribe';
    // The channel name is the rest of the buffer

    if (data.length>1) {
        var channel = data.slice(1).toString();
        log.info(type + ':' + channel);
    } else {
        log.info(type + ': *');
    }
  }

  if (withRedis && data.length>1) {
    var channel = data.slice(1).toString();
    if (data[0]==0) {
        redis.srem('subscribers',channel);
        redis.hset(channel,'subscribed_at',null);
        redis.hset(channel,'subscribed_at_ts',0);
    } else {
        redis.sadd('subscribers',channel);
        redis.hset(channel,'subscribed_at',new Date());
        redis.hset(channel,'subscribed_at_ts',Date.now() / 1000 | 0);
        redis.hincrby(channel,'subscriptions',1);
    }
  }

  inSock.send(data);
  nMsgIn++;
}


function CheckCpuLimit() {
  if (pstat) {
    pstat.stat(process.pid, function(err,stat) {

       if (stat.cpu>75) {
           cpuAlarms++;
       } else {
           cpuAlarms=0;
       }
       log.info("CPU="+stat.cpu+" Alarms=" + cpuAlarms);

       if (cpuAlarms > 3) {
         log.error("CPU alarms limit reached. Restarting");
         process.exit(0);
       }

    });
  }
}

function startCheckCpu() {
  console.log("Starting Check CPU");
  log.info("Starting Check CPU");
  setInterval(CheckCpuLimit, 10000);
}

function startListen() {

  inSock = zmq.socket('xsub');
  inSock.setsockopt(zmq.ZMQ_SNDHWM, 10);  //Tieni in coda solo 10 messaggi.
  inSock.identity = 'xsub'+process.pid;
  inSock.bindSync('tcp://*:'+inSockPort);
  inSock.on('message', handleServerToTablet);
  console.log('Server port bound to :' + inSockPort);


  outSock = zmq.socket('xpub');
  outSock.identity = 'xpub'+process.pid;
  outSock.setsockopt(zmq.ZMQ_SNDHWM, 10);   //Tieni in coda solo 10 messaggi.
  outSock.setsockopt(zmq.ZMQ_LINGER,10000); //Tieni in coda solo per 10 secondi

  outSock.setsockopt(zmq.ZMQ_TCP_KEEPALIVE,1);
  outSock.setsockopt(zmq.ZMQ_TCP_KEEPALIVE_IDLE,600);
  outSock.setsockopt(zmq.ZMQ_TCP_KEEPALIVE_CNT,4);
  outSock.setsockopt(zmq.ZMQ_TCP_KEEPALIVE_INTVL,600);
  if (withZap) {
     outSock.curve_server = 1;
     outSock.curve_secretkey = serverPrivateKey;
     outSock.zap_domain='test';
  }
  outSock.on('message',handleTabletToServer );
  outSock.bindSync('tcp://*:'+outSockPort);
  console.log('Tablet port bound to :' + outSockPort);

}

console.log("ZMQ Forwarder device");
console.log(process.versions, "\n");

if (withZap)
    initZAP();

if (withRRD) {
    initRRD();
    startRRD();
}

if (withProcMonitor) {
  startCheckCpu();
}

if (withCrypto) {

  console.log("Testing crypto: .... ");
  var b1 = new Buffer("   ....If your read this text it works");
  var b2 = encryptBuffer(b1);
  var b3 = decryptBuffer(b2);
  console.log(b3.toString());
}

startListen();


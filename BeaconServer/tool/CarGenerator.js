'use strict';

var cluster =   require('cluster');
var dgram = require('dgram');
var udpClient = dgram.createSocket('udp4');
var zlib = require('zlib');
var gzip = zlib.createGzip();


function random(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function microtime() {
    var hrtime = process.hrtime();
    return ( hrtime[0] * 1000000 + hrtime[1] / 1000 ) / 1000;
}

function sendUdp(message) {
  var buffer = message;

  console.log(buffer);
  if (message instanceof Buffer) buffer = new Buffer(message);
  udpClient.send(buffer,0,buffer.length,7600,'127.0.0.1');
}

function compressString(str) {
   var buffer  = new Buffer(str);
   var compressed = zlib.gzipSync(buffer);

   return compressed;
}



function buildUdpBeacon( plate , longVersion)  {
  var beacon =
      { "keyOn":true,
        "GearStatus":"D",
        "KeyStatus":"ON",
        "VIN": plate,
        "ChHeatFault":true,
        "PackV":77,"Km":0,
        "BrakesOn":false,
        "MotFault":true,
        "BmsFault":true,
        "LcdOn":false,
        "ChStatus":0,
        "MotTempHigh":false,
        "vcuFault":true,
        "KMStatus":false,
        "ReadyOn":true,
        "AccStatus":true,
        "PreChFault":true,
        "PackA":2267,"SOC":84,
        "ChFault":true,
        "MotV":76.5,
        "MotT":26,
        "SDKVer":"V2.1",
        "PPStatus":false,
        "Speed":59.5,
        "PackStatus":"DISCHARGE",
        "KSStatus":false,
        "ChCommStatus":false,
        "VER":"V2.1" ,

      "lon":9.0817,
        "lat":45.4547,
        "GPS":"INT",
        "cputemp":65,
        "on_trip":0,
        "closeEnabled":true,
        "parkEnabled":false,
        "parking":false,
        "charging":false,
        "id_trip":162369,
        "int_lon":9.0817,
        "int_lat":9.0817,
        "int_time":Date.now(),
        "ext_lon":9.0817,
        "ext_lat":9.0817,
        "ext_time":Math.floor(Date.now()/1000)};

   var ext =
      {"fwVer":"V3.1",
       "swVer":"0.88",
       "sdkVer":"",
       "hwVer":"Full Android on TINY4412 tiny4412 JDQ39",
       "gsmVer":" 1575B13SIM5320E",
       "clock":"10/02/2016 23:48:26",
       "IMEI":"861311004339247",
       "SIM_SN":null,"wlsize":0,
       "offLineTrips":1,
       "openTrips":0,
       "Versions":"{\"Service\":17,\"AppName\":\"0.88\",\"AndroidBuild\":\"full_tiny4412-userdebug 4.2.2 JDQ39 eng.root.20150513.163157 test-keys\",\"SDK\":\"Ver1.0.3\",\"AndroidDevice\":\"tiny4412\",\"AppCode\":88}"}

   if (longVersion) {
     for(var prop in ext)
       beacon[prop] =ext[prop];
   }

   var str = JSON.stringify(beacon);
   console.log(str.length, str);
   var cmp = compressString(str);
   console.log(cmp.length, cmp);

   return cmp;

}

function Car(plate) {
  this.plate = plate;
  this.count = 0;
  this.start =  microtime();

}

Car.prototype.run = function() {
    this.count++;
    var time= microtime();
    var msg = this.plate+ ' : ' + this.count + '  ' + (time-this.start);
    console.log(msg);
    sendUdp(buildUdpBeacon(this.plate,false))
    setTimeout(this.run.bind(this), 1000+random(-500,500));
}



if (cluster.isMaster) {
       console.log("Start cluster. Forking...")
       for(var i=0; i<1; i++) {
         cluster.fork();
       }
       cluster.on('exit', function (worker) {
         console.log("Worker %s exited", worker.id);
       })
    } else {
      var cars = []
      var pid = process.pid;
      for (var i=1; i<=4; i++) {
          var o = new Car(i==1?"LITEST":"LITEST"+i);
          o.run();
          cars.push(o);
      }

    }

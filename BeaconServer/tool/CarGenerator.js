'use strict';

const axios = require('axios');

const Utility = require('./utility.js');

var cluster =   require('cluster');
var dgram = require('dgram');
var udpClient = dgram.createSocket('udp4');
var zlib = require('zlib');
var gzip = zlib.createGzip();
var hostPHP = "http://api.localhost.it/api/";
var hostNode = "http://127.0.0.1:8121/";
var hostBeacon = "http://127.0.0.1:7600/";
var countRes = 0;
var countComm = 0;
var countArea = 0;
var countConfig = 0;
var countEvents = 0;
var countTrips = 0;
var countPoi = 0;
var countBeacon = 0;
var countWhitelist = 0;
var countBusiness = 0;


function random(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function microtime() {
    var hrtime = process.hrtime();
    return ( hrtime[0] * 1000000 + hrtime[1] / 1000 ) / 1000;
}

function sendUdp(message) {
  var buffer = message;

  //console.log(buffer);
  if (message instanceof Buffer) buffer = new Buffer(message);
  udpClient.send(buffer,0,buffer.length,7600,'127.0.0.1');
}

function compressString(str) {
   var buffer  = new Buffer(str);
   var compressed = zlib.gzipSync(buffer);

   return compressed;
}



function buildUdpBeacon( plate , longVersion, num)  {
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
        "ext_time":Math.floor(Date.now()/1000),
        "batterySafety":true,
        "noGPS":false};
	switch(num){
		case 1:
			beacon["PPStatus"]=false;
			beacon["charging"]=false;
			beacon["SOC"]=40;
			beacon["lat"]=42.46274;
			beacon["lon"]=10.334823;
			break;
		case 2:
			beacon["PPStatus"]=false;
			beacon["charging"]=false;
			beacon["SOC"]=40;
			beacon["lat"]=45.46274;
			beacon["lon"]=9.20696;
			break;
		case 3:
			beacon["PPStatus"]=true;
			beacon["charging"]=true;
			beacon["SOC"]=100;
			beacon["lat"]=45.46274;
			beacon["lon"]=9.20696;
			break;
		case 4:
			beacon["PPStatus"]=false;
			beacon["charging"]=false;
			beacon["SOC"]=100;
			beacon["lat"]=41.536761;
			beacon["lon"]=10.334823;
			break;
			
		default:
		
			break;
	}
  
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
   //console.log(str.length, str);
   var cmp = compressString(str);
   //console.log(cmp.length, cmp);

   return cmp;

}

function buildHttpBeacon( plate , longVersion, num)  {
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
            "ext_time":Math.floor(Date.now()/1000),
            "batterySafety":true,
            "noGPS":false};
    switch(num){
        case 1:
            beacon["PPStatus"]=false;
            beacon["charging"]=false;
            beacon["SOC"]=40;
            beacon["lat"]=42.46274;
            beacon["lon"]=10.334823;
            break;
        case 2:
            beacon["PPStatus"]=false;
            beacon["charging"]=false;
            beacon["SOC"]=40;
            beacon["lat"]=45.46274;
            beacon["lon"]=9.20696;
            break;
        case 3:
            beacon["PPStatus"]=true;
            beacon["charging"]=true;
            beacon["SOC"]=100;
            beacon["lat"]=45.46274;
            beacon["lon"]=9.20696;
            break;
        case 4:
            beacon["PPStatus"]=false;
            beacon["charging"]=false;
            beacon["SOC"]=100;
            beacon["lat"]=41.536761;
            beacon["lon"]=10.334823;
            break;

        default:

            break;
    }

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

    /*if (longVersion) {
        for(var prop in ext)
            beacon[prop] =ext[prop];
    }*/

    var str = JSON.stringify(beacon);
    //console.log(str.length, str);
    //var cmp = compressString(str);
    //console.log(cmp.length, cmp);

    return str;

}

function Car(plate, num) {
  this.plate = plate;
  this.num = num;
  this.count = 0;
  this.start =  microtime();
  this.trip = false;
    this.tripResponse =0;

}
Car.prototype.sendBeacon = function () {
     var time= microtime();
     var msg = this.plate+ ' : beacon  ' + (time-this.start);
     console.log(msg);
      sendUdp(buildUdpBeacon(this.plate,false, this.num));
  };


Car.prototype.sendHttpBacon = function getWitelist(){

    var time= microtime();
    var msg = this.plate+ ' : http beacon  ' + (time-this.start);
    //console.log(msg);
    axios.get(hostBeacon +'notifies', {
        params: {
            plate: this.plate,
            beaconText: buildHttpBeacon(this.plate,false, this.num)
        }
    })
        .then(response => {
            //console.log(response);
            console.log("beacon " +countBeacon++);
        })
        .catch(error => {
            console.log(error);
        });
};

Car.prototype.getWhitelist = function getWitelist(){

      var time= microtime();
      var msg = this.plate+ ' : whitelist  ' + (time-this.start);
      //console.log(msg);
      axios.get(hostNode +'whitelist2')
          .then(response => {
                  //console.log(response);
              console.log("whitelist " +countWhitelist++);
             })
          .catch(error => {
                  console.log(error);
          });
  };

Car.prototype.getBusiness = function getWitelist(){

    var time= microtime();
    var msg = this.plate+ ' : business  ' + (time-this.start);
    //console.log(msg);
    axios.get( hostNode + 'business-employees')
        .then(response => {
            //console.log(response);
            console.log("business " +countBusiness++);
        })
        .catch(error => {
            console.log(error);
        });
};

Car.prototype.getConfig = function getWitelist(){

    var time= microtime();
    var msg = this.plate+ ' : config  ' + (time-this.start);
    //console.log(msg);
    axios.get(hostNode + 'configs', {
        params: {
            car_plate: this.plate
        }
    })
        .then(response => {
            //console.log(response);
            console.log("config " +countConfig++);
        })
        .catch(error => {
            console.log(error);
        });
};

Car.prototype.getArea = function getWitelist(){

    var time= microtime();
    var msg = this.plate+ ' : area  ' + (time-this.start);
    //console.log(msg);
    axios.get(hostNode + 'area',{//hostPHP +'zone/json.php', {
        params: {
            md5: "wololo"
        }
    }
    )
        .then(response => {
            //console.log(response.data);
            console.log("area " +countArea++);
        })
        .catch(error => {
            console.log(error);
        });
}

Car.prototype.getCommands = function getWitelist(){

    var time= microtime();
    var msg = this.plate+ ' : commands  ' + (time-this.start);
    //console.log(msg);
    axios.get(hostNode + "commands" ,{//hostPHP + 'get_commands.php', {
        params: {
            car_plate: this.plate
        }
    }
    )
        .then(response => {
            //console.log(response.data);
            console.log("commands " +countComm++);
        })
        .catch(error => {
            console.log(error);
        });
};

Car.prototype.sendTrips = function getWitelist(){

    var time= microtime();
    if(!this.trip) {
        this.trip = true;
        //OPEN TRIP
        //cmd=1&id_veicolo=ED06260&id_cliente=4897&ora=1522846781&km=22016&carburante=63&lon=9.168200500000001&lat=45.46190883333334&warning=&pulizia_int=0&pulizia_ext=0&mac=&imei=861311004993399&n_pin=1
        var msg = this.plate+ ' : open trip  ' + (time-this.start);
        //console.log(msg);
        axios.post(hostNode + 'trips', {
                cmd: 1,
                id_veicolo: this.plate,
                id_cliente: 26740,
                ora: new Date().getTime(),
                km: 22016,
                carburante: 61,
                lon: 9.168200500000001,
                lat: 45.46190883333334,
                warning: '',
                pulizia_int: 0,
                pulizia_ext: 0,
                mac: '',
                imei: 861311004993399,
                n_pin: 1,

        })
            .then(response => {
                console.log(response.data);
                console.log("trips open " +countTrips++);
                if(response.data.data.result >0){
                    this.tripResponse = response.data.data.result;
                }else{

                    this.tripResponse = response.data.data.extra;
                }
            })
            .catch(error => {
                console.log(error);
            });
    } else {
        this.trip = false;
        //CLOSE TRIP
        //cmd=2&id=2615002&id_veicolo=ED06260&id_cliente=26747&ora=1518639666&km=22016&carburante=95&lon=9.223741166666667&lat=45.50886333333333&warning=&pulizia_int=0&pulizia_ext=0&park_seconds=0&n_pin=0
        var msg = this.plate+ ' : close trip  ' + (time-this.start);
        //console.log(msg);
        axios.post(hostNode + 'trips', {
                cmd: 2,
                id: this.tripResponse,
                id_veicolo: this.plate,
                id_cliente: 26740,
                ora: new Date().getTime(),
                km: 22016,
                carburante: 61,
                lon: 9.168200500000001,
                lat: 45.46190883333334,
                warning: '',
                pulizia_int: 0,
                pulizia_ext: 0,
                park_seconds: 0,
                n_pin: 1,
            })
            .then(response => {
                //console.log(response.data);
                console.log("trips close " +countTrips++);
                this.tripResponse = 0;
            })
            .catch(error => {
                this.tripResponse = 0;
                console.log(error);
            });
    }
};

Car.prototype.sendEvents = function getWitelist(){

    var time= microtime();
    var msg = this.plate+ ' : events  ' + (time-this.start);
    //console.log(msg);
    axios.post(hostNode +"events",
        Utility.generateRandomEvents(this)
    )
        .then(response => {
            console.log(response.data);
            // console.log("events " +countEvents++);
        })
        .catch(error => {
            console.log(error);
        });
};

Car.prototype.getReservations = function getWitelist(){

    var time= microtime();
    var msg = this.plate+ ' : reservations  ' + (time-this.start);
    //console.log(msg);
    axios.get(hostNode + "reservation",{//hostPHP + 'get_reservations.php', {
        params: {
            car_plate: this.plate
        }
    }
    )
        .then(response => {

           console.log("reservations " + countRes++);
        })
        .catch(error => {
            console.log(error);
        });
};

Car.prototype.getPois = function getWitelist(){

    var time= microtime();
    var msg = this.plate+ ' : pois  ' + (time-this.start);
    //console.log(msg);
    axios.get(hostNode + 'pois', {
        params: {
            lastupdate: 0
        }
    })
        .then(response => {
            //console.log(response.data);
            console.log("poi " +countPoi++);
        })
        .catch(error => {
            console.log(error);
        });
};

Car.prototype.run = function() {
    this.count++;
    var time= microtime();
    var msg = this.plate+ ' : ' + this.count + '  ' + (time-this.start);
    console.log(msg);
     // setTimeout(()=>setInterval(this.sendHttpBacon.bind(this),      1*10*1000),random(0,1*10*1000)); //limite su VM 2 sec
     // setTimeout(()=>setInterval(this.getWhitelist.bind(this),       1*10*1000),random(0,1*10*1000)); // impatto alto se richiede sempre tutti i dati
     // setTimeout(()=>setInterval(this.getBusiness.bind(this),        1*10*1000),random(0,1*10*1000)); // praticamente nessun impatto sul load //dopo un po porta il load a 1.2
     // setTimeout(()=>setInterval(this.getConfig.bind(this),          1*10*1000),random(0,1*10*1000)); //impatto minimo
     // setTimeout(()=>setInterval(this.getArea.bind(this),            1*10*1000),random(0,1*10*1000)); //alto impatto carico aumenta fino a 5 fermo
     // setTimeout(()=>setInterval(this.getCommands.bind(this),        1*10*1000),random(0,1*10*1000)); //alto impatto carico arriva fino a troppo 10 e lag sul pc
      setTimeout(()=>setInterval(this.sendTrips.bind(this),          1*10*1000),random(0,1*10*1000)); //impatto medio, sinceramente pensavo peggo, dopo un po' è arrivato a 4 di load comunque continua a salire
     //setTimeout(()=>setInterval(this.sendEvents.bind(this),         1*10*1000),random(0,1*10*1000)); // basso impatto , ho provato con l'invio di un evento che non scrive su pg carico 0.2 abbastanza stabile
     // setTimeout(()=>setInterval(this.getReservations.bind(this),    1*10*1000),random(0,1*10*1000)); //ogni 2 sec con pm2 load 0.30
     // setTimeout(()=>setInterval(this.getPois.bind(this),            1*10*1000),random(0,1*10*1000));
};



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
      for (var i=1; i<=1; i++) {
          var car = new Car(i===1?"LITEST":"LITEST"+i,i);
          car.run();
          cars.push(car);
      }

    }

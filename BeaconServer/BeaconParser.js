// Configurations
var globalConfig = require('../config/globalConfig');
var logPath = globalConfig.logPath;

var merge = require('merge');
var async = require('async');
var pg = require('pg');
require('pg-spice').patch(pg);
var MongoClient = require('mongodb').MongoClient;
var extend = require('util')._extend;


var bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: "bparser",
  streams: [{ path : logPath + 'BeaconParser.log' , level : 'info' },
            { path : logPath + 'BeaconParser.log' , level : 'debug' },
            { path : logPath + 'BeaconParser.log' , level : 'warning' },
            { path : logPath + 'BeaconParser.log' , level : 'error' }
  ],
  serializers: bunyan.stdSerializers
});


var cstr = '';
var mongoUrl = globalConfig.mongoUrl;
var beaconid = 0;

function getTemplate() {
   var  objTemplate = {
    VIN : 'nd',
    Km : 0,
    SOC: 0,
    lon : 0,
    lat : 0,
    on_trip : false,
    ChargeCommStatus : false,
    id_trip : 0,
    cputemp : 0,
    uptime : 0,
    IMEI : null,
    Speed : 0,
    gspeed : 0,
    KeyStatus : null,
    id_trip : 0,
    gps_info : null,
    detail : null
  };

  return objTemplate;
}


function getTemplateMongo() {
   var  objTemplateMongo = {
    VIN : 'nd',
    SOC: 0,
    ext_time : 0,
    ext_lon : 0.0,
    ext_lat : 0.0,
    int_time : 0,
    int_lon : 0.0,
    int_lat : 0.0,
    on_trip : false,
    id_trip : 0,
    KeyStatus : null,
	HbVer : 'nd',
	swVer : 'nd',
	log_tx_time : new Date(0),
	charging : false,
	GPS : 'ND',
	PPStatus : false,
	ReadyOn : false,
	batterySafety : true,
	offLineTrips : 0,
	parking : false,
    SIM_SN : "",
    noGPS:false,
	PackV : 0
  };

  return objTemplateMongo;
}


function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.init = function(connstr) {
   cstr = connstr;
}

exports.process = function (json,job,done) {

  //Ugly temp patch
  if (!IsJsonString(json)) {
    json += '"}';
  }

   var objJson;
   try {
    objJson = JSON.parse(json);
   } catch (e) {
     console.error("JSON PARSE ERROR:",e,json);
     log.error("JSON PARSE ERROR:",e,json);
     return null;
   }

   beaconid++;

   //console.log(JSON.stringify(objTemplate));
   objTemplate = getTemplate();
   objTemplate.VIN = job.data.sender;
   var obj =  merge(objTemplate,objJson);

   

   obj.json = json;
   obj.Speed =  Math.floor(obj.Speed);

   if (obj.gps_info!=null) {
       if (!IsJsonString(obj.gps_info)) {
           console.log("Invalid gps_info JSON: " + obj.gps_info);
           log.error("Invalid gps_info JSON: " + obj.gps_info);
           obj.gps_info = null;
       }
   }

   if (obj.detail!=null) {
       if (!IsJsonString(obj.detail)) {
           console.log("Invalid detail JSON: " + obj.detail);
           log.error("Invalid detail JSON: " + obj.detail);
           obj.detail = null;
       }
   }

/*
    $i2c  = isset ($data['i2c']) ? $data['i2c'] : null;
        $uptime = isset ($data['uptime']) ? $data['uptime'] : 0;
        $chiudibile = isset ($data['chiudibile']) ? ($data['chiudibile']?1:0) : 1;
        $parkenabled = isset($data['parkenabled']) ? ($data['parkenabled']?1:0) : 1;
		$gspeed = round($gspeed);
        $gps_info = isset($data['gps_info'])?$data['gps_info']:NULL;
*/

   targa = obj.id;

   if (job)  job.log("Begin async");

   async.parallel(
      [
         function(callback) {
            if (job)  job.log("Begin updateCar");
            updateCar(callback,obj,beaconid,job);
         },
         function(callback) {
           updateCarInfo(callback,obj,beaconid,job);
         } ,
/*
         function(callback) {
            if (job)  job.log("Begin writeLog");
            writeLog(callback,obj,beaconid,job);
         },
*/
         function(callback) {
            if (job)  job.log("Begin writeMongoLog");
           writeMongoLog(callback,obj,beaconid,job);
         }
      ],
      function(err, result) {
        if (job) {
            job.log("End Async");
            console.log("++End Async JOB " + job.id);
        }
        if (done)
            done();


        if (err) {
            console.error("Async.parallel:",err);
            log.error("Async.parallel:",err);
        } else {
          console.log(result);
          log.debug(result);
        }

      });

   return targa;

}


function pgExecute(callback,sql,obj,job) {

   pg.connect(cstr, function (err, client, done) {

         if (err) {
            console.error('Connect error', err);
            callback(new Error('Connect error :' + err))
            return;
         }

         if (job)  job.log("UpdateCar connect");

         var query = client.query(sql, obj, function(err, result) {
               if (err) {
                  console.error('Update car error: ', err ,sql,obj);
                  log.error(obj.VIN,'Update car error: ', err, sql,obj);
                  done(client)
                  callback(new Error(obj.VIN ,'Update car error:' + err))
                  return;
               }
            });
         if (query)
           query.on('end', function(result) {
                 if (job)  job.log("UpdateCar done");
                 done(client);
                 console.log(obj.VIN,'Update car completed:' + result.rowCount); // +"\n" + sql + "\n" + JSON.stringify(obj));
                 log.debug(obj.VIN,'Update car completed:' + result.rowCount);
                 callback(null,'Update car ' + obj.VIN);
              });


      });
}


function updateCarInfo(callback,obj,id,job) {

  if (!obj.hasOwnProperty('IMEI'))  {
      log.debug(obj.VIN,'UpdateCarInfo skipped');
      callback(null,'UpdateCarInfo skipped: ' + obj.VIN);
      return;
  }

  if (!obj.IMEI || obj.IMEI.length==0) {
      log.debug(obj.VIN,'UpdateCarInfo skipped2');
      callback(null,'UpdateCarInfo skipped2: ' + obj.VIN);
      return;
  }


  var fields="";



   if (obj.hasOwnProperty('Versions')) {
     try {
       var vers = JSON.parse(obj.Versions);
       obj = merge(obj,vers);
     } catch( e) {}
   }

   if (obj.hasOwnProperty('ext_lon') &&  obj.hasOwnProperty('ext_lat') ) {
       fields += ', gprs_lon = :ext_lon , gprs_lat = :ext_lat , gprs_geo = ST_SetSRID(ST_MakePoint(:ext_lon,:ext_lat),4326) ';
   } else if (obj.hasOwnProperty('GPSBOX')) {
     try {
       var gps = JSON.parse(obj.GPSBOX);
       obj.gprs_lon = gps.lon;
       obj.gprs_lat = gps.lat;

       if (gps.hasOwnProperty('lon') && gps.hasOwnProperty('lat') && gps.lon && gps.lat)
         fields += ', gprs_lon = cast(:gprs_lon as numeric) , gprs_lat =cast(:gprs_lat as numeric) , gprs_geo = ST_SetSRID(ST_MakePoint(:gprs_lon,:gprs_lat),4326) ';
       else
         fields += ', gprs_lon = 0 , gprs_lat = 0 , gprs_geo = ST_SetSRID(ST_MakePoint(0,0),4326) ';

     } catch(e) { fields += ', gprs_lon = 0 , gprs_lat 0 , gprs_geo = ST_SetSRID(ST_MakePoint(0,0),4326) '; }

   } else {
     fields += ', gprs_lon = 0 , gprs_lat = 0 , gprs_geo = ST_SetSRID(ST_MakePoint(0,0),4326) ';
   }


    if (obj.hasOwnProperty('int_lon') && obj.hasOwnProperty('int_lat') && obj.lon && obj.lat)
        fields += ', int_lon = cast(:int_lon as numeric) , int_lat =cast(:int_lat as numeric) , int_geo = ST_SetSRID(ST_MakePoint(:int_lon,:int_lat),4326) ';
    else
        fields += ', int_lon = 0 , int_lat =0 , int_geo = ST_SetSRID(ST_MakePoint(0,0),4326) ';


   if (obj.hasOwnProperty('fwVer'))
       fields +=", fw_ver=:fwVer ";
   else
       fields +=", fw_ver=NULL ";


   if (obj.hasOwnProperty('hwVer'))
       fields +=", hw_ver=:hwVer ";
   else
       fields +=", hw_ver=NULL ";

   if (obj.hasOwnProperty('swVer'))
       fields +=", sw_ver=:swVer ";
   else
       fields +=", sw_ver=NULL ";


   if (obj.hasOwnProperty('SDK'))
       fields +=", sdk=:SDK ";
   else
       fields +=", sdk=NULL ";


   if (obj.hasOwnProperty('sdkVer'))
       fields +=", sdk_ver=:sdkVer ";
   else
       fields +=", sdk_ver=NULL ";


   if (obj.hasOwnProperty('gsmVer'))
       fields +=", gsm_ver=:gsmVer ";
   else
       fields +=", gsm_ver=NULL ";


   if (obj.hasOwnProperty('AndroidDevice'))
       fields +=", android_device=:AndroidDevice ";
   else
       fields +=", android_device=NULL ";


   if (obj.hasOwnProperty('AndroidBuild'))
       fields +=", android_build=:AndroidBuild ";
   else
       fields +=", android_build=NULL ";

    if (obj.hasOwnProperty('SIM_SN') && obj.SIM_SN !== "" && obj.SIM_SN !==null)
        fields +=", android_iccid=:SIM_SN ";


   if (obj.hasOwnProperty('TBoxSw')) {
       fields += ", tbox_sw=:TBoxSw ";
       try{
          var arr =  obj.TBoxSw.split("-");
          if(typeof arr[arr.length - 1]!=="undefined"){
              var clean = arr[arr.length - 1].split("\r");
              if(clean[0]!= "") {
                  obj.gprs_iccid = clean[0];
                  fields += ", gprs_iccid=:gprs_iccid ";
              }
          }
       }catch(e){

       }
   }



   if (obj.hasOwnProperty('TBoxHw'))
       fields +=", tbox_hw=:TBoxHw ";
   else
       fields +=", tbox_hw=NULL ";


   if (obj.hasOwnProperty('MCUModel'))
       fields +=", mcu_model=:MCUModel ";
   else
       fields +=", mcu_model=NULL ";


   if (obj.hasOwnProperty('MCU'))
       fields +=", mcu=:MCU ";
   else
       fields +=", mcu=NULL ";


   if (obj.hasOwnProperty('HwVersion'))
       fields +=", hw_version=:HwVersion ";
   else
       fields +=", hw_version=NULL ";


   if (obj.hasOwnProperty('HbVer'))
       fields +=", hb_ver=:HbVer ";
   else
       fields +=", hb_ver=NULL ";


   if (obj.hasOwnProperty('VehicleType'))
       fields +=", vehicle_type=:VehicleType ";
   else
       fields +=", vehicle_type=NULL ";

   if (obj.hasOwnProperty('GPS'))
        fields += ", gps=:GPS ";
   else
        fields += ", gps=NULL";


   var sql = "UPDATE cars_info SET lastupdate=now() " + fields + " WHERE car_plate = :VIN";

   log.debug(obj.VIN, obj.IMEI , sql);

   pgExecute(callback,sql,obj,job);

}


function updateCar(callback,obj,id,job) {
   log.debug(obj.VIN, id, "Begin updateCar");

   var sql2 = '';
   var fields = 'last_contact = now() , soc=cast(:SOC as integer),  speed = cast(:Speed as integer),  battery= cast(:SOC as integer) + battery_offset, km = :Km, busy=:on_trip ';


   if (obj.hasOwnProperty('parking'))
      fields += ", parking = :parking ";

   if (obj.hasOwnProperty('parkEnabled'))
      fields += ", park_enabled = :parkEnabled ";

  if (obj.hasOwnProperty('batterySafety'))
      fields += ", battery_safety = :batterySafety ";

   if (obj.hasOwnProperty('ReadyOn'))
       fields += ", running = :ReadyOn";

   if (obj.hasOwnProperty('IMEI') && obj.IMEI!=null)     {
       fields +=", imei=:IMEI ";
       //sql2 = updateCarInfo(obj);
   }


   if (obj.hasOwnProperty('fwVer'))
       fields +=", firmware_version=:fwVer ";

   if (obj.hasOwnProperty('swVer'))
       fields +=", software_version=:swVer ";

   if (obj.hasOwnProperty('wlsize'))
       fields +=", obc_wl_size=:wlsize ";

   if (obj.hasOwnProperty('charging'))
       fields +=", charging=:charging ";

   if (obj.hasOwnProperty('KeyStatus'))
        fields +=', key_status=:KeyStatus ';

   if (obj.hasOwnProperty('lon') && obj.hasOwnProperty('lat') && obj.lon && obj.lat && obj.lon != 0 && obj.lat != 0)
        fields += ',last_location_time = now() , longitude = cast(:lon as numeric) , latitude =cast(:lat as numeric) , location = ST_SetSRID(ST_MakePoint(:lon,:lat),4326) ';

   if (obj.hasOwnProperty('gps_info') && obj.gps_info!=null)
        fields += ', gps_data=:gps_info';

   if (obj.hasOwnProperty('PPStatus'))
        fields += ', plug=:PPStatus';
    
   if (obj.hasOwnProperty('noGPS'))
        fields +=", nogps=:noGPS ";


   var sql = "UPDATE cars SET " + fields + " WHERE plate =:VIN;" + sql2;



   if (obj.VIN == 'CSDEMO01') {
      //console.log(obj);
      //console.log(sql);
   }

   pgExecute(callback,sql,obj,job);


}


function writeLog(callback,obj,id,job) {
   log.debug(obj.VIN, id, "Begin writelog");

   var fields='log_time,car_plate,km,battery,speed,on_trip,on_charge,id_trip,cputemp,lat,lon,geo,uptime';
   var values='now(), :VIN, :Km, cast(:SOC as integer), cast(:Speed as integer), :on_trip, :ChargeCommStatus,  :id_trip, :cputemp, cast(:lat as numeric), cast(:lon as numeric), ST_SetSRID(ST_MakePoint(:lon,:lat),4326), :uptime';

   if (obj.keyOn) {
     fields += ',key_status ';
     values += ',:keyOn ';
   }

   if (obj.IMEI ) {
     fields += ',imei ';
     values += ',:IMEI ';
   }

   if (obj.gps_info ) {
     fields += ',gps_info ';
     values += ',:gps_info ';
   }

   if (obj.json ) {
     fields += ',detail ';
     values += ',:json ';
   }

   var sql = "INSERT INTO logs ("+fields+") VALUES  ("+values+")";


   pg.connect(cstr, function (err, client, done) {
         if (err) {
            console.error('PG connect error', err);
            callback(new Error(obj.VIN ,'PG Connect error :' + err))
            return;
         }
         if (job)  job.log("WriteLog connect");
         var query = client.query(sql, obj, function(err, result) {
               if (err) {
                  console.error('Insert logs error: ', err);
                  log.error('Insert logs error: ', err);
                  callback(new Error(obj.VIN ,'Insert logs error:' + err))
                  done(client)
                  return;
               }
            });

         query.on('end', function(result) {
               if (job)  job.log("WriteLog done");
               done(client);
               console.log(obj.VIN,'Insert log completed:' + result.rowCount);
               log.debug(obj.VIN,id,'Insert log  completed:' + result.rowCount);
               callback(null,'Insert log  completed: ' + obj.VIN);
            });


      });
}


function writeMongoLog(callback,obj,id,job) {

        log.debug(obj.VIN, id, "Begin mongo writelog");
        
        MongoClient.connect(mongoUrl, function(err, db) {
          if (err) {
            console.error(obj.VIN,'Mongo connect error',err)
            log.error(obj.VIN,id,'Mongo connect error',err);
            callback(new Error(obj.VIN ,'Mongo connect error:' + err))
            return;
          }

		 var lightObj = fillTemplate(getTemplateMongo(), obj);
		 
          lightObj.log_time =  new Date();
         var logs = db.collection('logs');

         if (job)  job.log("WriteMongoLog connect");


         logs.insert(lightObj , function(err,result) {
            db.close();
             if (err) {
               console.error(obj.VIN,'Mongo insert error',err)
               log.error(obj.VIN,id,'Mongo insert error',err);
               callback(new Error(obj.VIN ,'Insert logs error:' + err))
             } else {
               if (job)  job.log("WriteMongoLog done");
               console.log(obj.VIN,"Mongo insert completed:" + result.result.n);
               log.debug(obj.VIN,id,"Mongo insert completed:" + result.result.n);
               callback(null,'Mongo insert completed:' + obj.VIN);
             }

          });


        });

}


function fillTemplate(template, obj){
	//var keys = Object.getOwnPropertyNames(template);
	for (var key in obj) {
		if(template[key]!==undefined)
			template[key] = obj[key];
	}
	return template
}

















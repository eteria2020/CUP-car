var crypto = require('crypto');
var request = require('request');

var MongoClient = require('mongodb').MongoClient;

var _require = require('pg'),
    Pool = _require.Pool,
    Client = _require.Client;

var Utility = require('./utility.js')();
var parse = require('pg-connection-string').parse;

module.exports = init


function init (opt) {

     // optional params
     opt = opt || {};

     var log = opt.log;
     var pg  = opt.pg;
     var conString = opt.conString;
     var validator = opt.validator;
     const mongoUrl = opt.mongoUrl;

     return {
/* GET */

	/**
	 * get user details
	 * @param  array   req  request
	 * @param  array   res  response
	 * @param  function next handler
	 */
	getAdmins: function(req, res, next) {

		//if(sanitizeInput(req,res)){
          //sendOutJSON(res,200,"OK",null);
          pg.connect(conString, function(err, client, done) {

                if (pgError(err,client)) {
                   responseError(res,err);
                   return next(false);
                }

		        var query = '',params = [];

		        query = "SELECT id,card_code FROM customers WHERE card_code is not null AND maintainer = true AND NOT card_code like 'RF%' ";

		        client.query(
		        	query,
		        	params,
		        	function(err, result) {
  		        	    if (pgError(err,client)) {
                            responseError(res,err);
  		        	    } else {
    			            done();
    			            var outJson = [];
    			            logError(err,err);
    			            if((typeof result !== 'undefined') ){
    			            	result.rows.forEach(function(r) { outJson.push({ id: r.id , card: r.card_code})});
    			            }
                            res.header('content-type', 'application/json');
                            res.send(200,outJson);
    			            //sendOutJSON(res,200,outTxt,outJson);
                        }
		        	}
		        );
		    });
		//}
	    return next();
	},

	 /**
      * get pois
      * @param  array   req  request
      * @param  array   res  response
      * @param  function next handler
      */
     getReservation: function(req, res, next) {
         next();
         if(Utility.validateReservation(req,res)){
             pg.connect(conString, function(err, client, done) {

                 if (pgError(err, client)) {
                     responseError(res, err);
                     return;// next(false);
                 }


                 if (typeof req.params.consumed === 'undefined') {


                     query = "SELECT  id, cards , extract(epoch from beginning_ts) as time,  length  , active " +
                         "FROM reservations " +
                         "WHERE  car_plate = $1";

                     var params = [req.params.car_plate];
                     var resId = [];

                     client.query(
                         query,
                         params,
                         function (err, result) {
                             if (pgError(err, client)) {
                                 responseError(res, err);
                             } else {
                                 if ((typeof result !== 'undefined')) {
                                     //outJson = JSON.stringify(result.rows);
                                 }
                                 //log.d(result.rows);
                                 sendOutJSON(res,200,null,result.rows);
                                 if (result.rows.length > 0 && result.rows[0].id > 0) {
                                     resId = [result.rows[0].id];

                                     var query2 = "UPDATE reservations SET to_send = FALSE , sent_ts = now() WHERE id= $1 AND to_send = TRUE";
                                     client.query(
                                         query2,
                                         resId,
                                         function (err, result) {
                                             done();
                                             if (pgError(err, client)) {
                                                 //responseError(res, err);
                                             } else {

                                                 //log.d("query2 done" + resId.length);
                                                 /*if ((typeof result !== 'undefined')) {
                                                     //outJson = JSON.stringify(result.rows);
                                                 }
                                                 res.send(200, result.rows);*/
                                             }
                                         }
                                     );
                                 }
                                 done();
                             }
                         }
                     );

                 }else{

                     query = "UPDATE reservations SET consumed_ts = now() , active = false WHERE id = $1 RETURNING  id, cards , extract(epoch from beginning_ts) as time,  length  , active ";

                     var params = [req.params.consumed];
                     var resId = [];

                     client.query(
                         query,
                         params,
                         function (err, result) {
                             if (pgError(err, client)) {
                                 responseError(res, err);
                             } else {
                                 if ((typeof result !== 'undefined')) {
                                     //outJson = JSON.stringify(result.rows);
                                 }
                                 //log.d(result.rows);
                                 //res.send(result.rows);
                                 sendOutJSON(res, 200, null, result.rows[0]);

                                 done();
                             }
                         }
                     );

                 }


             });
         }
         //return next();
     },

     /**
      * get Commands
      * @param  array   req  request
      * @param  array   res  response
      * @param  function next handler
      */
     getCommands: function(req, res, next) {
             next();
             if(Utility.validateCommands(req,res)){
                 pg.connect(conString, function(err, client, done) {

                     if (pgError(err, client)) {
                         responseError(res, err);
                         return;// next(false);
                     }
                     query = "UPDATE commands SET to_send = false WHERE car_plate = $1 and to_send = true RETURNING id, command , intarg1, intarg2, txtarg1, txtarg2, extract(epoch from queued) as queued, ttl, payload";


                     var params = [req.params.car_plate];

                     client.query(
                         query,
                         params,
                         function (err, result) {
                             done();
                             if (pgError(err, client)) {
                                 responseError(res, err);
                             } else {
                                 if ((typeof result !== 'undefined')) {
                                     //outJson = JSON.stringify(result.rows);
                                 }
                                 //log.d(result.rows);
                                 sendOutJSON(res,200,null,result.rows);//res.send(result.rows);

                             }
                         }
                     );

                 });
             }
             //return next();
         },

     /**
      * get Events
      * @param  array   req  request
      * @param  array   res  response
      * @param  function next handler
      */
     postEvents: function(req, res, next) {
         next();
         if(Utility.validateEvents(req,res)){
         //Begin write MongoLog
             var  event = Utility.fillTemplate(Utility.getTemplateMongoEvent(), req.params);
             event.event_time = new Date(event.event_time);
             event.server_time  = new Date();
             event.geo = {};
             event.geo.type='Point';
             event.geo.coordinates= [parseFloat(event.lon), parseFloat(event.lat)];

             var response = {
                 result: 0
             };
             //console.log(event);

             MongoClient.connect(mongoUrl, function(err, db) {
                 if (err) {
                     console.error(req.params.car_plate,'Mongo connect error',err);
                     response.result = -10;
                     sendOutJSON(res,400,null,response);
                     return;
                 }


                 var events = db.collection('events');


                 events.insertOne(event , function(err,result) {
                     db.close();
                     if (err) {
                         console.error(event.car_plate,'Mongo insert error',err)
                         log.error(event.car_plate,'Mongo insert error',err);
                         response.result = -11;
                         sendOutJSON(res,400,null,response);
                     } else {
                         console.log(event.car_plate,"Mongo insert completed:" + result.result.n);

                         response.result = 1;
                         sendOutJSON(res,200,null,response);
                     }

                 });


             });

             var query;

             var params
             switch (event.label){
                 case "CHARGE":
                    query = "UPDATE cars SET charging = $1 , plug = TRUE WHERE plate = $2";
                    params = [event.intval === 1, event.car_plate];
                     break;
                 case "SW_BOOT":
                     query = "INSERT INTO commands (car_plate,command,txtarg1, queued,to_send) VALUES ($1,'SET_DAMAGES', (select damages FROM cars WHERE plate=$1) , now(),TRUE);";
                     params = [event.car_plate];
                     break;
                 case "SELFCLOSE":
                    if(event.txtval === "NOPAY") { //TODO add check for TripPayments
                        query = "UPDATE trips SET payable = FALSE WHERE id = $1";
                        params = [event.trip_id];
                    }
                     break;
                 case "CLEANLINESS":
                     query = "UPDATE cars SET int_cleanliness = $1 , ext_cleanliness = $2 WHERE plate=$3";

                     var values = Utility.getCleanliness(event.txtval);
                     params = [values[0], values[1], event.car_plate];
                     break;
                 case "SOS":
                     query = "INSERT INTO messages_outbox  (destination,type,subject,submitted,meta) VALUES ('support','SOS','SOS call',now(),$1)";
                     params = [JSON.stringify(event)];
                     if(event.intval == 3) {
                         setTimeout(function () { //first try
                             getIncidentDetail(event, function (err) {

                                 if (err) {
                                     setTimeout(function () { //second try
                                         getIncidentDetail(event, function () {
                                             if (err) {
                                                 console.error("Unable to retrieve incident details");
                                             }
                                         })
                                     }, 1 * 10 * 1000)
                                 }
                             })

                         }, 1 * 10 * 1000);
                     }
                     break;
                 case "SHUTDOWN":
                 case "CAN_ANOMALIES":
                     query = "INSERT INTO events (event_time,server_time,car_plate, event_id, label, customer_id, trip_id, intval, txtval, lon,lat, geo ,km,battery,imei,data) " +
                         "VALUES ($1,now(),$2,$3,$4,$5, $6, $7, $8, cast($9 as numeric),cast($10 as numeric), ST_SetSRID(ST_MakePoint($9,$10),4326), $11, $12, $13, $14) RETURNING id";
                     params = [event.event_time, event.car_plate, event.event_id, event.label, event.customer_id, event.trip_id, event.intval, event.txtval, event.lon, event.lat, event.km, event.battery, event.imei, event.data];
                     break;
             }


             pg.connect(conString, function(err, client, done) {

             if (pgError(err, client)) {
                 responseError(res, err);
                 return;// next(false);
             }

             client.query(
                 query,
                 params,
                 function (err, result) {
                     done();
                     if (err) {
                         logError(err,err.stack);
                     } else {
                         if ((typeof result !== 'undefined')) {
                             //outJson = JSON.stringify(result.rows);
                         }
                         //log.d(result.rows);

                         //sendOutJSON(res,200,null,null);

                     }
                 }
             );

         });
         }
         //return next();
     },

     /**
      * get Events
      * @param  array   req  request
      * @param  array   res  response
      * @param  function next handler
      */
     postTrips: function(req, res, next) {
         next();
         //sendOutJSON(res,200,null,"ciao")
         if (Utility.validateTrips(req, res)) {

             console.log(req.params);
             //Begin write MongoLog
             var trip = Utility.fillTemplate(Utility.getTemplateTrip(), req.params);
             if(trip.ora<=100000000000)
                 trip.ora = trip.ora *1000;
             trip.ora = new Date(trip.ora);
             getAddressFromCoordinates(trip, function (address) {
                 switch (trip.cmd) {
                     case 0:
                         //info
                         getTripInfo(trip, function (resp) {
                             //Handle error response
                             var reason = 'No trip found';
                             if (resp.length > 0) reason = 'Found Trip';

                             sendOutJSON(res, 200, reason, resp);
                         });
                         break;
                     case 1:
                         trip.address_beginning = address;
                         //OPEN TRIP
                         openTrip(trip, function (resp) {
                             sendOutJSON(res, 200, null, resp);
                         });

                         break;
                     case 2:
                         //CLOSE TRIP
                         trip.address_end = address;

                         closeTrip(trip, function (resp) {
                             sendOutJSON(res, 200, null, resp);
                         });
                         //check if exist trip with id, car and customer
                         //check if exist trip close with id to update data
                         //update trips to set close
                         //check if exist business trip
                         //if payment type is null set trips not payable
                         break;
                     default:
                         sendOutJSON(res,400,'Invalid Trips parameters',null);
                         break;
                 }
             });

             //commit transaction

         }
         //return next();
     },


     /**
      * get Area
      * @param  array   req  request
      * @param  array   res  response
      * @param  function next handler
      */
     getArea: function(req, res, next) {
             //if(sanitizeInput(req,res)){
             next();
             pg.connect(conString, function(err, client, done) {

                 if (pgError(err, client)) {
                     responseError(res, err);
                     return;// next(false);
                 }
                 filter = 'AND zone.active=true';


                 flotta =1;

                 query = "SELECT close_trip,0 as costo_apertura,0 as costo_chiusura,name,ST_NPoints(area_use) as npunti, St_asText(area_use) as dump FROM  zone_groups  INNER JOIN zone ON zone.id = ANY(zone_groups.id_zone) WHERE fleet_id=$1 " + filter;



                 var params = [flotta];

                 client.query(
                     query,
                     params,
                     function (err, result) {
                     	done();
                         if (pgError(err, client)) {
                             responseError(res, err);
                         } else {
                         	var response = [];

                         	result.rows.forEach(function (row) {
                         		var jp = {};

                         		if(typeof row.is_chiusura_permessa === 'undefined')
                         			jp.close_trip = null;
                         		else
                                	jp.close_trip=row.is_chiusura_permessa;
                                jp.costo_apertura=row.costo_apertura;
                                jp.costo_chiusura=row.costo_chiusura;
                                jp.coordinates = [];
                                str = row.dump.substring(9, row.dump.length);
                                points = str.split(",");
                                points.forEach(function (point){
                                    c = point.split(" ");
                                    if (c[0]!=0 && c[1]!=0) {
                                    	var lenght0 = Math.abs(Math.trunc(parseFloat(c[0]))).toString().length;
                                        var lenght1 = Math.abs(Math.trunc(parseFloat(c[1]))).toString().length;
                                        jp.coordinates.push(Number(parseFloat(c[0]).toFixed(14 - lenght0).toString()));
                                        jp.coordinates.push(Number(parseFloat(c[1]).toFixed(14 - lenght1).toString()));
                                        jp.coordinates.push(0);
                                    }

                                })
                                response.push(jp);
                            });


                             //log.d(result.rows); 74f32a02de71c80c304832112aa90783
                             json_md5 = crypto.createHash('md5').update(JSON.stringify(response)).digest("hex"); //Hash(response, {algorithm: 'md5',encoding: 'hex'});

                             if (typeof req.params.md5 !== 'undefined' && req.params.md5!==null && req.params.md5!==json_md5) {
                                 sendOutJSON(res,200,null,response)
                             }else {
                                 sendOutJSON(res,200,null,[])
                             }

                         }
                     }
                 );

             });
             //}
             //return next();
         },


	/**
	 * get pois
	 * @param  array   req  request
	 * @param  array   res  response
	 * @param  function next handler
	 */
	getConfigs: function(req, res, next) {
        next();
			pg.connect(conString, function(err, client, done) {

                if (pgError(err,client)) {
                   responseError(res,err);
                   return ;//next(false);
                }

                var query = " SELECT * FROM cars_configurations " +
                        " WHERE car_plate=$1 OR fleet_id= (SELECT fleet_id FROM cars WHERE plate=$1) " +
                        " OR (fleet_id is null AND model is null AND car_plate is null) " +
                        " ORDER BY key, car_plate DESC , model DESC, fleet_id DESC ";

                var auth = localParseAuth(req);

                var params = [];
                if(typeof  req.params.car_plate === 'undefined')
                    params = [auth.username];
                else
                    params = [req.params.car_plate];


			client.query(
		        	query,
		        	params,
		        	function(err, result) {
                        if (pgError(err,client)) {
                            responseError(res,err);
  		        	    } else {
    			            done();
                            var configs = {};
    			            if((typeof result !== 'undefined')){
    			                for(i=0;i<result.rows.length; i++) {
    			                  //configs.set(result.rows[i].key, result.rows[i].value);
                                  configs[result.rows[i].key] = result.rows[i].value;
    			                }
    			            }
    			            res.send(200,configs);
                        }
		        	}
		        );
		    });

	},


     /**
      * get pois
      * @param  array   req  request
      * @param  array   res  response
      * @param  function next handler
      */
     getConfigsNew: function(req, res, next) {
             next();
             if(Utility.validateConfig(req,res)){
                 pg.connect(conString, function(err, client, done) {

                     if (pgError(err,client)) {
                         responseError(res,err);
                         return ;//next(false);
                     }

                     var query = " SELECT * FROM cars_configurations " +
                         " WHERE car_plate=$1 OR fleet_id= (SELECT fleet_id FROM cars WHERE plate=$1) " +
                         " OR (fleet_id is null AND model is null AND car_plate is null) " +
                         " ORDER BY key, car_plate DESC , model DESC, fleet_id DESC ";

                     var params = [req.params.car_plate];

                     client.query(
                         query,
                         params,
                         function(err, result) {
                             if (pgError(err,client)) {
                                 responseError(res,err);
                             } else {
                                 done();
                                 var configs = {};
                                 if((typeof result !== 'undefined')){
                                     for(i=0;i<result.rows.length; i++) {
                                         //configs.set(result.rows[i].key, result.rows[i].value);
                                         configs[result.rows[i].key] = result.rows[i].value;
                                     }
                                 }
                                 sendOutJSON(res,200,null,configs);//res.send(200,configs);
                             }
                         }
                     );
                 });
             }
         },

	 /**
	  * get pois
	  * @param  array   req  request
	  * @param  array   res  response
	  * @param  function next handler
	  */
	 getWhitelist: function (req, res, next) {
		 //if(sanitizeInput(req,res)){
		 pg.connect(conString, function (err, client, done) {

			 if (pgError(err, client)) {
				 responseError(res, err);
				 return next(false);
			 }

			 var query =
				 "SELECT " +
				 "id," +
				 "name as nome," +
				 "surname as cognome," +
				 "language as lingua," +
				 "mobile as cellulare ," +
				 "enabled as abilitato," +
				 "CASE WHEN maintainer=true THEN 'sharengo' ELSE ''  END as info_display," +
				 "substring(md5(cast(pin->'primary' as text)) for 8) as pin," +
				 "'' as pin2," +
				 "pin as pins," +
				 "card_code as codice_card," +
				 "update_id  as tms " +
				 " FROM customers  " +
				 " WHERE update_id > $1 " +
				 " ORDER BY update_id " +
				 " LIMIT 2000";

			 var params = [];
			 if (typeof  req.params.lastupdate === 'undefined')
				 params = [0];
			 else
				 params = [req.params.lastupdate];

			 client.query(
				 query,
				 params,
				 function (err, result) {
					 if (pgError(err, client)) {
						 responseError(res, err);
					 } else {
						 done();
						 if (typeof result !== 'undefined') {
							 result.rows.forEach(function (item) {
								 // For each row compute hash for each possible pin
								 var a = ["primary", "secondary", "company"];
								 a.forEach(function (key) {
									 if (item.pins[key]) {
										 var pin = "" + item.pins[key];
										 item.pins[key] = crypto.createHash('md5').update(pin).digest("hex").substring(0, 8);
									 }
								 });
							 });
						 }
						 res.header('content-type', 'application/json');
						 res.send(200, result.rows);
					 }
				 }
			 );
		 });
		 //}
		 return next();
	 },

	 /**
	  * get pois
	  * @param  array   req  request
	  * @param  array   res  response
	  * @param  function next handler
	  */
	 getWhitelist2: function(req, res, next) {
		 //if(sanitizeInput(req,res)){
		 pg.connect(conString, function(err, client, done) {

			 if (pgError(err, client)) {
				 responseError(res, err);
				 return next(false);
			 }

			 var query =
				 "SELECT " +
				 "id as i," +
				 "name as n," +
				 "surname as c," +
				 "mobile as t ," +
				 "enabled as a," +
				 "CASE WHEN maintainer=true THEN 'sharengo' ELSE ''  END as id," + // infoDisplay
				 "substring(md5(cast(pin->'primary' as text)) for 8) as p," +
				 "pin as ps," +
				 "card_code as cc," +
				 "update_id  as tm " +
				 " FROM customers  " +
				 " WHERE update_id > $1 " +
				 " ORDER BY update_id " +
				 " LIMIT 2000";

			 var params = [];
			 if (typeof req.params.lastupdate === 'undefined')
				 params = [0];
			 else
				 params = [req.params.lastupdate];

			 client.query(
				 query,
				 params,
				 function(err, result) {
					 if (pgError(err, client)) {
						 responseError(res, err);
					 } else {
						 done();
						 if (typeof result !== 'undefined') {
							 result.rows.forEach(function(item) {
								 // For each row compute hash for each possible pin
								 var a = ["primary", "secondary", "company"];
								 a.forEach(function(key) {
									 if (item.ps[key]) {
										 var p = "" + item.ps[key];
										 item.ps[key] = crypto.createHash('md5').update(p).digest("hex").substring(0, 8);
									 }
								 });
							 });
						 }
						 res.header('content-type', 'application/json');
						 res.send(200, result.rows);
					 }
				 }
			 );
		 });
		 //}
		 return next();
	 },

     getWhitelistNew: function(req, res, next) {
         //if(sanitizeInput(req,res)){
         pg.connect(conString, function(err, client, done) {

             if (pgError(err, client)) {
                 responseError(res, err);
                 return next(false);
             }

             var query =
                 "SELECT " +
                 "id as i," +
                 "name as n," +
                 "surname as c," +
                 "mobile as t ," +
                 "enabled as a," +
                 "CASE WHEN maintainer=true THEN 'sharengo' ELSE ''  END as id," + // infoDisplay
                 "substring(md5(cast(pin->'primary' as text)) for 8) as p," +
                 "pin as ps," +
                 "card_code as cc," +
                 "update_id  as tm " +
                 " FROM customers  " +
                 " WHERE update_id > $1 " +
                 " ORDER BY update_id " +
                 " LIMIT 2000";

             var params = [];
             if (typeof req.params.lastupdate === 'undefined')
                 params = [0];
             else
                 params = [req.params.lastupdate];

             client.query(
                 query,
                 params,
                 function(err, result) {
                     if (pgError(err, client)) {
                         responseError(res, err);
                     } else {
                         done();
                         if (typeof result !== 'undefined') {
                             result.rows.forEach(function(item) {
                                 // For each row compute hash for each possible pin
                                 var a = ["primary", "secondary", "company"];
                                 a.forEach(function(key) {
                                     if (item.ps[key]) {
                                         var p = "" + item.ps[key];
                                         item.ps[key] = crypto.createHash('md5').update(p).digest("hex").substring(0, 8);
                                     }
                                 });
                             });
                         }
                         res.header('content-type', 'application/json');
                         //res.send(200, result.rows);
                         sendOutJSON(res,200,null,result.rows);
                     }
                 }
             );
         });
         //}
         return next();
     },


     /**
      * get pois
      * @param  array   req  request
      * @param  array   res  response
      * @param  function next handler
      */
     getPois: function(req, res, next) {
         //if(sanitizeInput(req,res)){
         next();
         pg.connect(conString, function(err, client, done) {

             if (pgError(err, client)) {
                 responseError(res, err);
                 return;// next(false);
             }

             var query ="SELECT  id, type, code, name, brand,address,town,zip_code,province, lon, lat, update " +
                 "FROM  pois " +
                 "WHERE update > $1 AND lon is not null AND lat is not null " +
                 "ORDER BY update";

             var params = [];
             if (typeof req.params.lastupdate === 'undefined')
                 params = [0];
             else
                 params = [req.params.lastupdate];

             client.query(
                 query,
                 params,
                 function(err, result) {
                     if (pgError(err, client)) {
                         responseError(res, err);
                     } else {
                         done();

                         sendOutJSON(res,200,null, result.rows);
                     }
                 }
             );
         });
         //}
     },

	 /**
	  * get list of businesses
	  * @param req
	  * @param res
	  * @param next
	  */
	 getBusinessEmployees: function (req, res, next) {
		 pg.connect(conString, function (err, client, done) {

			 if (pgError(err, client)) {
				 responseError(res, err);
				 return next(false);
			 }

			 var query = "SELECT " +
				 "employee_id as id, business_code as codice_azienda, business.is_enabled as azienda_abilitata, time_limits as limite_orari " +
				 "FROM business.business_employee JOIN business.business ON (business_code = code) " +
				 "WHERE status = 'approved'";
			 client.query(
				 query,
				 [],
				 function (err, result) {
					 if (pgError(err, client)) {
						 responseError(res, err);
					 } else {
						 done();
						 res.header('content-type', 'application/json');
						 res.send(200, result.rows);
					 }
				 }
			 );
		 });
		 return next();
	 },
     getBusinessEmployeesNew: function (req, res, next) {
             pg.connect(conString, function (err, client, done) {

                 if (pgError(err, client)) {
                     responseError(res, err);
                     return next(false);
                 }

                 var query = "SELECT " +
                     "employee_id as id, business_code as codice_azienda, business.is_enabled as azienda_abilitata, time_limits as limite_orari " +
                     "FROM business.business_employee JOIN business.business ON (business_code = code) " +
                     "WHERE status = 'approved'";
                 client.query(
                     query,
                     [],
                     function (err, result) {
                         if (pgError(err, client)) {
                             responseError(res, err);
                         } else {
                             done();
                             res.header('content-type', 'application/json');
                             //res.send(200, result.rows);
                             sendOutJSON(res,200,null,result.rows);
                         }
                     }
                 );
             });
             return next();
         },

/* / GET */

/* POST */

	/**
	 * add a reservation
	 * @param  array   req  request
	 * @param  array   res  response
	 * @param  function next handler
	 */

	/**
	 * TODO
	 * values for ts, beginning_ts, length, to_send?
	 * add freeCarCond ?
	 */

	postReservations: function(req, res, next) {
		if(sanitizeInput(req,res)){
			pg.connect(conString, function(err, client, done) {
				done();
		        logError(err,err);
		        next.ifError(err);
		        if(typeof  req.params.plate !== 'undefined' && req.params.plate !=''){

		        	client.query(
			        	"SELECT EXISTS(SELECT plate FROM cars WHERE plate=$1)",
			        	[req.params.plate],
			        	function(err, result) {
				            done();
				            if(result.rows[0].exists){
			            		client.query(
						        	"SELECT EXISTS(SELECT car_plate FROM reservations WHERE (customer_id=$1 OR car_plate=$2) AND active IS TRUE)",
						        	[req.user.id,req.params.plate],
						        	function(err, result) {
							            done();
							            logError(err,err);
							            if(result.rows[0].exists){
				            				sendOutJSON(res,200,'Error: Only 1 reservation allowed',null);
							            }else{
									        client.query(
									        	"INSERT INTO reservations (ts,car_plate,customer_id,beginning_ts,active,length,to_send) VALUES (NOW(),$1,$2,NOW(),true,30,true) RETURNING id",
									        	[req.params.plate,req.user.id],
									        	function(err, result) {
										            done();
										            logError(err,err);
										            sendOutJSON(res,200,'Reservation created successfully',{'reservation_id':result.rows[0].id});

									        	}
									        );
							            }
						        	}
						        );
				            }else{
				            	logError(err,err);
				            	sendOutJSON(res,200,'Invalid car plate',null);
				            }

			        	}
			        );
			    }else{
			    	logError(err,err);
			    	sendOutJSON(res,400,'Invalid parameter',null);
			    }
		    });
		}
	    return next();
	},

/* / POST */

    parseAuth: function(request) {
        return localParseAuth(request);
    }

};

     function getClient(){
         var config = parse(conString);
         var client = new Client(config);
         client.connect();

         return client;
     }

    /**This function start a transaction and also add the rollback logic at the error callback
     *
     * @param client
     * @param err
     * @param cb
     */
    function beginTransaction(client, err, cb){
        executeQuery(client,"BEGIN",[], function (errParam) {transactionErrorHandling(errParam, err, client);}, function(res, error) { cb(res, error);});
    }
    function rollbackTransaction(client, err, cb){
         console.log("Excecuting Rollback!!!");
        executeQuery(client,"ROLLBACK",[], err, function(res, error) { cb(res, error);});
    }
    function commitTransaction(client, err, cb){
        executeQuery(client,"COMMIT",[], err, function(res, error) { cb(res, error);});
    }

    /**
     * This funcion is used to execute a single query and has been created to unify the error handling always passing the received error function to cb
     *
     * @param client pg client
     * @param query query to be excecuted
     * @param params prams for the current query
     * @param error function that accept ONE parameter that is the Error
     * @param cb function that accept TWO parameter (result, error)
     *          result: the result of the query
     *          error: the the function that will handle future error
     */
    function executeQuery(client, query, params,error, cb){

        client.query(
            query,
            params,
            function (err, result) {
                if (err) {
                    logError(err," query was " +query + params + err.stack);
                    error(err);
                } else {
                    //console.log("excecuting query " + query + params);
                    cb(result, error);

                }
            }
        );
    }


    function getTripInfo(trip, cb) {
        var query = "SELECT * FROM trips WHERE timestamp_end is NULL AND car_plate = $1 ORDER BY timestamp_beginning ASC";
        var params = [trip.id_veicolo];

        var client = getClient();
        try {

            executeQuery(client, query, params, function (res1) {
                return cb(res1.rows);
            });
        } catch (e) {
            console.log("Exception while executing getTripInfo query ");
            rollbackTransaction(client, function (res) {});
            cb(e);
        }
    }

    function openTrip(trip, cb) {


        var response = {
            result: 0,
            message: "OK",
            extra: ""
        };
        var errorResponse = {
            result: -10,
            message: "OK",
            extra: "" };
        var payable = true;
        var checkIfAlreadySent = "SELECT id, pin_type FROM trips WHERE car_plate = $1 AND timestamp_beginning= $2 AND customer_id = $3";
        var checkIfAlreadySentParams = [trip.id_veicolo, trip.ora, trip.id_cliente];

        var updateTripBusiness = "UPDATE trips SET pin_type = $1  WHERE id = $2";
        var updateTripBusinessParams = [];

        var insertBusinessTrip = "INSERT INTO business.business_trip (business_code, group_id, trip_id)SELECT business_employee.business_code, business_employee.group_id, $1 FROM business.business_employee WHERE business_employee.employee_id = $2 AND business_employee.status = 'approved'";
        var insertBusinessTripParams = [];

        var checkOtherTripCustomer = "SELECT count(*)  FROM trips WHERE car_plate <> $1 AND customer_id = $2 AND timestamp_end is null";
        var checkOtherTripCustomerParams = [trip.id_veicolo, trip.id_cliente];

        var checkIfTripPayable = "SELECT  (SELECT gold_list FROM customers WHERE id = $1) OR EXISTS(SELECT 1 FROM cars WHERE plate= $2 AND fleet_id > 100) gold_list ";
        var checkIfTripPayableParams = [trip.id_cliente, trip.id_veicolo];

        var insertTrip = "INSERT INTO trips ( customer_id,car_plate,timestamp_beginning,km_beginning,battery_beginning,longitude_beginning,latitude_beginning,geo_beginning,beginning_tx,payable, error_code,parent_id, address_beginning, fleet_id)" + " VALUES ($1,$2,$3,$4,$5, cast($6 as numeric),cast($7 as numeric), ST_SetSRID(ST_MakePoint($6,$7),4326), now(), $8, $9, $10, $11, " + "(SELECT fleet_id FROM cars WHERE plate=$2)) RETURNING id";
        var insertTripParams = [trip.id_cliente, trip.id_veicolo, trip.ora, trip.km, trip.carburante, parseFloat(trip.lon), parseFloat(trip.lat), payable, response.result, trip.id_parent, trip.address_beginning];

        var client = getClient();

        executeQuery(client, checkIfAlreadySent, checkIfAlreadySentParams, function (err) {
            console.log("Exception in query");errorResponse.extra = err.stack;cb(errorResponse);client.end();
        }, function (res1, err1) {
            //CHECK if trip already sent
            if (res1.rows.length > 0) {//already sent

                if (trip.n_pin == 100 && res1.rows[0].pin_type !='company') {

                    beginTransaction(client, err1, function (resB, errB) {
                        var is_business_trip = true;
                        var pin_type = "company";
                        updateTripBusinessParams = [pin_type,res1.rows[0].id];

                        executeQuery(client, updateTripBusiness,updateTripBusinessParams,err1,function (resB1, errB1) {
                            insertBusinessTripParams = [res1.rows[0].id,trip.id_cliente];

                            executeQuery(client, insertBusinessTrip, insertBusinessTripParams, errB1, function (resB2, errB2) {
                                commitTransaction(client,err4, function (resCom, errCom) {
                                    response.result = res1.rows[0].id;
                                    response.message = "Updated business";
                                    cb(response);
                                    client.end(); //EXIT
                                });
                            });
                        });
                });

                } else {
                    response.result = res1.rows[0].id;
                    response.message = "Already sent";
                    cb(response);
                }


            } else {
                //Passing to the new query the same function for error handling I can handle any error with only one function
                executeQuery(client, checkOtherTripCustomer, checkOtherTripCustomerParams, err1, function (res2, err2) {
                    //check if customer have other opened trips
                    if (res2.rows[0].count > 0) {
                        response.result = -15; //Other trip open set error code
                        response.message = "Open trips";
                    }
                    executeQuery(client, checkIfTripPayable, checkIfTripPayableParams, err2, function (res3, err3) {
                        //check if trip should be payable
                        payable = !res3.rows[0].gold_list;
                        insertTripParams[7] = payable; //Update payable value
                        beginTransaction(client, err3, function (res4, err4) {
                            executeQuery(client, insertTrip, insertTripParams, err4, function (res5, err5) {
                                //insertTrip
                                if (response.result !== 0) {
                                    response.extra = res5.rows[0].id;
                                } else {
                                    response.result = res5.rows[0].id;
                                }
                                commitTransaction(client, err5, function (res6, err6) {
                                    cb(response);
                                    client.end();
                                });
                            });
                        });
                    });
                });
            }
        });
    }

    function closeTrip(trip, cb) {//TODO set close timestamp equal to beginning if less

        var response = {
            result: 0,
            message: "OK",
            extra: null
        };
        var errorResponse = {
            result: -10,
            message: "OK",
            extra: "" };
        var checkIfTripExist = "SELECT count(*) FROM trips WHERE id = $1 AND car_plate = $2 AND customer_id = $3";
        var checkIfTripExistParams = [trip.id, trip.id_veicolo, trip.id_cliente];

        var checkIfAlreadyClose = "SELECT count(*) FROM trips WHERE id = $1 AND timestamp_end IS NOT NULL";
        var checkIfAlreadyCloseParams = [trip.id];

        var updateTripData = "UPDATE trips SET  km_end = $1 ,battery_end = $2,  longitude_end = cast($3 as numeric), latitude_end = cast($4 as numeric), geo_end = ST_SetSRID(ST_MakePoint($3,$4),4326), end_tx = now(), park_seconds = $5 WHERE id = $6";
        var updateTripDataParams = [trip.km, trip.carburante, trip.lon, trip.lat, trip.park_seconds, trip.id];

        var checkifBusinessTripExist = "SELECT business.business_trip.trip_id FROM business.business_trip WHERE business.business_trip.trip_id = $1";
        var checkifBusinessTripExistParam = [trip.id];

        var insertBusinessTrip = "INSERT INTO business.business_trip (business_code, group_id, trip_id)SELECT business_employee.business_code, business_employee.group_id, $1 FROM business.business_employee WHERE business_employee.employee_id = $2 AND business_employee.status = 'approved'";
        var insertBusinessTripParams = [trip.id, trip.id_cliente];
        var closeTrip = "UPDATE trips SET timestamp_end = $1 ,km_end = $2,battery_end = $3,  longitude_end = cast($4 as numeric), latitude_end = cast($5 as numeric), geo_end = ST_SetSRID(ST_MakePoint($4,$5),4326)," + " end_tx = now(), park_seconds = $6, parent_id = $7, address_end = $8, pin_type =$9 " + " WHERE id = $10";
        var closeTripParams = [trip.ora, trip.km, trip.carburante, trip.lon, trip.lat, trip.park_seconds, trip.id_parent, trip.address_end, trip.n_pin == 100 ? 'company' : null, trip.id];

        var client = getClient();




        //check if exist business trip
        //if payment type is null set trips not payable

        executeQuery(client, checkIfTripExist, checkIfTripExistParams, function (err) {//check if exist trip with id, car and customer
            errorResponse.extra = err.stack;cb(errorResponse);client.end();
        }, function (res1, err1) {
            //CHECK if trip already sent
            if (res1.rows.length = 0) {
                //Trip not exist
                response.result = -3;
                response.message = "No Match";
                cb(response);
                client.end(); //EXIT
            } else {
                executeQuery(client, checkIfAlreadyClose, checkIfAlreadyCloseParams, err1, function (res2, err2) {//check if exist trip close with id to update data
                    //check if customer have other opened trips
                    if (res2.rows[0].count > 0) {
                        //TRIP ALREADY CLOSE, ONLY UPDATE DATA
                        executeQuery(client, updateTripData, updateTripDataParams, err2, function (resUp, errUp) { // close with id to update data
                            response.result = trip.id;
                            response.message = "OK";
                            cb(response);
                            client.end(); //EXIT
                        });
                    } else {
                        //CLOSE TRIP
                        beginTransaction(client,err2, function (resTra, errTra) {//begin Transaction

                            executeQuery(client, closeTrip, closeTripParams, errTra, function (res3, err3) {
                                //check if trip should be payable
                                if (trip.n_pin == 100) {
                                    executeQuery(client, checkifBusinessTripExist, checkifBusinessTripExistParam, err3, function (res4, err4) {
                                        if (res4.rows.length > 0) {
                                            //trip exist skip
                                            commitTransaction(client,err4, function (resCom, errCom) {
                                                response.result = trip.id;
                                                response.message = "OK";
                                                cb(response);
                                                client.end(); //EXIT
                                            });

                                        } else {
                                            executeQuery(client, insertBusinessTrip, insertBusinessTripParams, err4, function (res5, err5) {
                                                commitTransaction(client,err4, function (resCom, errCom) {
                                                    response.result = trip.id;
                                                    response.message = "OK";
                                                    cb(response);
                                                    client.end(); //EXIT
                                                });
                                            });
                                        }
                                    });
                                } else {
                                    commitTransaction(client,err3, function (resCom, errCom) {
                                        response.result = trip.id;
                                        response.message = "OK";
                                        cb(response);
                                        client.end(); //EXIT
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
    }


    function getIncidentDetail(event, cb) {

        var url = "http://corestage.sharengo.it/api/urto.json";

        console.log("Executing http call to retrieve address" +url);

        request({
            url: url,
            timeout: 5000 // 5 sec
        }, function (error, response, body) {
            /*console.log('error:'+ error); // Print the error if one occurred
            console.log('statusCode:'+ response + response.statusCode); // Print the response status code if a response was received*/
            console.log('incident body: ' + body);

            try {
                if(error || response.statusCode !=200) {
                    return cb(true);
                }

                var jsondata = JSON.parse(body);

                MongoClient.connect(mongoUrl, function(err, db) {
                    if (err) {
                        console.error(event.car_plate,'Mongo connect error',err);
                        cb(err);
                        return;
                    }


                    var incident = db.collection('incident');


                    incident.insertMany(jsondata, function(err1,result) {
                        db.close();
                        if (err1) {
                            console.error(event.car_plate,'Mongo insert error',err1)
                            log.error(event.car_plate,'Mongo insert error',err1);
                            cb(err)
                        } else {
                            console.log(event.car_plate,"Mongo insert completed:" + result.result.n);
                            cb(null);
                        }

                    });


                });
            }catch  (e) {
                console.log("Exception while executing getIncidentDetail " +e);
                return cb('');
            }
        });
    }




    function getAddressFromCoordinates(trip, cb) {

        var url = "http://maps.sharengo.it/reverse.php?format=json&zoom=18&addressdetails=1&lon=" + trip.lon + "&lat=" + trip.lat;

        console.log("Executing http call to retrieve address" +url);

        request({
            url: url,
            timeout: 5000 // 5 sec
        }, function (error, response, body) {
          /*console.log('error:'+ error); // Print the error if one occurred
          console.log('statusCode:'+ response + response.statusCode); // Print the response status code if a response was received
          console.log('body:' + body); // Print the HTML for the Google homepage.*/

        try {
            if(error || response.statusCode !=200) {
                return cb('');
            }

            var jsondata = JSON.parse(body);

            var road = (typeof jsondata.address.road !== 'undefined') ? jsondata.address.road : (typeof jsondata.address.pedestrian !== 'undefined') ? jsondata.address.pedestrian : '';

            var city = (typeof jsondata.address.town !== 'undefined') ? jsondata.address.town : jsondata.address.city;

            var county = (typeof jsondata.address.county !== 'undefined') ? jsondata.address.county : '';

            var address =
                ((road !== '') ? road + ', ' : '') +
                ((city !== '') ? city + ', ' : '') +
                ((county !== '') ? county : '');

            return cb(address);
        }catch  (e) {
            console.log("Exception while executing getAddressFromCoordinates" +e);
            return cb('');
        }
        });
    }

    /**
     *
     * @param errParam error value
     * @param error error callback
     * @param client pg client
     */
    function transactionErrorHandling(errParam, error, client) {
        rollbackTransaction(client, error, function (res, err) {
            return err(errParam);
        });
    }

/* PRIVATE FUNCTIONS */


    function localParseAuth(request) {
        if (request && request.headers['authorization']) {
          var auth = request.headers['authorization'];
          var tmp = auth.split(' ');
          var plain_auth = new Buffer(tmp[1], 'base64').toString();
          tmp = plain_auth.split(':');
          return { username : tmp[0] , password: tmp[1]};
        } else {
          return { username :'UNKNOWN' , password: ''};
        }
    }

	/**
	 * outputs json response
	 * @param  array   req  request
	 * @param  array   res  response
	 * @param  string reason
	 * @param  array data   data to send
	 */
	function sendOutJSON(res,status,reason,data){
	    res.send(status, {
	        'status': status,
	        'reason': reason,
	        'data': data,
	        'time': Date.now() / 1000 | 0,
	    });
	}



    function pgError(err,client) {
      // no error occurred, continue with the request
      if(!err) return false;

      // An error occurred, remove the client from the connection pool.
      // A truthy value passed to done will remove the connection from the pool
      // instead of simply returning it to be reused.
      // In this case, if we have successfully received a client (truthy)
      // then it will be removed from the pool.
      if(client){
        done(client);
      }

      logError(err,err);

      return true;
    };

    function responseError(res,err) {
      res.writeHead(500, {'content-type': 'text/plain'});
      res.end('An error occurred');
    }


	/**
	 * console log errors
	 * @param  bool error true on error
	 * @param  string msg  error message
	 */
	function logError(error,msg){
		if(error){
			console.error(msg);
			return true;
		}else{
			return false;
		}
	}

	/**
	 * console log request
	 * @param  req request
	 */
	function logReq(req){
		console.log(
			"====================\n",
			Date.now().toISOString(),
			"\n--------------------\n",
			req.query,
			"\n--------------------\n",
			req.headers,
			"\n--------------------\n",
			req.params,
			"\n\n"
			);
	}

    	/**
	 * get http username (should be car_plate)
	 * @param  req request
	 */



	/**
	 * sanitize request data
	 * @param  req reques
	 * @return bool, true ok, false error
	 */
	function sanitizeInput(req,res){
		logReq(req);

		if(	(
				(typeof req.params.plate != 'undefined') &&
				(req.params.plate != '') &&
				(
					(!validator.isAlphanumeric(req.params.plate)) ||
	        		(!validator.isByteLength(req.params.plate,5,9))
	        	)
        	) ||

			(
				(typeof req.params.status != 'undefined') &&
				(req.params.status != '') &&
				(!validator.isAlphanumeric(req.params.status))
			) ||

			(
				(typeof req.params.lat != 'undefined') &&
				(req.params.lat != '') &&
				(!validator.isFloat(req.params.lat))
			) ||

			(
				(typeof req.params.lon != 'undefined') &&
				(req.params.lon != '') &&
				(!validator.isFloat(req.params.lon))
			) ||

			(
				(typeof req.params.radius != 'undefined') &&
				(req.params.radius != '') &&
				(!validator.isInt(req.params.radius))
			) ||

			(
				(typeof req.params.reservation != 'undefined') &&
				(req.params.reservation != '') &&
				(!validator.isInt(req.params.reservation))
			) ||

			(
				(typeof req.params.id != 'undefined') &&
				(req.params.id != '') &&
				(!validator.isInt(req.params.id)) &&
			 	(req.params.id != 'current')
			)||

			(
				(typeof req.params.active != 'undefined') &&
				(req.params.active != '') &&
				(!validator.isBoolean(req.params.active))
			)||

			(
				(typeof req.params.quantity != 'undefined') &&
				(req.params.quantity != '') &&
				(!validator.isInt(req.params.quantity))
			)||

			(
				(typeof req.params.from != 'undefined') &&
				(req.params.from != '') &&
				(!validator.isInt(req.params.from))
			)||

			(
				(typeof req.params.to != 'undefined') &&
				(req.params.to != '') &&
				(!validator.isInt(req.params.to))
			)||

			(
				(typeof req.params.action != 'undefined') &&
				(req.params.action != '') &&
				(!validator.isAlphanumeric(req.params.action))
			)

		){
			console.log('\n+++++++++++++++++\nvalidation error\n');
			console.log(req.params);
			sendOutJSON(res,400,'Invalid parameters',req.params);
			return false;
		}else{
			return true;
		}
	}

}

/* /EXTRA FUNCTIONS */

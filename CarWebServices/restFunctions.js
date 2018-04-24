const crypto = require('crypto');

const MongoClient = require('mongodb').MongoClient;

const Utility = require('./utility.js')();

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
             //if(sanitizeInput(req,res)){
             next();
             pg.connect(conString, function(err, client, done) {

                 if (pgError(err, client)) {
                     responseError(res, err);
                     return;// next(false);
                 }


                 if (typeof req.params.consumed === 'undefined') {
                     if (typeof  req.params.plate === 'undefined') {
                         sendOutJSON(res, 400, 'Missing plate', null);
                         return;
                     }

                     query = "SELECT  id, cards , extract(epoch from beginning_ts) as time,  length  , active " +
                         "FROM reservations " +
                         "WHERE  car_plate = $1";

                     var params = [req.params.plate];
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
                                 res.send(result.rows);
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

                     query = "UPDATE reservations SET consumed_ts = now() , active = false WHERE id = $1 RETURNING id";

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
                                 res.send(result.rows);

                                 done();
                             }
                         }
                     );

                 }


             });
             //}
             //return next();
         },

         /**
          * get Commands
          * @param  array   req  request
          * @param  array   res  response
          * @param  function next handler
          */
         getCommands: function(req, res, next) {
             //if(sanitizeInput(req,res)){
             next();
             pg.connect(conString, function(err, client, done) {

                 if (pgError(err, client)) {
                     responseError(res, err);
                     return;// next(false);
                 }
                 query = "UPDATE commands SET to_send = false WHERE car_plate = $1 and to_send = true RETURNING id, command , intarg1, intarg2, txtarg1, txtarg2, extract(epoch from queued) as queued, ttl, payload";

                 if(typeof  req.params.plate === 'undefined') {
                     sendOutJSON(res,400,'Missing plate',null);
                     return ;
                 }
                 var params = [req.params.plate];

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
                             res.send(result.rows);

                         }
                     }
                 );

             });
             //}
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
                 let event = Utility.fillTemplate(Utility.getTemplateMongo(), req.params);
                 event.event_time = new Date(event.event_time);
                 event.server_time  = new Date();
                 event.geo = {};
                 event.geo.type='Point';
                 event.geo.coordinates= [parseFloat(event.lon), parseFloat(event.lat)];

                 MongoClient.connect(mongoUrl, function(err, db) {
                     if (err) {
                         console.error(req.params.car_plate,'Mongo connect error',err);
                         sendOutJSON(res,400,-10,null);
                         return;
                     }


                     var events = db.collection('events');


                     events.insert(event , function(err,result) {
                         db.close();
                         if (err) {
                             console.error(event.car_plate,'Mongo insert error',err)
                             log.error(event.car_plate,'Mongo insert error',err);
                             sendOutJSON(res,400,-11,null);
                         } else {
                             console.log(event.car_plate,"Mongo insert completed:" + result.result.n);

                             sendOutJSON(res,200,1,null);
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
                     	if(event.txtval === "NOPAY") {
                            query = "UPDATE trips SET payable = FALSE WHERE id = $1";
                            params = [event.trip_id];
                        }
                         break;
                     case "CLEANLINESS":
                         query = "UPDATE cars SET int_cleanliness = $1 , ext_cleanliness = $2 WHERE plate=$3";

                         let values = Utility.getCleanliness(event.txtval);
                         params = [values[0], values[1], event.car_plate];
                         break;
                     case "SOS":
                         query = "INSERT INTO messages_outbox  (destination,type,subject,submitted,meta) VALUES ('support','SOS','SOS call',now(),$1)";
                         params = [JSON.stringify(event)];
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
                             logError(err,err);
                         } else {
                             if ((typeof result !== 'undefined')) {
                                 //outJson = JSON.stringify(result.rows);
                             }
                             //log.d(result.rows);

                             sendOutJSON(res,200,null,null);

                         }
                     }
                 );

             });
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

                         	result.rows.forEach(row => {
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
                                points.forEach(point =>{
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
                                 res.send(response);
                             }
                             res.send();

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
		//if(sanitizeInput(req,res)){
			pg.connect(conString, function(err, client, done) {

                if (pgError(err,client)) {
                   responseError(res,err);
                   return next(false);
                }

		        var query = '',params = [],queryString = '',isSingle = false;

                var auth = localParseAuth(req);

                query = " SELECT * FROM cars_configurations " +
                        " WHERE car_plate=$1 OR fleet_id= (SELECT fleet_id FROM cars WHERE plate=$1) " +
                        " OR (fleet_id is null AND model is null AND car_plate is null) " +
                        " ORDER BY key, car_plate DESC , model DESC, fleet_id DESC ";
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
    			            var outTxt = '',outJson = null;
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
		//}
        return next();
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

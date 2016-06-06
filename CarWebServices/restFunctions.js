

module.exports = init


function init (opt) {

     // optional params
     opt = opt || {};

     var pg  = opt.pg;
     var conString = opt.conString;
     var validator = opt.validator;

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
                        " WHERE car_plate=$1 OR fleet_id= (SELECT fleet_id FROM cars WHERE plate='CSDEMO01') " +
                        " OR (fleet_id is null AND model is null AND car_plate is null) " +
                        " ORDER BY key, car_plate DESC , model DESC, fleet_id DESC ";
                params = [auth.username];

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
	getWhitelist: function(req, res, next) {
		//if(sanitizeInput(req,res)){
			pg.connect(conString, function(err, client, done) {

                if (pgError(err,client)) {
                   responseError(res,err);
                   return next(false);
                }

		        var query = '',params = [],queryString = '',isSingle = false;

                query =
                       "SELECT "+
                          "id,"+
                          "name as nome,"+
                          "surname as cognome,"+
                          "language as lingua,"+
                          "mobile as cellulare ,"+
                          "enabled as abilitato,"+
                          "CASE WHEN maintainer=true THEN 'sharengo' ELSE ''  END as info_display,"+
                          "substring(md5(cast(pin->'primary' as text)) for 8) as pin,"+
                          "'' as pin2,"+
                          "card_code as codice_card,"+
                          "update_id  as tms "+
                        " FROM customers  "+
                        " WHERE update_id > $1 " +
                        " ORDER BY update_id " +
                        " LIMIT 10000";

                if(typeof  req.params.lastupdate === 'undefined')
                    params = [0];
                else
                    params = [req.params.lastupdate];

		        client.query(
		        	query,
		        	params,
		        	function(err, result) {
                        if (pgError(err,client)) {
                            responseError(res,err);
  		        	    } else {
    			            done();
    			            var outTxt = '',outJson = '[]';
                            var configs = {};
    			            if((typeof result !== 'undefined')){
    			              outJson=JSON.stringify(result.rows);
    			            }
                            res.header('content-type', 'application/json');
                            res.send(200,result.rows);
                        }
		        	}
		        );
		    });
		//}
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
			sendOutJSON(res,400,'Invalid parameters',null);
			return false;
		}else{
			return true;
		}
	}

}

/* /EXTRA FUNCTIONS */

/*!/bin/bash
*
* NAME
*   CarWebServices.sh
*
* DESCRIPTION
*    This module will expose an http/https pseudo-REST interface for
*    data requests and data push from vehicles.
+    Should run as daemon directly or using a process manager like PM2
*
* CONFIGURATIONS
*    Global parameters are in  ../config/globalConfig.js
*    Local parameters for this module are in  config.js
*
* COPYRIGHT AND LICENSE
*   Copyright (C) 2015-2016 Bulweria Ltd.
*
* AUTHOR
*    Massimo Belluz - massimo.belluz@bulweria.com
*
* EDIT
*    2016-06-10 - @massimobelluz - Refactoring
*
****************************************************************************/
'use strict';


// Basic modules
var stamp =     require('console-stamp')(console, 'dd/mm/yyyy HH:MM:ss.l');
var cluster =   require('cluster');
var fs =        require('fs');
var validator = require('validator');



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

var conString =         config.pgDb || globalConfig.pgDb;
var redisServer =       config.redisServer || globalConfig.redisServer;
var redisDb =           config.redisDb;
var logPath =           config.logPath || globalConfig.logPath;
var serverName =        config.serverName || 'CarWebServices';
var standardPort =      config.httpPort || 8123;
var unsecurePort =      config.httpUnsecurePort || 8121;
var debugMode =         config.debugMode || false;
var redisCluster =      globalConfig.redisCluster || [];



// Modules initialization

var restify = require('restify');

var pg = require('pg').native;
pg.defaults.poolSize = 25;
pg.defaults.poolIdleTimeout=5000; // 5 sec

var morgan = require('morgan');
fs.existsSync(logPath) || fs.mkdirSync(logPath)
var accessLogStream = fs.createWriteStream(logPath + 'CarWebServices_access.log', {flags: 'a'})
var morganLogger = morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":user-agent" - :response-time ms ', { stream : accessLogStream})


var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: "ws",
  streams: [
    { path : logPath + 'CarWebServices.log' }
  ],
  serializers: restify.bunyan.serializers
});

var dlog = {
  d : function(msg){ console.log(msg); log.info(msg)},
  e : function(){ console.error(arguments); log.error(arguments)},
}


// Globals

var server;
var unsecureServer;

var funcs = require('./restFunctions')( {pg: pg , conString: conString, validator: validator});


// Local functions



/**
* Send log row to API log queue
* @param  string   ip  client ip address
* @param  string   route  called route
* @param  string   plate  Car plate
* @param  string   payload  Log body
*/
function ApiLog(ip, route, plate, payload) {
  var xpayload = { timestamp : new Date() , host : ip , pid : process.pid , payload : payload };
  dlog.d(xpayload);

  //console.log("JSON2 lenght=" + xpayload.length + xpayload );
  /*
  jkue.create('log_api', {
    title : "Api :" + xpayload.timestamp,
    payload : xpayload
  }).save(function (err) {
    if (err)
        console.error(err);
    else
        console.log("Queued : " + xpayload);
  });
  */
}



/**
* Send log row to API log queue
* @param  object   server  restify instance to initialize
*/

function registerServer(server) {

	//server.use(restify.acceptParser(server.acceptable));
	server.use(restify.authorizationParser());
	//server.use(restify.dateParser());
	server.use(restify.queryParser());
	//server.use(restify.jsonp());
	server.use(restify.gzipResponse());
	server.use(restify.bodyParser());
	server.use(restify.throttle({
	    burst: 32,
	    rate: 200,
	    ip: true,
	    /*overrides: {
		    '192.168.1.1': {
		      rate: 0,        // unlimited
		      burst: 0
		    }
		  }*/
	}));
	//server.use(restify.conditionalRequest());
	//server.use(restify.CORS());

    server.use(morganLogger);

    server.pre(restify.pre.sanitizePath());
    server.pre(function (request, response, next) {
        next();
	});

    // Handlers

	server.on('InternalServerError', function(req, res, err, cb) {
	    err._customContent = 'Error';
        dlog.e('InternalServerError',err);
	    return cb();
	});
	server.on('InternalError', function(req, res, err, cb) {
	    err._customContent = 'Error';
        dlog.e('InternalError',err);
	    return cb();
	});

	server.on('ResourceNotFoundError', function(req, res, err, cb) {
	    err._customContent = 'Not found';
        dlog.e('ResourceNotFound',err);
	    return cb();
	});
    /*
    server.on('uncaughtException', function (req, res, route, err) {
      console.log('======= server uncaughtException');
      console.log(err);
      res.send(200, { handler: 'server uncaughtException'});
    });
    */

    server.on('after', function (request, response, route, error) {
	    request.log.info({ req: request,params:request.params }, 'REQUEST');

        ApiLog(request.connection.remoteAddress, request.url,"USER" , request.params);      //request.authorization.basic.username
    });


    // Routes

        /*
	server.get(
		{path: '/admins', version: '1.0.0'},
		funcs.getAdmins
	);
	*/

	server.get(
        {path: '/configs', version: '1.0.0'},
		funcs.getConfigs
	);

	server.get(
        {path: '/whitelist', version: '1.0.0'},
		funcs.getWhitelist
	);
  server.get({ path: '/whitelist2', version: '1.0.0' },
      funcs.getWhitelist2
  );

    server.get(
        {path: '/business-employees', version: '1.0.0'},
        funcs.getBusinessEmployees
    );
}


// Main


    dlog.d('Webservice startup');

    /*
    process.on('uncaughtException', function (err) {
      console.log('==== process uncaughtException');
      err = err || {};
      console.log('======== ', arguments);

    });
    */


    var responseFormatter = {
            'application/json': function customizedFormatJSON( request, res, body ,cb ) {


	            if ( body instanceof Error ) {
	                res.statusCode = body.statusCode || 500;

	                if ( body.body ) {
	                	console.log('\nERROR\n\n===============\n');
	                	console.log(body);
	                	res.statusCode = 400;
	                    body = {
	                        status: 400,
	                        reason: "Invalid parameters",
	                        time: Date.now() / 1000 | 0
	                    };
	                } else {
	                    body = {
	                        msg: body.message
	                    };
	                }
	            } else if ( Buffer.isBuffer( body ) ) {
	                body = body.toString( 'base64' );
	            }

	            var data = JSON.stringify( body );
                res.setHeader( 'Content-Length', Buffer.byteLength( data ) );

                var auth = funcs.parseAuth(request)
                console.log(auth);

                //var username = request.authorization?request.authorization.basic.username:"UNKNOWN";
                var username = "USERNAME";
                dlog.d(request.method + " " + request.url + " - " + auth.username + " " + res.statusCode  +" " + res.getHeader('Content-Length'));
                dlog.d("Body: " + (data.length <= 16 ? data : data.substr(0,15)+'...')+ "  [" + Buffer.byteLength( data ) + "]");


	            return cb(null,data);
            }
    };

/*
    if (cluster.isMaster) {
       console.log("Start cluster. Forking...")
       cluster.fork();
       cluster.fork();
       cluster.on('exit', function (worker) {
         console.log("Worker %s exited", worker.id);
       })
    } else {
*/
	server = restify.createServer({
        name: serverName,
	    formatters: responseFormatter,
	    log: log,
	    certificate: fs.readFileSync('../ssl/server.cer'),
	    key: fs.readFileSync('../ssl/server.key'),
        ca:  fs.readFileSync('../ssl/ca.cer'),
        requestCert:        true,
        rejectUnauthorized: true
	});
    dlog.d('Created standard server');


    unsecureServer = restify.createServer({
	    name: serverName,
	    formatters: responseFormatter,
	    log: log
	});
    dlog.d('Created unsecure debug server');

    registerServer(server);
    registerServer(unsecureServer);

    server.listen({host:'0.0.0.0',port:standardPort});
    dlog.d('Listen standard server: ' + standardPort)


    unsecureServer.listen({host:'0.0.0.0',port:unsecurePort});
    dlog.d('Listen unsecure debug server: ' + unsecurePort);

    dlog.d("Worker started...");
//}

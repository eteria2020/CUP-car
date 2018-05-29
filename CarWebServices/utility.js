module.exports = init;


function init () {

return {
    getTemplateMongoEvent: function () {
        return {
            event_time: new Date().getTime()/1000,
            event_id: 0,
            customer_id: 0,
            car_plate: "XH123KM",
            trip_id: 0,
            label: "EVENTS",
            intval: 0,
            txtval: "",
            level: 0,
            lat: 0,
            lon: 0,
            km: 0,
            battery: 0,
            imei: null,
            json_data: null
        };
    },
    getTemplateTrip: function () {
        return {
            cmd: 0,
            id: 0,
            id_veicolo: "XH123KM",
            address_beginning: "",
            address_end: "",
            id_cliente: 0,
            ora: 0,
            km: 0,
            carburante: 0,
            lon: 0,
            lat: 0,
            warning: "",
            mac: "",
            imei: 0,
            park_seconds: 0,
            n_pin: 1,
            id_parent: null,
            REMOTE_ADDR: null
        };
    },

    fillTemplate: function (template, obj)
    {

        for (let key in obj) {
            if(typeof key !== 'undefined' && typeof template !== 'undefined')
            if (template.hasOwnProperty(key))
                template[key] = obj[key];
        }
        return template
    },
    validateEvents: function (req,res){

        if(
            (typeof req.params.event_time === 'undefined' && isNaN(parseFloat(req.params.event_time)))
            ||
            (typeof req.params.event_id === 'undefined' && isNaN(parseFloat(req.params.event_time)))
            ||
            (typeof req.params.customer_id === 'undefined' && isNaN(parseFloat(req.params.customer_id)))//OPTIONAL
            ||
            (typeof req.params.car_plate === 'undefined')
            // ||
            //  (typeof req.params.trip_id === 'undefined' && isNaN(parseFloat(req.params.trip_id)))//OPTIONAL
            ||
            (typeof req.params.label === 'undefined')
            ||
            (typeof req.params.intval === 'undefined' && isNaN(parseFloat(req.params.event_time)))
            ||
            (typeof req.params.txtval === 'undefined')
            ||
            // (typeof req.params.level === 'undefined')//OPTIONAL
            // ||
            (typeof req.params.lat === 'undefined' && isNaN(parseFloat(req.params.event_time)))
            ||
            (typeof req.params.lon === 'undefined' && isNaN(parseFloat(req.params.event_time)))
            ||
            (typeof req.params.km === 'undefined' && isNaN(parseFloat(req.params.event_time)))//OPTIONAL
            ||
            (typeof req.params.battery === 'undefined' && isNaN(parseFloat(req.params.event_time)))
        // ||
        // (typeof req.params.imei === 'undefined')//OPTIONAL
        // ||
        // (typeof req.params.json_data === 'undefined')//OPTIONAL
        ){
            console.log('\n+++++++++++++++++\nvalidation error\n');
            console.log(req.params);
            sendOutJSON(res,400,'Invalid Events parameters',null);
            return false;
        }else{
            req.params.event_time = parseFloat(req.params.event_time);
            req.params.event_id = parseFloat(req.params.event_id);
            req.params.intval = parseFloat(req.params.intval);
            req.params.lat = parseFloat(req.params.lat);
            if(req.params.lat==0) {
                req.params.lat = 0.0;
            }
            req.params.lon = parseFloat(req.params.lon);
            if(req.params.lon==0) {
                req.params.lon = 0.0;
            }
            req.params.battery = parseFloat(req.params.battery);
            req.params.customer_id = parseFloat(req.params.customer_id);
            // req.params.trip_id = parseFloat(req.params.trip_id);
            req.params.km = parseFloat(req.params.km);

            return true;
        }
    },
    validateConfig: function (req,res){

        if(
            (typeof req.params.car_plate === 'undefined')

        ){
            console.log('\n+++++++++++++++++\nvalidation error\n');
            console.log(req.params);
            sendOutJSON(res,400,'Invalid Config parameters',null);
            return false;
        }else{
            return true;
        }
    },
    validateCommands: function (req,res){

        if(
            (typeof req.params.car_plate === 'undefined')

        ){
            console.log('\n+++++++++++++++++\nvalidation error\n');
            console.log(req.params);
            sendOutJSON(res,400,'Invalid Commands parameters',null);
            return false;
        }else{
            return true;
        }
    },
    validateReservation: function (req,res){

        if(
            (typeof req.params.car_plate === 'undefined') &&
            (typeof req.params.consumed === 'undefined')

        ){
            console.log('\n+++++++++++++++++\nvalidation error\n');
            console.log(req.params);
            sendOutJSON(res,400,'Invalid Reservation parameters',null);
            return false;
        }else{
            return true;
        }
    },
    validateTrips: function (req,res){

        if(
            (typeof req.params.cmd === 'undefined' && isNaN(parseFloat(req.params.cmd)))
            ||
            (typeof req.params.id === 'undefined' && req.params.cmd == 2 && isNaN(parseFloat(req.params.id)))
            ||
            (typeof req.params.id_veicolo === 'undefined')
            ||
            (typeof req.params.id_cliente === 'undefined' && isNaN(parseFloat(req.params.id_cliente)))
            ||
            (typeof req.params.ora === 'undefined' && isNaN(parseFloat(req.params.ora)))
            ||
            (typeof req.params.km === 'undefined' && isNaN(parseFloat(req.params.km)))
            ||
            (typeof req.params.carburante === 'undefined' && isNaN(parseFloat(req.params.carburante)))
            ||
            (typeof req.params.lon === 'undefined' && isNaN(parseFloat(req.params.lon)))
            ||
            (typeof req.params.lat === 'undefined' && isNaN(parseFloat(req.params.lat)))
            ||
            (typeof req.params.warning === 'undefined')
            ||
            (typeof req.params.pulizia_int === 'undefined' && isNaN(parseFloat(req.params.pulizia_int)))
            ||
            (typeof req.params.pulizia_ext === 'undefined' && isNaN(parseFloat(req.params.pulizia_ext)))
            ||
            (typeof req.params.park_seconds === 'undefined'  && req.params.cmd == 2 && isNaN(parseFloat(req.params.park_seconds)))
            ||
            (typeof req.params.n_pin === 'undefined' && isNaN(parseFloat(req.params.n_pin)))
        ){
            console.log('\n+++++++++++++++++\nvalidation error\n');
            console.log(req.params);
            sendOutJSON(res,400,'Invalid Trips parameters',null);
            return false;
        }else{

            req.params.cmd = parseFloat(req.params.cmd);
            if(typeof req.params.id !== 'undefined') {
                req.params.id = parseFloat(req.params.id);
            }
            req.params.id_cliente = parseFloat(req.params.id_cliente);
            req.params.ora = parseFloat(req.params.ora);
            req.params.km = parseFloat(req.params.km);
            req.params.carburante = parseFloat(req.params.carburante);
            req.params.lon = parseFloat(req.params.lon);
            req.params.lat = parseFloat(req.params.lat);
            req.params.pulizia_int = parseFloat(req.params.pulizia_int);
            req.params.pulizia_ext = parseFloat(req.params.pulizia_ext);
            if(typeof req.params.park_seconds !== 'undefined') {
                req.params.park_seconds = parseFloat(req.params.park_seconds);
            }
            req.params.n_pin = parseFloat(req.params.n_pin);

            return true;
        }
    },

    getCleanliness: function(event) {
        let map = ["clean", "average", "dirty"];
        if(typeof event!== 'string')
            return[map[0],map[0]];
        let cleanliness = event.split(";");
        let intern = Math.abs(parseInt(cleanliness[0]));
        let ext = Math.abs(parseInt(cleanliness[1]));
        if(cleanliness.length === 2 && !isNaN(intern) && intern < 3 && !isNaN(ext) && ext < 3){
            return[map[intern], map[ext]]
        }else {
            return[map[0],map[0]];
        }

    }
}
    function sendOutJSON(res,status,reason,data){
        res.send(status, {
            'status': status,
            'reason': reason,
            'data': data,
            'time': Date.now() / 1000 | 0,
        });
    }
}
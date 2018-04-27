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
            id_cliente: 0,
            ora: 0,
            km: 0,
            carburante: 0,
            lon: 0,
            lat: 0,
            warning: "",
            mac: 0,
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
        //logReq(req);

        if(
            (typeof req.params.event_time === 'undefined')
            ||
            (typeof req.params.event_id === 'undefined')
            // ||
            // (typeof req.params.customer_id === 'undefined')//OPTIONAL
            ||
            (typeof req.params.car_plate === 'undefined')
            // ||
            // (typeof req.params.trip_id === 'undefined')//OPTIONAL
            ||
            (typeof req.params.label === 'undefined')
            ||
            (typeof req.params.intval === 'undefined')
            ||
            (typeof req.params.txtval === 'undefined')
            ||
            // (typeof req.params.level === 'undefined')//OPTIONAL
            // ||
            (typeof req.params.lat === 'undefined')
            ||
            (typeof req.params.lon === 'undefined')
            // ||
            // (typeof req.params.km === 'undefined')//OPTIONAL
            ||
            (typeof req.params.battery === 'undefined')
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
            return true;
        }
    },
    validateTrips: function (req,res){
        //logReq(req);

       /* if(
            (typeof req.params.cmd === 'undefined')
            ||
            (typeof req.params.id === 'undefined')
            ||
            (typeof req.params.id_veicolo === 'undefined')
            ||
            (typeof req.params.id_cliente === 'undefined')
            ||
            (typeof req.params.ora === 'undefined')
            ||
            (typeof req.params.km === 'undefined')
            ||
            (typeof req.params.carburante === 'undefined')
            ||
            (typeof req.params.lon === 'undefined')
            ||
            (typeof req.params.lat === 'undefined')
            ||
            (typeof req.params.warning === 'undefined')
            ||
            (typeof req.params.pulizia_int === 'undefined')
            ||
            (typeof req.params.pulizia_ext === 'undefined')
            ||
            (typeof req.params.park_seconds === 'undefined')
            ||
            (typeof req.params.n_pin === 'undefined')
        ){
            console.log('\n+++++++++++++++++\nvalidation error\n');
            console.log(req.params);
            sendOutJSON(res,400,'Invalid Trips parameters',null);
            return false;
        }else{*/
            return true;
       // }
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
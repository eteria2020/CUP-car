'use strict';

module.exports = {
    generateEvents: generateEvents,
    generateRandomEvents: generateRandomEvents,
    generatePHPEvents: generatePHPEvents,
    generatePHPRandomEvents: generatePHPRandomEvents
};

function generateEvents(label, car) {

    var event = {

        car_plate: car.plate,
        customer_id: 26740,
        trip_id: car.tripResponse,
        event_time: new Date().getTime(),
        lon: 9.182768666666668,
        lat: 45.45682866666666,
        km: 22016,
        level: 0,
        battery: 61,
        imei: 861311004993399
    };

    switch (label) {
        case "CHARGE":
            event.event_id = 7;
            event.label = label;
            event.intval = random(0, 2);
            event.txtval = 'null';
            event.json_data = 'null';
            break;
        case "SW_BOOT":
            event.event_id = 1;
            event.label = label;
            event.intval = 0;
            event.txtval = 'car_generator';
            event.json_data = 'null';
            break;
        case "SELFCLOSE":
            event.event_id = 23;
            event.label = label;
            event.intval = event.trip_id;
            event.txtval = random(0, 10) % 2 === 0 ? 'NOPAY' : 'null';
            event.json_data = 'null';
            break;
        case "CLEANLINESS":
            event.event_id = 12;
            event.label = label;
            event.intval = 0;
            event.txtval = "" + random(0, 3) + ";" + random(0, 3);
            event.json_data = 'null';
            break;
        case "SOS":
            event.event_id = 9;
            event.label = label;
            event.intval = 0;
            event.txtval = '3203589044';
            event.json_data = 'null';
            break;
        case "SHUTDOWN":
            event.event_id = 25;
            event.label = label;
            event.intval = 1;
            event.txtval = 'null';
            event.json_data = 'null';
            break;
        case "CAN_ANOMALIES":
            event.event_id = 31;
            event.label = label;
            event.intval = 1;
            event.txtval = 'null';
            event.json_data = 'null';
            break;

    }

    return event;
}
function generateRandomEvents(car) {
    var eventsLabel = ["CHARGE", "SW_BOOT", "SELFCLOSE", "CLEANLINESS", "SOS", "SHUTDOWN", "CAN_ANOMALIES"];
    return generateEvents(eventsLabel[random(0, eventsLabel.length)], car);
}

function generatePHPEvents(label, car) {

    var event = {
        params: {

            car_plate: car.plate,
            customer_id: 26740,
            trip_id: car.tripResponse,
            event_time: new Date().getTime(),
            lon: 9.182768666666668,
            lat: 45.45682866666666,
            km: 22016,
            level: 0,
            battery: 61,
            imei: 861311004993399
        }
    };

    switch (label) {
        case "CHARGE":
            event.event_id = 7;
            event.label = label;
            event.intval = random(0, 2);
            event.txtval = 'null';
            event.json_data = 'null';
            break;
        case "SW_BOOT":
            event.event_id = 1;
            event.label = label;
            event.intval = 0;
            event.txtval = 'car_generator';
            event.json_data = 'null';
            break;
        case "SELFCLOSE":
            event.event_id = 23;
            event.label = label;
            event.intval = event.trip_id;
            event.txtval = random(0, 10) % 2 === 0 ? 'NOPAY' : 'null';
            event.json_data = 'null';
            break;
        case "CLEANLINESS":
            event.event_id = 12;
            event.label = label;
            event.intval = 0;
            event.txtval = "" + random(0, 3) + ";" + random(0, 3);
            event.json_data = 'null';
            break;
        case "SOS":
            event.event_id = 9;
            event.label = label;
            event.intval = 1;
            event.txtval = '3203589044';
            event.json_data = 'null';
            break;
        case "SHUTDOWN":
            event.event_id = 25;
            event.label = label;
            event.intval = 1;
            event.txtval = 'null';
            event.json_data = 'null';
            break;
        case "CAN_ANOMALIES":
            event.event_id = 31;
            event.label = label;
            event.intval = 1;
            event.txtval = 'null';
            event.json_data = 'null';
            break;

    }

    return event;
}

function generatePHPRandomEvents(car) {
    var eventsLabel = ["CHARGE", "SW_BOOT", "SELFCLOSE", "CLEANLINESS", "SOS", "SHUTDOWN", "CAN_ANOMALIES"];
    return generatePHPEvents(eventsLabel[random(0, eventsLabel.length)], car);
}

function random(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}
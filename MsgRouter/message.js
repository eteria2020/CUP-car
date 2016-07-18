// Create MomentJS Module
const moment = require("moment");

class GenericMessage {
    constructor() {
        this._id = null;
        this._transport = {
            name: null,
            option: null
        };
        this._destination = null;
        this._type = null;
        this._subject = null;
        this._text = null;
        this._submitted = {
            date: null,
            meta: null
        };
        this._sent = {
            date: null,
            meta: null
        };
        this._acknowledged = null;
        this._meta = null;
    }

    get id() { return this._id; }
    get transport() { return this._transport; }
    get destination() { return this._destination; }
    get type() { return this._type; }
    get subject() { return this._subject; }
    get text() { return this._text; }
    get submitted() { return this._submitted; }
    get sent() { return this._sent; }
    get acknowledged() { return this._acknowledged; }

    get className() { return "GenericMessage"; }
    static get className() {
        return "GenericMessage";
    }

    set id(id) { this._id = id; }
    set transport(transport) { this._transport = transport; }
    set destination(destination) { this._destination = destination; }
    set type(type) { this._type = type; }
    set subject(subject) { this._subject = subject; }
    set text(text) { this._text = text; }
    set submitted(submitted) { this._submitted = submitted; }
    set sent(sent) { this._sent = sent; }
    set acknowledged(acknowledged) { this._acknowledged = acknowledged; }

    set(
        messageId,
        transportName,
        transportOptions,
        destination,
        typeName,
        subject,
        text,
        submittedDate,
        submittedMeta,
        sentDate,
        sentMeta,
        acknowledgedDate
    ) {
        try {
            this._id = messageId;
            this._transport = {
                name: transportName,
                option: transportOptions
            };
            this._destination = destination;
            this._type = {
                name: typeName
            };
            this._subject = subject;
            this._text = text;
            this._submitted = {
                date: submittedDate,
                meta: submittedMeta
            };
            this._sent = {
                date: sentDate,
                meta: submittedMeta
            };
            this._acknowledged = acknowledgedDate;
        } catch (error) {
            console.log("Error: ", error);
        }
        return this;
    }

    setFromMessageOutboxEntity(message) {
        try {
            return this.set(
                message.id,
                message.transport,
                message.transport_options,
                message.destination,
                message.type,
                message.subject,
                message.text,
                message.submitted,
                message.meta,
                message.sent,
                message.sent_meta,
                message.acknowledged
            );
        } catch (error) {
            console.error("Error: ", error);
        }
        // @TODO throw new Exeption 
        return null;
    }

    toHTMLString() {
        return "<b>Generic Messsage</b>" +
            "\n" +
            "\nText:\n<code>" + this.text + "</code>";
    }
}

class SOSMessage extends GenericMessage {
    constructor() {
        super();
        this._km = null;
        this._geo = null;
        this._imei = null;
        this._label = null;
        this._level = null;
        this._givenPhoneNumber = null;
        this._batteryLevel = null;
        this._trip = {
            id: null
        };
        this._event = {
            id: null
        };
        this._car = {
            plate: null
        };
        this._eventTime = null;
        this._customer = {
            id: null
        };
    }

    get className() { return "SOS"; }
    static get className() {
        return "SOS";
    }

    get km() { return this._km; }
    get geo() { return this._geo; }
    get imei() { return this._imei; }
    get label() { return this._label; }
    get level() { return this._level; }
    get givenPhoneNumber() { return this._givenPhoneNumber; }
    get batteryLevel() { return this._batteryLevel; }
    get trip() { return this._trip; }
    get event() { return this._event; }
    get car() { return this._car; }
    get eventTime() { return this._eventTime; }
    get customer() { return this._customer; }

    get latitude() {
        return parseDouble(this.geo.coordinates[1]);
    }

    get longitude() {
        return parseDouble(this.geo.coordinates[0]);
    }

    set km(km) { this._km = km; }
    set geo(geo) { this._geo = geo; }
    set imei(imei) { this._imei = imei; }
    set label(label) { this._label = label; }
    set level(level) { this._level = level; }
    set givenPhoneNumber(givenPhoneNumber) { this._givenPhoneNumber = givenPhoneNumber; }
    set batteryLevel(batteryLevel) { this._batteryLevel = batteryLevel; }
    set eventTime(eventTime) { this._eventTime = eventTime; }
    set customer(customer) {
        // @TODO Check instanceof customer
        this._customer = customer;
    }
    set trip(trip) {
        // @TODO Check instanceof trip
        this._trip = trip;
    }
	set event(event) {
        // @TODO Check instanceof event
        this._event = event;
    }
    set car(car) {
        // @TODO Check instanceof car
        this._car = car;
    }

    setFromMessageOutboxEntity(message) {
        try {
            super.setFromMessageOutboxEntity(message);
            this._km = message.meta.km;
            this._geo = message.meta.geo;
            this._imei = message.meta.imei;
            this._label = message.meta.label;
            this._level = message.meta.level;
            this._givenPhoneNumber = message.meta.txtval;
            this._batteryLevel = message.meta.battery;
            this._trip = {
                id: message.meta.trip_id
            };
            this._event = {
                id: message.meta.event_id
            };
            this._car = {
                plate: message.meta.car_plate
            };
            this._eventTime = moment(message.meta.event_time, "YYYY/MM/DD HH:mm:ss Z");
            this._customer = {
                id: message.meta.customer_id
            };
            return this;
        } catch (error) {
            console.error("Error: ", error);
        }
        // @TODO throw new Exeption 
        return null;
    }

    toString() {
        return "SOS Messsage\n" +
            "--------------------" +
            "Date: " + this.eventTime.toString() +
            "Customer ID: " + this.customer.id +
            "Trip ID: " + this.trip.id +
            "Given Number: " + this.givenPhoneNumber +
            "Car Plate: " + this.carPlate;
    }

    toHTMLString() {
        return "<b>SOS Messsage (ID: " + this.id + ")</b>" +
            "\n" +
            "\nDate: " + this.eventTime.format("YYYY-MM-DD HH:mm Z") +
            "\nCustomer: " + this.customer.name + " " + this.customer.surname +
            "\nCustomer ID: <a href=\"http://admin.sharengo.it/customers/edit/" + this.customer.id + "\">" + this.customer.id + "</a>" +
            "\nTrip ID: <a href=\"http://admin.sharengo.it/trips/details/" + this.trip.id + "\">" + this.trip.id + "</a>" +
            "\nGiven Number: " + this.givenPhoneNumber +
            "\nCar Plate: " + this.car.plate +
            "\nPosition: <a ng-href=\"https://maps.google.com/?q=" + this.geo.latitude + "," + this.geo.longitude + "\" target=\"_blank\" href=\"https://maps.google.com/?q=" + this.geo.latitude + "," + this.geo.longitude + "\">Open Google Map</a>" +
            "\nMore Details: <a href=\"http://admin.sharengo.it/notifications/details/" + this.id + "\">Admin Page</a>";
    }
}

module.exports.GenericMessage = GenericMessage;
module.exports.SOSMessage = SOSMessage;
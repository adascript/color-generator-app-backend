const express = require("express");
const app = express();
const https = require("https");
const dotenv = require("dotenv");
const awsIot = require("aws-iot-device-sdk");
dotenv.config();

const PORT = process.env.PORT;
const API_HOST = process.env.API_HOST;

var opts = {
    keyPath: process.env.KEY_PATH,
    certPath: process.env.CERT_PATH,
    caPath: process.env.ROOT_CA,
    clientId: process.env.CLIENT_ID,
    host: process.env.HOST_NAME
}
var thingShadow = awsIot.thingShadow(opts);
var clientTokenUpdate;

thingShadow.on("connect", function() {
    thingShadow.register("ColorPiRpi", {persistentSubscribe: true}, function() {
        let rgb = {"state":{"desired":{"r": 0, "g": 0, "b": 0}}};
        clientTokenUpdate = thingShadow.update("ColorPiRpi", rgb);
    })
})

express.static("/");
app.use(express.static("public"));

app.get("/generate-color", function(req, res, next) {
    var options = {
        host: API_HOST,
        path: "/api/v1/color"
    };
    
    var request = https.get(options, function(response) {
        var bodyChunks = [];
        response.on("data", function(chunk) {
            bodyChunks.push(chunk);
            console.log(JSON.parse(chunk));
        }).on("end", function() {
            var body = Buffer.concat(bodyChunks);
            var parsed = JSON.parse(body);
            var color = parsed.color;
            var rgb = color.rgb;
            res.status(200).send({
                status: "success",
                message: "here is your color!",
                color
            });
            let colorUpdate = {
                "state": {
                    "desired": {
                        "r": rgb.r,
                        "g": rgb.g,
                        "b": rgb.b
                    }
                }
            }
            thingShadow.update(process.env.CLIENT_ID, colorUpdate);
            console.log(colorUpdate);
            console.log(parsed);
        }).on("error", function(err) {
            console.log(err);
        });
    });

    request.on("error", function(e) {
        console.log(e.message);
    });
});

app.get("/get-all-colors", function(req, res) {
    var options = {
        host: API_HOST,
        path: "/api/v1/historical-colors"
    };

    var request = https.get(options, function(response) {
        var bodyChunks = [];
        response.on("data", function(chunk) {
            bodyChunks.push(chunk);
        }).on("end", function() {
            var body = Buffer.concat(bodyChunks);
            var parsed = JSON.parse(body);
            res.status(200).send({
                status: "success",
                message: "here are all the colors!",
                colors: parsed.colors
            });
        });
    });
    request.on("error", function(e) {
        console.log(e.message);
    });
});

app.listen(PORT, function startServer() {
    console.log(`Server listening on port ${PORT}`);
});
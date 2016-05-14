if (!process.env.PORT)
  process.env.PORT = 8080;

// Priprava strežnika
var express = require('express');
var streznik = express();
var path = require("path");

streznik.get('/', function (require, response) {
    response.sendfile('index.html');
});

streznik.get('/prijava', function (require, response) {
    response.sendfile('prijava.html');
});

streznik.listen(process.env.PORT, function() {
  console.log("Strežnik pognan!");
})
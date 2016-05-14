if (!process.env.PORT)
  process.env.PORT = 8080;

// Priprava strežnika
var express = require('express');
var streznik = express();
var path = require("path");
var expressSession = require('express-session');
streznik.use(express.static('public'));
streznik.use(
  expressSession({
    secret: 'NoDejNo', // Skrivni ključ za podpisovanje piškotkov
    saveUninitialized: true,    // Novo sejo shranimo
    resave: false,              // Ne zahtevamo ponovnega shranjevanja
    cookie: {
      maxAge: 3600000           // Seja poteče po 1h neaktivnosti
    }
  })
);

var glob=0;



streznik.get('/', function (require, response) {
    glob++;
    response.sendfile('index.html');
});

streznik.listen(process.env.PORT, function() {
  console.log("Strežnik pognan!");
})
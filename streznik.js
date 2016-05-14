if (!process.env.PORT)
  process.env.PORT = 8080;

// Priprava strežnika
var formidable = require("formidable");
var fs = require("fs");
var express = require('express');
var streznik = express();
var path = require("path");
var expressSession = require('express-session');
streznik.set('view engine', 'ejs');
//streznik.use(express.static('public'));
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

var users;



streznik.get('/', function (request, response) {
    if(!request.session.prijavljen){
        response.redirect('/prijava');
    } else {
      response.render('index');
    }
});

streznik.get('/odjava', function (request, response) {
    request.session.prijavljen = null;
    response.redirect('/prijava');
});

streznik.get('/nastavitve', function (request, response) {
    response.render('nastavitve');
});

streznik.post('/prijava', function (request, response) {
    var form = new formidable.IncomingForm();
    
    form.parse(request, function (napaka1, polja, datoteke) {
      
        
      for(var u in users)
        if(users[u][1] == polja['UserName']){
          if(users[u][2] == polja['Password']){
            request.session.prijavljen = users[u][0];
            break;
          }
        }
  
      response.redirect('/');
    });
});

streznik.get('/prijava', function (require, response) {
  response.render('prijava');
});

streznik.listen(process.env.PORT, function() {
  fs.readFile('users.txt', function (err, data) {
    if (err) {
        return console.error(err);
    }
    users = data.toString().split("\n");
    
    for(var user in users)
      users[user] = users[user].split(",");
  });
  
  console.log("Strežnik pognan!");
})
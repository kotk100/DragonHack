if (!process.env.PORT)
  process.env.PORT = 8080;

// Priprava strežnika
var formidable = require("formidable");
var fs = require("fs");
var express = require('express');
var streznik = express();
var path = require("path");
var expressSession = require('express-session');
var request = require('request');
var cheerio = require('cheerio');

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

var parsej = function(url, callback) {
  
  var vrstice = [];
  var barve = ["#ff0000", "#ff8000", "#ffff00", "#00ffbf", "#00ffff", "#0080ff", "#8000ff", "#bf00ff", "#ff00bf", "#ff0080", "#00bfff"];
  var barva = 0;
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(body);
      
      var index = 0;
      $('span').each(function(i, element){
        var a = $(this).text(); //vse v span-u
        var yo = a.split("\n"); //splitam v vrstice
        
        var asistent = "";
        var dan = "";
        var zacetek = "";
        var konec = "";
        var predavalnica = "";
        var nazivPredmeta = "";
        var vmesna = "";
        
        for(var x = 0; x < yo.length; x++) {
          if(x == 1){
            vmesna = yo[x].substring(16, yo[x].length-1).split(" ");
            dan = vmesna[0];
            zacetek = vmesna[1];
            konec = vmesna[3];
          }
          
          if(x==2){
            predavalnica = yo[x].substring(16, yo[x].length).split(" ")[0];
          }
          
          if(x==3){
            nazivPredmeta = yo[x].substring(16, yo[x].length-1);
          }
          
          if(x==5){
            vmesna = yo[x].substring(16, yo[x].length-1).split(",");
            asistent = vmesna[1].substring(1, vmesna[1].length)+" "+vmesna[0];
            continue;
          }
        }
        var objekt = {
          asistent: asistent,
          dan: dan,
          zacetek: zacetek,
          konec: konec,
          naziv: nazivPredmeta,
          predavalnica: predavalnica,
          barva: barve[barva]
        };
        //console.log(objekt.barva);
        barva = (barva+1)%11;
        
        vrstice[index] = objekt;
        //console.log(vrstice[index]);
        index++;
      });
      callback(vrstice);
    }
  });
  
};

streznik.get('/', function (request, response) {
    if(!request.session.prijavljen){
        response.redirect('/prijava');
    } else {
      var url = "https://urnik.fri.uni-lj.si/timetable/2015_2016_letni/allocations?student=63140099";
      parsej(url, function(vrstice){
        response.render('index', {
          stuff: vrstice
        });
      });
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
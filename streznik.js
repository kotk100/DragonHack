if (!process.env.PORT)
  process.env.PORT = 8080;

// Priprava strežnika
var formidable = require("formidable");
var fs = require("fs");
var express = require('express');
var streznik = express();
streznik.use(express.static('public'));
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

streznik.post('/nastavitve', function(request, response) {
    var form = new formidable.IncomingForm();
    form.parse(request, function (napaka1, polja, datoteke) {
        var fs = require('fs');
        fs.readFile('nastavitve.txt', 'utf8', function (err,data) {
          if (err) {
            return console.log("hahahaha");
          }
          else{
            var text = data.toString();
            var lines = text.split("\n");
            var prevozi;
            if(!polja.vehicle1)prevozi = 0 + ",";
            else prevozi = 1 + ",";
            if(!polja.vehicle2)prevozi += 0 + ",";
            else prevozi += 1 + ",";
            if(!polja.vehicle3)prevozi += 0 + ",";
            else prevozi += 1 + ",";
            if(!polja.vehicle4)prevozi += 0 + ",";
            else prevozi += 1 + ",";
            var podatki = request.session.prijavljen + "," + polja.StudentId + "," + polja.faculty + "," + polja.Station + "," + prevozi + polja.time + "," + polja.distance;
            var flag = 0;
            var endText;
            for(var i in lines){
              var curUsr = lines[i].split(",");
              if(request.session.prijavljen == curUsr[0]){
                lines[i] = podatki;
                endText = lines.join("\n");
                flag = 1;
                break;
              }
            }
            if(flag == 0){
              lines[lines.length] = podatki;
              endText = lines.join("\n");
            }
            console.log(lines);
            fs.writeFileSync("nastavitve.txt", endText, "UTF-8",{'flags': 'w+'}); 
            lines[lines.length] = podatki;

            response.redirect('/nastavitve');
          }
        });
    });
});



streznik.get('/nastavitve', function (request, response) {
  if(!request.session.prijavljen)
    response.redirect('/prijava');
  else {
    fs.readFile('nastavitve.txt', 'utf8', function (err,data) {
      if (err) {
        return console.log("nastavitve");
      } else {
        var text = data.toString();
        var lines = text.split("\n");
        
        for(var i in lines){
          var curUsr = lines[i].split(",");
          if(request.session.prijavljen == curUsr[0]){
            response.render('nastavitve', {nastavitve: curUsr});
          }
        }
      }
    });
  }
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
});


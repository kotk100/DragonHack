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

var prviNaDan = function(vrstice, callback) {
  var minDan = [];
  for(var x = 0; x < vrstice.length; x++) {
    var dan = vrstice[x].dan;
    switch(dan) {
      case "ponedeljek":  if(!minDan[0]) {
                           minDan[0] = vrstice[x];   
                          } else {
                            if(minDan[0].zacetek.split(":") > vrstice[x].zacetek.split(":"))
                              minDan[0] = vrstice[x];
                          }
                          break;
                          
      case "torek":       if(!minDan[1]) {
                           minDan[1] = vrstice[x];   
                          } else {
                            if(minDan[1].zacetek.split(":") > vrstice[x].zacetek.split(":"))
                              minDan[1] = vrstice[x];
                          }
                          break;
                          
      case "sreda":       if(!minDan[2]) {
                           minDan[2] = vrstice[x];   
                          } else {
                            if(minDan[2].zacetek.split(":") >vrstice[x].zacetek.split(":"))
                              minDan[2] = vrstice[x];
                          }
                          break;
                          
      case "četrtek":     if(!minDan[3]) {
                           minDan[3] = vrstice[x];   
                          } else {
                            if(minDan[3].zacetek.split(":") > vrstice[x].zacetek.split(":"))
                              minDan[3] = vrstice[x];
                          }
                          break;
                          
      case "petek":       if(!minDan[4]) {
                           minDan[4] = vrstice[x];   
                          } else {
                            if(minDan[4].zacetek.split(":") > vrstice[x].zacetek.split(":"))
                              minDan[4] = vrstice[x];
                          }
                          break;
                          
      default: console.log(dan);
    }
  }
  callback(minDan);
}

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
            nazivPredmeta = yo[x].substring(16, yo[x].length-1).split("(")[0];
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
      var url = "https://urnik.fri.uni-lj.si/timetable/2015_2016_letni/allocations?student=" + request.session.nastavitve[1];
      parsej(url, function(vrstice){
        prviNaDan(vrstice, function(dnevi){
          var d = new Date();
          var danId = d.getUTCDay();
          var hourId = d.getUTCHours() + 2;
          var povecam = 0;
          if(danId==6 || danId == 0) {
            povecam += (danId%5)+1;
            danId = 0;
          } else {
            if(hourId > parseInt(dnevi[danId].zacetek.split(":")[0])) {
              danId++;
              povecam++;
            }
          }
          var zaCofa = dnevi[danId].zacetek.split(":")[0] + ".00";
          //Cas ko se more student zbuditi
          vrniCasOdhoda(request, zaCofa, function(time){
            var timebujenja = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+(d.getDate()+povecam)+" "+Math.floor(time/60)+":"+time%60+":00";
            
            response.render('index', {
              stuff: vrstice,
              budilka: timebujenja
            });
          });
        });
      });
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
            request.session.nastavitve = podatki.split(",");
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
  
      fs.readFile('nastavitve.txt', 'utf8', function (err,data) {
        if (err) {
          return console.log("nastavitve");
        } else {
          var text = data.toString();
          var lines = text.split("\n");
          
          for(var i in lines){
            var curUsr = lines[i].split(",");
            if(request.session.prijavljen == curUsr[0]){
              request.session.nastavitve = curUsr;
              response.redirect('/');
            }
          }
        }
      });
    });
});

streznik.get('/prijava', function (require, response) {
  response.render('prijava');
});

streznik.get('/alarm', function(request, response) {
    response.render('alarm');
})


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
//Funkcija za vracanje casa odhoda
function vrniCasOdhoda(request, zacetek, callback){
  var vhod = request.session.nastavitve[3];
  
  vrniCasTrole(zacetek, vhod, function(casOdhoda){
    var casPriprave = request.session.nastavitve[8];
    var skupniCas = parseInt(casOdhoda.split(".")[0] * 60) + parseInt(casOdhoda.split(".")[1]) + parseInt(casPriprave);
    
    callback(skupniCas);
  });
}

//Funkcija za vracanje najugodnejsi termin trole
function vrniCasTrole(zacetek, vhod, callback){
  var fs = require('fs');
  fs.readFile('Trola.txt', 'utf8', function (err,data) {
    if (err) {
      return console.log("hahahaha");
    }
    var postaje = data.split("!"); 
    var zacPost;
    //console.log(postaje[0]);
    var i;
    for (i = 0; i < postaje.length; i++){
        zacPost = postaje[i].split(",");
        if(zacPost[0] == vhod){
            break;
        }
    }
    var add;
    var index, odhodniCasi;
    if(i == 7)return "0.00";
    if(i < 7){
      odhodniCasi = postaje[0].split(",");
      var maxCas = parseInt(zacetek.split(".")[0] * 60) + parseInt(zacetek.split(".")[1]) - 10;
      for(index = 1; index < odhodniCasi.length; index++){
        var cas = parseInt(odhodniCasi[index].split(".")[0] * 60) + parseInt(odhodniCasi[index].split(".")[1]);
        if(cas > maxCas){index--; break;}
      }
      
      
    }
    else {
      var maxCas = parseInt(zacetek.split(".")[0] * 60) + parseInt(zacetek.split(".")[1]) - 10;
      odhodniCasi = postaje[postaje.length - 1].split(",");
      for(index = 1; index < odhodniCasi.length; index++){
        var cas = parseInt(odhodniCasi[index].split(".")[0] * 60) + parseInt(odhodniCasi[index].split(".")[1]);
        if(cas > maxCas){index--; break;}
      }
    }
    
    //-10 popravi ce dodas nov urnik!!!!
    if(zacPost[0] == odhodniCasi[0]) callback(odhodniCasi[index]);
    var bestCas = parseInt(odhodniCasi[index].split(".")[0] * 60) + parseInt(odhodniCasi[index].split(".")[1]) + parseInt(zacPost[1]);
    
    callback(Math.floor(bestCas / 60) + "." + Math.floor(bestCas % 60));
  
  });
}

//Funkcija za kolo
function vrniCasOdhodaKolo(zacetek, callback){
  var razdalja = parseInt(request.session.nastavitve[9]);
  var casVoznje = Math.floor((razdalja/20) * 60);
  var casOdhoda = casVoznje + parseInt(zacetek.split(".")[0] * 60) + parseInt(zacetek.split(".")[1]) + parseInt(request.session.nastavitve[8]);
  callback(Math.floor(casOdhoda / 60) + "." + Math.floor(casOdhoda % 60));
}
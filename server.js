const express = require('express');
const app = express();
const fs = require('fs');
const Joi = require('joi');
const bodyParser = require('body-parser');
//Lista za spremanje osoba u JSON formatu
var adresarJSON = require('./adresar.json');
var ID = adresarJSON.id;
//Iterabilno polje 
var adresar = adresarJSON.adresar;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.listen(3000);


// Dohvacanje podataka o svim osobama (dohvacanje adresara)
app.get('/', (req,res) => {
    res.json(adresar);
})

//Dodavanje nove osobe
app.post('/add', (req, res) => {
    var person = {
        name: req.body.name,
        surname: req.body.surname,
        dateOfBirth: req.body.dateOfBirth,
        address: req.body.address,
        contact: req.body.contact,
    }

    var error = validateUser(person).error;

    if (error) {
        console.log("greska");
        res.status(400).json({error: {message: error.details[0].message}});
        return;
    }

    console.log("uspio");
    ID = ID + 1
    var length = 0;
    if (adresar) {
        length = adresar.length;
    }

    adresar[length] = {
        person: person,
        id: ID
    }

    storeToFile(adresar, ID);
    res.status(200).json(adresar[length]);
})

//Brisanje osoba iz adresara koje odgovaraju ID-u
app.post('/delete/:id', (req,res) => {
    var id = parseInt(req.params.id);
    var deleted = false;

    for (let i = 0; i < adresar.length; i++){
        if (adresar[i].id === id) {
            adresar.splice(i, 1);
            deleted = true;
        }
    }

    if (deleted) {
        storeToFile(adresar, ID);
        res.status(200).json({message: "Successfully deleted user"});
    }
    else {
        res.status(400).json({error: {message: "There are no users with that ID"}});
    }
})

//Pretraga korisnika prema kontakt podacima
app.post('/search', (req,res) => {
    //provjera jesu li poslani dobri podaci
    var error = validateSearchUpdate(req.body).error;

    if (error) {
        res.status(400).json({error: {message: error.details[0].message}});
        return;
    }

    var osobe = findUser(req, adresar);
    res.json(osobe);
})

//Izmjena podataka o korisnicima ovisno o ID-u, vraca update-ani objekt
app.patch('/update/:id', (req,res) => {
    var id = parseInt(req.params.id);
    var obj = undefined;
    for (user of adresar) {
        if (user.id === id) {
            obj = user;
        }
    }

    //provjera postoji li user s tim id-em
    if (!obj) {
        res.status(400).json({error: {message: "There are no users with that id"}});
        return;
    }

    var person = obj["person"];

    //smijemo mijenjati samo kontakt podatke i adresu
    var info = Object.keys(req.body);
    var error = validateSearchUpdate(req.body).error;

    if (error) {
        res.status(400).json({error: {message: error.details[0].message}});
        return;
    }

    for (key of info) {
        if (key === "address"){
            person[key] = req.body[key]
        }
        else {
            person["contact"][key] = req.body[key]
        }
    }

    storeToFile(adresar, ID);
    res.json(obj);
})

//Dohvat ID-a prema kontakt podacima korisnika
app.post('/getID', (req, res) => {
    var error = validateSearchUpdate(req.body).error;

    //provjera jesu li poslani dobri podaci
    if (error) {
        res.status(400).json({error: {message: error.details[0].message}});
        return;
    }

    var osobe = findUser(req,adresar);
    if (osobe.length === 0) {
        res.status(400).json({error: {message: "There are no users with provided information"}});
    }
    else {
        res.json({id: osobe[0].id});
    }

})

//Middleware za zahtjeve na stranice koje nisu podrzane
app.use((req,res,next) => {
   var error = new Error('Not found');
   res.status(404).json({error: {message: error.message}});

})

//spremanje adresara u memoriju
function storeToFile (adresar, ID) {
    fs.writeFile("./adresar.json", JSON.stringify({adresar: adresar, id: ID}), 'utf8', function (err) {
        if (err) {
            console.log(err)
        }
        console.log("Successfully saved file");
    })
}

//validacija podataka koje je korisnik poslao
function validateUser(person) {
    const schema = Joi.object({
        name: Joi.string().min(3).required(),
        surname: Joi.string().min(3).required(),
        dateOfBirth: Joi.date().iso().max('now').required(),
        address: Joi.string().required(),
        contact: Joi.object({
            email: Joi.string().email().required(),
            phoneNumber: Joi.string().length(10).pattern(/^[0-9]+$/).required()
        }).required()
    });

    return schema.validate(person);
}

//validacija unosa kontakt podataka i adrese za update i search
function validateSearchUpdate (person) {
    const schema = Joi.object({
        address: Joi.string(),
        email:Joi.string().email(),
        phoneNumber: Joi.string().length(10).pattern(/^[0-9]+$/)
    })

    return schema.validate(person);
}

/*
Pronalazanje usera iz adresara po podacima.
Vraca listu usera koji zadovoljavaju uvjet pretrage.
*/
function findUser(req, adresar) {
    var info = Object.keys(req.body);

    //lista osoba
    var osobe = [];

    for (user of adresar) {
        var found = true;
        for (podatak of info) {
            if (user.person.contact[podatak] !== req.body[podatak]) {
                found = false;
            }
        }
        if (found) {
            osobe.push(user);
        }
    }

    return osobe;
}

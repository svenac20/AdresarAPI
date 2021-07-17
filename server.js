const express = require('express');
const app = express();
const fs = require('fs');
const Joi = require('joi');
//Lista za spremanje osoba
var adresar = require('./adresar.json').adresar;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.listen(3000);

//Home page
app.get('/', (req, res) => {
    res.send("Welcome to my API");
});

// Dohvacanje podataka o svim osobama (dohvacanje adresara)
app.get('/all', (req,res) => {
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
        var error = {
            message: error.details[0].message
        }
        res.status(400).json(error)
    }
    else {
        console.log("uspio");
        var length = 0;
        if (adresar) {
            length = adresar.length;
        }

        adresar[length] = {
            person: person,
            id: length
        }

        storeToFile(adresar);
        res.status(200).json(person);
    }
})

//Brisanje osoba iz adresara koje zadovoljavaju parametre
app.post('/delete/:id', (req,res) => {
    var id = parseInt(req.params.id);
    var deleted = false;

    for (user of adresar){
        if (user.id === id) {
            adresar.splice(id, 1);
            deleted = true;
        }
    }

    if (deleted) {
        res.send("Successfully deleted users");
    }
    else {
        res.send("No users with that id");
    }
})

//Pretraga korisnika prema kontakt podacima
app.post('/search', (req,res) => {
    //kljucevi po kojima pretrazujemo (adresa, ime ...)
    var osobe = findUser(req, adresar);
    res.json(osobe);
})

//Izmjena podataka o korisnicima ovisno o ID-u, vraca update-ani objekt
app.patch('/update/:id', (req,res) => {
    var id = parseInt(req.params.id);
    var obj = adresar[id];
    var person = obj.person;
    //smijemo mijenjati samo kontakt podatke i adresu
    var info = Object.keys(req.body);

    for (key of info) {
        person[key] = req.body[key];
    }

    storeToFile(adresar);
    res.json(obj);

})

//Middleware za zahtjeve na stranice koje nisu podrzane
app.use((req,res,next) => {
   var error = new Error('Not found');
   res.status(404).json({error: {message: error.message}});

})

//spremanje adresara u memoriju
function storeToFile (adresar) {
    fs.writeFile("./adresar.json", JSON.stringify({adresar: adresar}), 'utf8', function (err) {
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
        contact: {
            email: Joi.string().email().required(),
            phoneNumber: Joi.string().length(10).pattern(/^[0-9]+$/).required()
        }
    });

    return schema.validate(person);
}

//pronalazanje usera iz adresara po kontakt podacima
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


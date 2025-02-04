let Utente = require("../model/Utente");
let RichiestaTesseramento = require("../model/Richiesta_tesseramento");
let crypto = require("crypto");
let fs = require("fs");
let { validationResult } = require("express-validator");
let senderEmail = require("../utils/sendEmail");
let { Op } = require("sequelize");
let Fattura = require("../model/Fattura");


/**
 * Nome metodo: Login
 * Descrizione: Metodo che permette di effettuare il login
 * Parametri: email e password
 * Return: Codice, msg, boolean true/false in base alla riuscita dell'operazione e dati dell'utente
 * Autore : Giuseppe Scafa
 */
exports.login = async (req, res) => {
    //Check consistenza parametri richiesta
    let erroriValidazione = validationResult(req);
    if (!erroriValidazione.isEmpty()) {
        return res
            .status(400)
            .json({ code: 400, error: erroriValidazione.array(), success: false });
    }

    let pw = crypto.createHash("sha512").update(req.body.password).digest("hex");
    await Utente.findOne({
        where: { email: req.body.email, password: pw, isCancellato: 0 },
        attributes: {
            exclude: [
                "password",
                "isCancellato",
                "tokenRecuperoPassword",
                "dataScadenzaTokenRP",
            ],
        },
    })
        .then((result) => {
            if (result && !result.isCancellato) {
                res.status(200).json({ code: 200, utente: result, success: true });
            } else {
                res
                    .status(400)
                    .json({ code: 400, msg: "Utente non trovato", success: false });
            }
        });
};

/**
 * Nome metodo: Registrazione
 * Descrizione: Metodo che permette di effettuare la registrazione di un utente
 * Parametri: Informazioni utente
 * Return: Codice, msg, boolean true/false in base alla riuscita dell'operazione
 * Autore : Matteo Della Rocca
 */
exports.registrazione = async (req, res) => {
    //Check consistenza parametri richiesta
    let erroriValidazione = validationResult(req);
    if (!erroriValidazione.isEmpty()) {
        return res
            .status(400)
            .json({ code: 400, error: erroriValidazione.array(), success: false });
    }
    let { ...utenteDaRegistrare } = { ...req.body };

    await Utente.findOne({
        where: {
            codiceFiscale: utenteDaRegistrare.codiceFiscale,
            email: utenteDaRegistrare.email,
        },
    })
        .then(async (userCheck) => {
            if (userCheck && userCheck.isCancellato) {
                //Utente già registrato, ma cancellato

                await Utente.update(
                    //Modifico soltanto i campi e riattivo l'utente
                    {
                        nome: utenteDaRegistrare.nome,
                        cognome: utenteDaRegistrare.cognome,
                        dataNascita: utenteDaRegistrare.dataNascita,
                        nazionalita: utenteDaRegistrare.nazionalita,
                        isCancellato: 0,
                        password: utenteDaRegistrare.password,
                        indirizzoResidenza: utenteDaRegistrare.indirizzoResidenza,
                        numeroTelefono: utenteDaRegistrare.numeroTelefono,
                    },
                    {
                        individualHooks: true,
                        where: {
                            idUtente: userCheck.idUtente,
                        },
                    }
                )
                    .then(() => {
                        
                        res.status(201).json({
                            code: 201,
                            msg: "Registrazione effettuata con successo",
                            success: true,
                        });
                    });
            } else {
                await Utente.create(utenteDaRegistrare)
                    .then(() => {
                        
                        res.status(201).json({
                            code: 201,
                            msg: "Registrazione effettuata con successo",
                            success: true,
                        });
                        
                    });
            }
        });
};

/**
 * Nome metodo: modificaPassword
 * Descrizione: Metodo che permette di effettuare la modifica della password di un utente
 * Parametri: Password modificata e ID Utente
 * Return: Codice, msg, boolean true/false in base alla riuscita dell'operazione
 * Autore : Matteo Della Rocca
 */
exports.modificaPassword = async (req, res) => {
    //Check consistenza parametri richiesta
    let erroriValidazione = validationResult(req);
    if (!erroriValidazione.isEmpty()) {
        return res
            .status(400)
            .json({ code: 400, error: erroriValidazione.array(), success: false });
    }

    let idUtente = req.body.idUtente;
    let passwordModificata = req.body.password;

    await Utente.update(
        { password: passwordModificata },
        { individualHooks: true, where: { idUtente: idUtente } }
    )
        .then(() => {
            
            res.status(200).json({
                code: 200,
                msg: "Password modificata con successo",
                success: true,
            });
            
        });
};

/**
 * Nome metodo: Cancella Account
 * Descrizione: Metodo che permette di cancellare l'account di un utente
 * Parametri: Id utente
 * Return: Codice, msg, boolean true/false in base alla riuscita dell'operazione
 * Autore : Giuseppe Scafa
 */

exports.cancellaAccount = async (req, res) => {
    let erroriValidazione = validationResult(req);
    if (!erroriValidazione.isEmpty()) {
        return res
            .status(400)
            .json({ code: 400, error: erroriValidazione.array(), success: false });
    }

    await Utente.update(
        { isCancellato: 1 },
        { where: { idUtente: req.query.idUtente } }
    )
        .then(
            res
                .status(200)
                .json({ code: 200, msg: "Cancellazione riuscita", success: true })
        );
    
};

/**
 * Nome metodo: visualizzaDatiUtente
 * Descrizione: Metodo che permette di ottenere le informazioni di un utente
 * Parametri: Id utente
 * Return: Codice, msg, boolean true/false in base alla riuscita dell'operazione e dati dell'utente
 * Autore : Giuseppe Scafa
 */
exports.visualizzaDatiUtente = async (req, res) => {
    await Utente.findOne({
        attributes: [
            "nome",
            "cognome",
            "email",
            "codiceFiscale",
            "indirizzoResidenza",
            "numeroTelefono",
            "dataNascita",
            "nazionalita",
        ],
        where: {
            idUtente: req.query.id,
            isCancellato: 0
        },
    })
        .then((result) => {
            if (result) {
                res.status(200).json({ code: 200, utente: result, success: true });
            } else {
                res
                    .status(400)
                    .json({ code: 400, msg: "Utente non trovato", success: false });
            }
        });
};

/**
 * Nome metodo: effettuaTesseramento
 * Descrizione: Metodo che permette di creare una richiesta di tesseramento
 * Parametri: dati dell'utente e file
 * Return: Codice, msg, boolean true/false in base alla riuscita dell'operazione
 * Autore : Giuseppe Scafa
 */

exports.effettuaTesseramento = async (req, res) => {
    let erroriValidazione = validationResult(req);
    if (!erroriValidazione.isEmpty()) {
        return res
            .status(400)
            .json({ code: 400, error: erroriValidazione.array(), success: false });
    }

    let filePath = "/static/richieste_tesseramento/" + req.body.idUtente;
    let nuovaRichiesta = {
        dataRichiesta: new Date().toISOString().substring(0, 10),
        tipologiaTesseramento: req.body.tipologiaTesseramento,
        statusRichiesta: "Eseguita",
        certificatoAllegatoPath: filePath,
        utente: req.body.idUtente,
    };

    if (req.body.tipologiaTesseramento === "Interno")
        nuovaRichiesta.prezzoTesseramento = 12.0;
    else nuovaRichiesta.prezzoTesseramento = 20.0;

    await RichiestaTesseramento.create(nuovaRichiesta)
        .then((result) => {
           
            fs.mkdir("." + filePath, (err) => {
                if (err) {
                    return res.status(400).json({
                        code: 400,
                        msg: "Errore nella creazione della directory",
                        success: false,
                    });
                } else {
                    req.files.file.mv("." + filePath + "/certificato.pdf");
                    let nuovaFattura = {
                        intestatario: req.body.intestatarioCarta,
                        totalePagamento: result.prezzoTesseramento,
                        dataRilascio: new Date(new Date().getTime())
                            .toISOString()
                            .substring(0, 10),
                        statusFattura: "Pagata",
                        richiesta: result.idRichiesta_tesseramento,
                    };

                    Fattura.create(nuovaFattura)
                        .then((reslt) => {
                            if (reslt){
                                return res.status(200).json({
                                    code: 200,
                                    msg: "Operazione effettuata con successo",
                                    success: true,
                                });
                            }
                        });
                }
            });
            
        });
};

/**
 * Nome metodo: recuperoPassword
 * Descrizione: Metodo che permette di effettuare una richiesta di recupero della password
 * Parametri: email utente
 * Return: Codice, msg, boolean true/false in base alla riuscita dell'operazione
 * Autore : Matteo Della Rocca
 */
exports.recuperoPassword = async (req, res) => {
    //Check consistenza parametri richiesta
    let erroriValidazione = validationResult(req);
    if (!erroriValidazione.isEmpty()) {
        return res
            .status(400)
            .json({ code: 400, error: erroriValidazione.array(), success: false });
    }

    let emailRicevuta = req.body.email;
    let token = crypto
        .createHash("sha512")
        .update(emailRicevuta + new Date().toISOString())
        .digest("hex");

    Utente.update(
    //Il token dura 24h
        {
            tokenRecuperoPassword: token,
            dataScadenzaTokenRP: new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
                .toISOString()
                .substring(0, 10),
        },
        { where: { email: emailRicevuta } }
    )
        .then(async () => {
            
            await senderEmail.sendEmailWithToken(emailRicevuta, token);
            res
                .status(200)
                .json({
                    code: 200,
                    msg: "Invio email di recupero riuscito",
                    success: true,
                })
                .end();
            
        });
    
};

/**
 * Nome metodo: resettaPasswordPerRecupero
 * Descrizione: Metodo che permette di resettare la password dopo aver chiesto il recupero
 * Parametri: password modificata
 * Return: Codice, msg, boolean true/false in base alla riuscita dell'operazione
 * Autore : Matteo Della Rocca
 */
exports.resettaPasswordPerRecupero = async (req, res) => {
    let erroriValidazione = validationResult(req);
    if (!erroriValidazione.isEmpty()) {
        return res
            .status(400)
            .json({ code: 400, error: erroriValidazione.array(), success: false });
    }

    let token = req.params.token;
    let passwordModificata = req.body.password;

    await Utente.findOne({
        where: {
            tokenRecuperoPassword: token,
            dataScadenzaTokenRP: {
                [Op.gt]: new Date().toISOString().substring(0, 10),
            }, //Data Scadenza > DataOggi
        },
    })
        .then((result) => {
            if (!result) {
                res
                    .status(400)
                    .json({
                        code: 400,
                        msg: "Token scaduto o non valido",
                        success: false,
                    })
                    .end();
            } else {
                Utente.update(
                    {
                        password: passwordModificata,
                        tokenRecuperoPassword: null,
                        dataScadenzaTokenRP: null,
                    }, //rendo di nuovo recuperabile la password
                    { individualHooks: true, where: { tokenRecuperoPassword: token } }
                )
                    .then(() => {
                        
                        res.status(200).json({
                            code: 200,
                            msg: "Password modificata con successo",
                            success: true,
                        });
                    }
                       
                    );
            }  
        });
  
};

var database = require("./database");
var web3 = require("web3");
var sigUtil = require("eth-sig-util");

/*
exports.login = function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var ip = req.ip;

    database.validateUser(username, password, (err, userId) => {
        if(err) {
            return res.render("index", {login: true, user: false, err:"Invalid credentials"})
        }
        database.createSession(userId, (err, sessionId) => {
            res.cookie('id', sessionId, {httpOnly: true, expiration: new Date() + 60*60});
            res.redirect("/");
        });
        
    });
}
*/

exports.logout = function(req, res, next) {
    var userId = req.user.id;
    console.log(userId);
    if(userId) {
        database.deleteSessionById(userId, undefined);
        res.clearCookie("id");
        res.redirect("/");
    }
}

exports.nonce = function(req, res, next) {
    var address = req.body.data;
    database.getDataByAddress(address, (err, data) => {
        if(err) {
            console.log("no user found, generating firt time nonce...");
            database.createUser(address, (err, data) => {
                if(err) {
                    return;
                }
                res.json(data);
            });
        } else {
            console.log("nonce sent: " + data.nonce);
            res.json(data.nonce);
        }
    });
}

exports.auth = function(req, res, next) {
    // returns nonce, sig
    // we can recover public address by the nonce and signed nonce
    const recovered = sigUtil.recoverPersonalSignature(req.body);
    const nonce = req.body.data;
    database.getDataByAddress(recovered, (err, data) => {
        if(err) {

        } else {
            if(data.nonce === nonce) {
                console.log("Login success: user " + recovered);
                database.createSession(data.id, (err, data) => {
                    res.cookie('id', data, {httpOnly: false, maxAge: 1000 * 60 * 60});
                    res.end();
                });
            }
        }
    });
}
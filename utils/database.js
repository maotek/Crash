var pg = require("pg");
const dbUrl = require("./config")["dbCon"];
const bankRoll = require("./config")["bankRoll"]
var client = new pg.Client(dbUrl);
var uuid = require("uuid");
var Web3 = require("web3");
client.connect();
var web3 = new Web3(new Web3.providers.HttpProvider("https://api.harmony.one"));


client.query(`
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
`)

client.query(`
CREATE TABLE users(
    id INTEGER NOT NULL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    address CHAR(42) NOT NULL UNIQUE,
    balance DECIMAL(8,2) NOT NULL DEFAULT 0,
    nonce CHAR(42) NOT NULL
);

CREATE INDEX users_username ON users(username);
CREATE INDEX users_address ON users(address);

CREATE SEQUENCE users_id_seq OWNED BY users.id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');

CREATE TABLE sessions(
	sessionId UUID NOT NULL PRIMARY KEY,
	userId INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE wallets(
    userId INTEGER NOT NULL PRIMARY KEY REFERENCES users(id),
    address CHAR(42) NOT NULL UNIQUE,
    pkey CHAR(66) NOT NULL
);
`)

exports.createSession = function(userId, callback) {
    var sessionId = uuid.v4();
    client.query("INSERT INTO sessions VALUES (($1),($2))", [sessionId, userId], (err, data) => {
        return callback(undefined, sessionId);
    });
}

exports.getUserBySessionId = function(uuid, callback) {
    client.query("SELECT * FROM sessions WHERE sessionId = ($1);", [uuid], (err, data) => {
        if(data.rows.length === 0) {
            return callback(undefined, undefined);
        }
        var id = data.rows[0].userid;
        client.query("SELECT * FROM users WHERE id = ($1);", [id], (err, data_) => {
            return callback(undefined, data_.rows[0]);
        });
    });
}

exports.deleteSessionById = function(userId, callback) {
    client.query("DELETE FROM sessions WHERE userId = ($1);", [userId], (err, data) => {});
}

exports.getDataByAddress = function(address, callback) {
    client.query("SELECT * FROM users WHERE address = ($1);", [address], (err, data) => {
        if(data.rows.length === 0) {
            callback("Error");
        } else {
            callback(undefined, data.rows[0]);
        }
    });
}

exports.createUser = function(address, callback) {
    let nonce = Web3.utils.randomHex(20);
    client.query("INSERT INTO users(username, address, nonce) VALUES (($1), ($2), ($3));", [address, address, nonce], (err, data) => {
        if(err) {
            console.log("Error creating first time nonce for user.");
            return callback("Error");
        }
        client.query("SELECT id FROM users WHERE address = ($1);", [address], (err, data) => {
                var id = data.rows[0].id;
                var acc = web3.eth.accounts.create();
                client.query("INSERT INTO wallets VALUES(($1), ($2), ($3));", [id, acc.address, acc.privateKey], (err, data) => {
                    console.log("[WALLET CREATED] " + acc.address + " " + acc.privateKey);
                    return;
                });
            });
        return callback(undefined, nonce);
    });
}

exports.reduceFunds = function(userId, funds, callback) {
    client.query("UPDATE users SET balance = balance - ($1) WHERE id = ($2);", [funds, userId]);
    client.query("SELECT balance FROM users WHERE id = ($1);", [userId], (err, data) => {
        if(!err) {callback(undefined, data.rows[0].balance);}
    });
}

exports.increaseFunds = function(userId, funds, callback) {
    client.query("UPDATE users SET balance = balance + ($1) WHERE id = ($2);", [funds, userId]);
    client.query("SELECT balance FROM users WHERE id = ($1);", [userId], (err, data) => {
        if(!err) {callback(undefined, data.rows[0].balance);}
    });
}

exports.temp = function() {
    client.query("UPDATE users SET balance = 2000;");
}

exports.deposit = function (req, res, next) {
    var userId = req.user.id;
    client.query("SELECT address FROM wallets WHERE userID = ($1);", [userId], (err, data) => {
        res.json(data.rows[0].address);
    });
}






var currentPayouts = []; // make sure does not submit transaction multiple times
setInterval(async () => {
 
    // var balance = await web3.eth.getBalance(bankRoll);
    // console.log("Starting checking for deposits...");
    var txFee = await web3.eth.getGasPrice() * 21000;
    client.query("SELECT * FROM wallets;", [], async (err, data) => {
        for (let i of data.rows) {
            let balance = await web3.eth.getBalance(i.address);
            if ((web3.utils.fromWei(balance.toString()) > 1) && !currentPayouts.includes(i.userid))  {
                console.log("TRANSFERRING " + web3.utils.fromWei(balance.toString()));
                currentPayouts.push(i.userid);
                const transaction = {
                    'to': bankRoll,
                    'value': (balance - txFee).toString(),
                    'gas': "21000",
                };
                const signedTx = await web3.eth.accounts.signTransaction(
                    transaction, i.pkey);

                web3.eth.sendSignedTransaction(signedTx.rawTransaction, function (error, hash) {
                    if (!error) {
                        console.log("The hash of your transaction is: ", hash);
                        console.log("Adding funds to user...");
                        exports.increaseFunds(i.userid, web3.utils.fromWei(Math.floor(balance).toString()),(err, res)=>{});

                    } else {
                        console.log("Something went wrong while submitting your transaction: ", error)
                    }
                });
                // balance = await web3.eth.getBalance(i.address);
                // console.log("new balance: " + balance);
            } else {
                // TODO: what is this else case? Is it necessary?
                const index = currentPayouts.indexOf(i.userid);
                if (index > -1) { // only splice array when item is found
                    currentPayouts.splice(index, 1); // 2nd parameter means remove one item only
                }
            }
        }
    });

    // const createTransaction = await web3.eth.accounts.signTransaction(
    //     {
    //       from: addressFrom,
    //       to: bankRoll,
    //       value: web3.utils.toWei('100','ether'),
    //       gas: '21000',
    //     }, privKey);

}, 5000);
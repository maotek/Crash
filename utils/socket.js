var eng = require("./engine");
var database = require("./database");

var users = []; // all users connected
function socket(websocket, engine) {
    // engine.players = users;
    websocket.on("connection", (ws) => {
        users.push(ws);
        // console.log("Usercount: ", users.length);
        ws.on('message', (data) => {onMessage(data, ws, engine);});
        ws.on("error", (err) => {console.log("[SOCKET ERROR]");});
        ws.on("close", (code) => {console.log("[SOCKET CLOSED]");});
      });
}

function onMessage(payload, ws, engine) {
    var data = JSON.parse(payload);
    switch (data.type) {
        case "CHAT": 
            chat(data);
            break;
        case "BET":
            bet(data, ws, engine);
            break;
        case "CASHOUT":
            cashout(data.session, ws, engine);
            break;
        case "SYNC": // resync reconnection to existing player
            engine.resync(data.session, ws);
            break;
        case "tbn":
            database.temp();
            break;
    }
}

function chat(payload) {
    database.getUserBySessionId(payload.session, (err, data) => {
        send(JSON.stringify({type: "CHAT", msg: data.username.substring(2, 8) + ": " + payload.data}));
    });
}

function send(msg) {
    var i = users.length;
    while (i--) {
        let s = users[i];
        if (s.readyState <= 1) {
            s.send(msg);
        } else {
            users.splice(i, 1);
            s.close();
        }
    }
}

function bet(data, ws, engine) {
    database.getUserBySessionId(data.session, (err, userData) => {
        if (err) {return;}
        betData = data.data;

        if(engine.containsUser(userData.id)) {
            return declineBet(ws, "Already betted");
        }
        if(engine.status !== "WAIT") {
            return declineBet(ws, "Wait for next round");
        }
        if(eng.validateBet(betData.bet, betData.cashout)) {

            //check for balance
            if(userData.balance < betData.bet) {
                return declineBet(ws, "Not enough funds");
            }

            // TODO: what if user refreshes (new websocket created) middle of a bet?
            

            // set userId to websocket to check whether it has already betted
            ws.userId = userData.id;
            ws.session = data.session;
            processBet(betData, ws, engine);
        } else {
            declineBet(ws, "Invalid bet");
        }
    });
}

function processBet(data, ws, engine) {
    engine.add(ws, data.bet, data.cashout);
}

function declineBet(ws, error) {
    ws.send(JSON.stringify({type:"INV", msg:error}));
}

function cashout(session, ws, engine) {
    database.getUserBySessionId(session, (err, userData) => {
        engine.manualCashout(userData.id);
    })
}

exports.init = function(wss, engine) {
    socket(wss, engine);
}

exports.send = send;

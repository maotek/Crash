var crypto = require("crypto");
var web3 = require("web3");
var socket = require("./socket");
var database = require("./database");

var pingInterval = 10; // ping client every 100ms
var waitTime = 5000; // waiting for players
var endGameTime = 3000; // wait at crashpoint

function engine(initHash) {
    var self = this;

    self.hash = initHash;
    self.crashpoint;
    self.status;
    self.duration;

    self.elapsed = 0;
    self.left = 0;
    self.bets = [];


    // utility methods
    self.add = (ws, bet, cashout) => {
        console.log("New bet incoming: " + bet + " with cashout: " + cashout);
        self.bets.push([ws, bet, cashout, false]); // last boolean is cashedOut, whether player already cashed out

        //subtract funds
        database.reduceFunds(ws.userId, bet, (err, newFunds)=> {
           //notify user
            ws.send(JSON.stringify({type:"FUND", value:newFunds})); 
        });
        //switch user's betDiv to cashoutDiv
        ws.send(JSON.stringify({type:"INGAME"}));
    }

    self.containsUser = (userId) => {
        for(let i of self.bets) {
            if(i[0].userId === userId) {return true;}
            else {return false;}
        }
    }

    self.resync = (session, ws) => {
        for(let i of self.bets) {
            if(i[0].session === session) {
                ws.userId = i[0].userId;
                ws.session = session;
                i[0] = ws;
            }
        }
    }    
    
    self.manualCashout = (userId) => {
        for(let i of self.bets) {
            if((self.status === "TICK") && (userId === i[0].userId) && !i[3]) {
                console.log("Somebody cashed out!");
                var crashpoint = growthFunc(self.elapsed)/100;
                database.increaseFunds(i[0].userId, i[1] * crashpoint, (err, data) => {
                    if (i[0].readyState >1) {return}
                    i[0].send(JSON.stringify({type:"FUND", value:data}));
                    i[3] = true;
                });
            }
        }
    }

    function start() {
        self.hash = genGameHash(self.hash);
        self.crashpoint = crashPointFromHash(self.hash);
        self.duration = inverseGrowth(self.crashpoint);
        console.log("NEW RASHPOINT: " + self.crashpoint);
        console.log("NEW DURATION: " + self.duration);
        self.bets = [];
        self.status = "WAIT";
        
        //reset the players' cashout modal
        socket.send(JSON.stringify({type: "R"}));
        waitForPlayers();
    }

    function waitForPlayers() { 
        self.status = "WAIT";
        var left = waitTime - self.elapsed;
        var nextTick = Math.max(0, Math.min(left, pingInterval));
        
        if (nextTick != 0) {
            setTimeout(waitPing, nextTick);
        } else {
            self.elapsed = 0; // reset elapsed to use for game ticks
            self.status = "TICK";
            gameTick();
        }
    }

    function gameTick() {
        var left = self.duration - self.elapsed;
        var nextTick = Math.max(0, Math.min(left, pingInterval));

        if (nextTick != 0) {
            setTimeout(gamePing, nextTick);
        } else {
            self.elapsed = 0; // reset elapsed to use for game ticks
            self.status = "END";
            endGame();
        }
    }

    function endGame() {
        self.status = "END";
        var left = endGameTime - self.elapsed;
        var nextTick = Math.max(0, Math.min(left, pingInterval));
        
        if (nextTick != 0) {
            setTimeout(endPing, nextTick);
        } else {
            self.elapsed = 0; // reset elapsed to use for game ticks
            start();
        }
    }

    function gamePing() {
        self.elapsed += pingInterval;
        socket.send(JSON.stringify({type: "TICK", elapsed: self.elapsed}));

        notifyPlayersInGame();
        autoCashout(growthFunc(self.elapsed)/100);

        gameTick();
    }

    function waitPing() {
        self.elapsed += pingInterval;
        socket.send(JSON.stringify({type: "WAIT", left: Math.ceil((waitTime - self.elapsed) / 1000)}));

        notifyPlayersInGame();
        waitForPlayers();
    }

    function endPing() {
        self.elapsed += pingInterval;
        socket.send(JSON.stringify({type: "CRASH", crashpoint: self.crashpoint}));

        endGame();
    }

    function autoCashout(crashpoint) {
        for(let i of self.bets) {
            var cashout = i[2];
            if(cashout == crashpoint && !i[3]) {
                console.log("Somebody cashed out!");
                database.increaseFunds(i[0].userId, i[1] * crashpoint, (err, data) => {
                    if (i[0].readyState >1) {return}
                    i[0].send(JSON.stringify({type:"FUND", value:data}));
                    i[3] = true;
                });
            }
        }
    }

    function notifyPlayersInGame() {
        for(let i of self.bets) {
            if (i[0].readyState >1) {return}
            i[0].send(JSON.stringify({type:"INGAME", value:i[1], cashedOut: i[3]}));
        }
    }

    start()
}

/*

THE FOLLOWING CODE IS COPY PASTA FROM BUSTABIT V1

*/
function growthFunc(ms) {
    var r = 0.00006;
    return Math.floor(100 * Math.pow(Math.E, r * ms));
}

function inverseGrowth(result) {
    var c = 16666.666667;
    return c * Math.log(0.01 * result);
}

function divisible(hash, mod) {
    // We will read in 4 hex at a time, but the first chunk might be a bit smaller
    // So ABCDEFGHIJ should be chunked like  AB CDEF GHIJ
    var val = 0;
    var o = hash.length % 4;
    for (var i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
        val = ((val << 16) + parseInt(hash.substring(i, i+4), 16)) % mod;
    }
    return val === 0;
}

function genGameHash(serverSeed) {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
};

var clientSeed = '000000000000000007a9a31ff7f07463d91af6b5454241d5faf282e5e0fe1b3a';

function crashPointFromHash(serverSeed) {
    var hash = crypto.createHmac('sha256', serverSeed).update(clientSeed).digest('hex');

    // In 1 of 101 games the game crashes instantly.
    if (divisible(hash, 101))
        return 0;

    // Use the most significant 52-bit from the hash to calculate the crash point
    var h = parseInt(hash.slice(0,52/4),16);
    var e = Math.pow(2,52);

    return Math.floor((100 * e - h) / (e - h));
};

/*

Utility methods

*/
function validateBet(bet, cashout) {
    if(!isNumeric(bet) || !isNumeric(cashout)) {
        return false;
    }

    if(bet <= 0 || cashout <= 1) {
        return false;
    }

    if (bet.toString().split(".").length > 2 || cashout.toString().split(".").length > 2) {
        return false;
    } 
    
    if(bet.toString().split(".").length === 2) {
        if(bet.toString().split(".")[1].length > 2) {
            return false;
        }
    }

    if(cashout.toString().split(".").length === 2) {
        if(cashout.toString().split(".")[1].length > 2) {
            return false;
        }
    }

    return true;
}

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

exports.init = function() {
    return new engine(web3.utils.randomHex(32));
};

exports.validateBet = validateBet;
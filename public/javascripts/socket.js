var betted = false;  // false: not ingame, true: ingame
var elapsed = 0;
var gameState = undefined;
var synchronized = false;
var cashedOut = false;
var socket = new WebSocket("ws://localhost:3000");

function connect() {
    chatListener(socket);
    betListener(socket);
    cashoutListener(socket);
    betInit();
    socket.onmessage = (event) => {
        var data = JSON.parse(event.data);
        switch (data.type) {
            case "CHAT":
                chat(data.msg);
                break;
            case "WAIT":
                gameState = "WAIT";
                waiting(data.left);
                break;
            case "TICK":
                gameState = "TICK"
                tick(data.elapsed);

                // If user refreshes browser in the middle of a bet
                // TODO: change to one request right after refresh
                if(!synchronized) {
                socket.send(JSON.stringify({type:"SYNC", session: document.cookie.split(";")[0].split("=")[1]}));  
                }
                
                break;
            case "CRASH":
                gameState = "CRASH"
                crash(data.crashpoint == 0 ? 100 : data.crashpoint);
                break;
            case "BET":
                betHandler(data.bet);
                break;
            case "INV":
                invalidBetHandler(data.msg);
                break;
            case "FUND":
                changeFunds(data.value);
                break;
            case "INGAME":
                ingame(data.value, data.cashedOut);
                break;
            case "R":
                showBet();
                break;
            default:
                // console.log(data);
        }
    }
    
    socket.onclose = (e) => {
        console.log('Reconnecting...');
        setTimeout(function () {
            connect();
        }, 1000);
    };
}

function chat(chatmsg) {
    var e = document.querySelector("#chatview");
    var o = document.createElement("li");
    var time = document.createElement("span");
    time.id = "msg";
    time.textContent = new Date().toLocaleTimeString().substring(0, 5) + " ";
    time.style = "color: gray";
    var msg = document.createElement("span");
    msg.textContent = chatmsg;
    msg.id = "msg";
    o.appendChild(time);
    o.appendChild(msg);
    e.appendChild(o);
    e.scrollTop = e.scrollHeight;
}

function waiting(left) {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width, canvas.height);
    drawGrid();
    mult.style.color = "aqua";
    mult.textContent = "STARTING IN " + left;
}

function crash(crashpoint) {
    mult.style.color = "red";
    mult.textContent = "CRASH " + (Number(crashpoint)/100).toFixed(2) + " ×";

    var e = document.querySelector("#cashouttext");
    if(e) {
        e.textContent = "BUST!";
        e.style.color = "RED";
    }
}

function tick(elapsed) {
    mult.style.color = "aqua";
    window.elapsed = elapsed;
    var multiplier = growthFunc(elapsed);
    mult.textContent = (multiplier / 100).toFixed(2) + " ×";
    drawSlope(elapsed);
}

function growthFunc(ms) {
    var r = 0.00006;
    return Math.floor(100 * Math.pow(Math.E, r * ms));
}

function chatListener(socket) {
    var chatform = document.querySelector("#chatform");
    var chatinput = document.querySelector("#chatinput");
    if (chatform) {
        chatform.addEventListener("submit", (event) => {
            event.preventDefault();
            if (chatinput.value == "") { return; }
            var cookie = document.cookie.split(";");
            socket.send(JSON.stringify({ type: "CHAT", session: cookie[0].split("=")[1], data: chatinput.value }));
            chatinput.value = "";
            chatinput.focus();
        });
    }
}

function betListener(socket) {
    var betDiv = document.querySelector("#betDiv");
    var betinput = document.querySelector("#betinput");
    var cashout = document.querySelector("#cashoutInput");
    var betButton = document.querySelector("#betButton");
    console.log("Listening for bets...");
    if (betDiv) {
        betButton.addEventListener("click", (event) => {
            var log = document.querySelector("#log");
            log.textContent = "";
            event.preventDefault();
            if (betinput.value == "" || !isNumeric(betinput.value)) { betinput.value = "";return; }
            var cookie = document.cookie.split(";");
            socket.send(JSON.stringify({ type: "BET", session: cookie[0].split("=")[1], data: {bet:betinput.value, cashout:cashout.value}}));
        });
    }
}

function cashoutListener(socket) {
    var cashoutButton = document.querySelector("#cashoutButton");
    console.log("Cashing out...");
    if (cashoutButton) {
        cashoutButton.addEventListener("click", (event) => {
            event.preventDefault();
            socket.send(JSON.stringify({ type: "CASHOUT", session: document.cookie.split(";")[0].split("=")[1]}));
        });
    }
}

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function betInit() {
    var cashout = document.querySelector("#cashoutInput");
    if(!cashout) {
        return;
    }
    cashout.value = "2";
}

function invalidBetHandler(msg) {
    var log = document.querySelector("#log");
    log.textContent = msg;
}

function changeFunds(funds) {
    var balance = document.querySelector("#balance");
    console.log("Updating funds...");
    balance.textContent = Math.round((funds*100))/100 + " ONE";
}

function ingame(bet, cashedOut) {
    var e = document.querySelector("#cashouttext");
    if(!cashedOut) {
        e.style.color = "white";
        if (gameState === "WAIT") {
            e.textContent = "PROFIT: 0 ONE";
        } else {
        e.textContent = "PROFIT: " + Math.round(bet * (((growthFunc(elapsed))/100)-1) * 100)/100 + " ONE"; 
        }
    } else {
        e.style.color = "cyan";
    }
    
    if(!betted) {
        betted = true;
        showCashout();
    }
}

function showBet() {
    var elem = document.querySelector("#cashoutDiv");
    var el = document.querySelector("#betDiv");
    el.style.visibility = "visible";
    elem.style.visibility = "hidden";
    betted = false;
}

function showCashout() {
    var elem = document.querySelector("#cashoutDiv");
    var el = document.querySelector("#betDiv");
    el.style.visibility = "hidden";
    elem.style.visibility = "visible";
}

connect();
var Web3 = require("web3");
var pg = require("pg");
const bankRoll = require("./config")["bankRoll"]

var client = new pg.Client("postgres://postgres:cse@localhost:5432/crash");
var web3 = new Web3(new Web3.providers.HttpProvider("https://api.harmony.one"));


setInterval(async ()=>{
    // var balance = await web3.eth.getBalance(bankRoll);
    console.log("Starting checking for deposits...");

    client.query("SELECT address, pkey FROM wallets;",[], (err, data)=> {
        console.log(data);
    })
    var txFee = await web3.eth.getGasPrice() * 21000;
    console.log("fee: " + txFee);
    // const createTransaction = await web3.eth.accounts.signTransaction(
    //     {
    //       from: addressFrom,
    //       to: bankRoll,
    //       value: web3.utils.toWei('100','ether'),
    //       gas: '21000',
    //     }, privKey);
}, 5000);

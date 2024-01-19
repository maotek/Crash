var login = document.querySelector("#login");
if(login) {
    login.addEventListener('click', async function () {
        console.log("Initalizing login...");
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
            await connect();
            accounts = await ethereum.request({ method: 'eth_accounts' });
            var from = accounts[0];
            axios
                .post("/nonce", { data: from })
                .then(function (res) {sign(res.data);})
                .catch(function (err) { console.log(err); });

            async function connect() {
                await ethereum.request({ method: 'eth_requestAccounts' });
            }

            function sign(nonce) {
                // if(nonce === "") {
                //     return document.location.href = "/signup";
                // }
                console.log("Received nonce")
                var msg = nonce;
                if (!from) { return connect(); }

                console.log('Generating sig');
                var params = [msg, from];
                var method = 'personal_sign';

                web3.currentProvider.sendAsync({
                    method,
                    params,
                    from,
                }, function (err, result) {
                    if (err) { return console.error(err); }
                    if (result.error) { return console.error(result.error); }

                    const msgParams = { data: msg };
                    msgParams.sig = result.result;
                    axios
                        .post("/auth", msgParams)
                        .then(function (res) { document.location.href = "/";})
                        .catch(function (err) { console.log(err); });
                }); 
            }
        } else {
            alert("Install MetaMask.");
        }
    });
}
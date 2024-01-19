var deposit = document.querySelector("#deposit");

if (deposit) {
    deposit.addEventListener("click", () => {
        axios
            .post("/deposit")
            .then(callback)
            .catch(function (err) { console.log(err); });

        function callback(res) {

            alert("To deposit funds, send ONE to the following address: " + res.data);

            // var modal = document.querySelector("#depositView");
            // var betView = document.querySelector("#cashoutDiv");
            // var cashoutView = document.querySelector("#betDiv");
            // betView.style.visibility = "hidden";
            // cashoutView.style.visibility = "hidden";
            // modal.style.visibility = "visible";
        }
    });
}

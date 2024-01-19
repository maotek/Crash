function drawGrid() {
    var grid_size = 10;
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");

    var canvas_width = canvas.width;
    var canvas_height = canvas.height;

    for(let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "aqua";
        ctx.moveTo(0, canvas_height - grid_size);
        ctx.lineTo(canvas_width, canvas_height - grid_size);
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "aqua";
        ctx.moveTo(grid_size, 0);
        ctx.lineTo(grid_size, canvas_height);
        ctx.stroke();
    }
}

function drawSlope(elapsed) {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width, canvas.height); // clear grid
    drawGrid();
    var canvas_width = canvas.width;
    var canvas_height = canvas.height;

    // startwaarden grafiek
    x = 10;
    y = canvas_height - 10;

    var x_interval = 50;

    /**
     * X-as = hoeveel seconden er voorbij is gegaan.
     * X-as loopt in het begin tot de 11552 (= 2.00x multiplier), als hij hoger dan 2.00x komt, dan is de x-as proportioneel met hoeveel seconden die hoger mulitplier duurt.
     */
    var u = Math.max(11552.453009563471, elapsed) / x_interval; // Dit is de delta-X, delen door 75 want elapsed wordt elke keer 75 hoger.
    var p = (canvas_width / u); // Afstemmen met de breedte van de canvas
    var f = (canvas_height / Math.max(100, growthFunc(elapsed)-100)); // scaler y-axis

    for (let i = 0; i < Number(elapsed / x_interval); i++) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#FFFFFF";
        ctx.moveTo(x, y);

        x = x += p;
        y = canvas_height - 10 - ((growthFunc(i*x_interval) - 100)*f);

        ctx.lineTo(x, y);
        for(let oo = 0; oo < 5; oo++) {
            ctx.stroke();
        }
    }
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
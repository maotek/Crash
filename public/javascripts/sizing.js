var initHeight = window.innerHeight;
var chat = $("#chat").height();
var cctrl = $("#cctrl").height();
var size = chat - cctrl - 20;
var list = $('#chatview');
list.css({'height':size});

var canvas = $("#canvas")
var canvwrapper = $("#canvWrapper");
var wrapperHeight = canvwrapper.height();
var wrapperWidth = canvwrapper.width();
canvas.css({'height': wrapperHeight - 20, 'width': wrapperWidth - 20});

window.onresize = (e) => {
    var canvwrapper = $("#canvWrapper");
    var wrapperHeight = canvwrapper.height();
    var wrapperWidth = canvwrapper.width();

    // var chatview = $("#chatview");
    // chatview.css({'height':0})
    // var children = chatview.children();
    // chatview.empty();

    // var chat = $("#chat");
    // var chatHeight = chat.height();

    // var cctrl = $("#cctrl").height();
    // var size = chatHeight - cctrl - 20;
    // console.log(size)

    // chatview.css({'height':size});
    // chatview.append(children);

    var canvas = $("#canvas");
    canvas.css({'height': wrapperHeight - 20, 'width': wrapperWidth - 20});
};
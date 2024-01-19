var createError = require('http-errors');
var express = require('express');
var path = require('path');
const websocket = require("ws");
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var http = require("http");
var database = require("./utils/database");
var ejs = require("ejs");
var Web3 = require("web3");
var socket = require("./utils/socket");
var engine = require("./utils/engine");
// var walletmanager = require("./utils/walletmanager");

var port = process.env.PORT || '3000';

var indexRouter = require('./utils/routes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// loggers
// app.use(morgan(':method :url :status :remote-addr - :response-time ms'));
// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// session handler
app.use(function(req, res, next) {
  if(req.cookies.id) {
      database.getUserBySessionId(req.cookies.id, (err, data) => {
      req.user = data;
      next();
    });
  } else {
    next();
  }
});

app.use(indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  var message = err.message;
  var error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error", { err: error, status: err.status });
});

// run server
var server = http.createServer(app)
const wss = new websocket.Server({ server });

var engine = engine.init();
socket.init(wss, engine);


// listen to port
server.listen(port);


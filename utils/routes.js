var express = require('express');
var router = express.Router();
var user = require('./user');
var db = require("./database");
var user = require("./user");

router.get('/', function(req, res, next) {
  var userData = req.user;
  res.render('index', {user: userData});
});

// router.get('/signup', function(req, res, next) {
//   res.render('signup', {user: undefined});
// });

router.post("/logout", user.logout);
router.post("/nonce", user.nonce);
router.post("/auth", user.auth);
router.post("/deposit", db.deposit);

module.exports = router;
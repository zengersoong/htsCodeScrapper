var fs = require("fs");
var express = require("express");

var router = express.Router();
var {
  updateUS,
  updateOfflineUS,
  getLastUpdatedUSTimestamp
} = require("../scrappers/us.js");
var { updateJP } = require("../scrappers/jp.js");
let config = JSON.parse(fs.readFileSync("config.json"));

router.get("/getLatestUS", async function(req, res) {
  var io = req.app.get("socketio");
  res.send(true);
  // result = await updateJP(config["number_retries"], io);
  result = await updateUS(config["number_retries"], io);
  console.log("Fetching Completed");
  console.log(result);
  io.sockets.emit("processed", result);
});

router.get("/getLocalUS", async function(req, res) {
  result = await updateOfflineUS();
  console.log("Running Without Nightmare...");
  console.log(result);
  res.send(result);
});

router.get("/getLastUpdateUS", async function(req, res) {
  result = await getLastUpdatedUSTimestamp();
  res.send(result);
});

router.get("/getLatestJp", async function(req, res) {
  var io = req.app.get("socketio");
  res.send(true);
  result = await updateJP(config["number_retries"], io);
  console.log("Fetching Completed");
  console.log(result);
  io.sockets.emit("processed", result);
});

router.get("/getLastUpdateJP", async function(req, res) {
  result = await getLastUpdatedJPTimestamp();
  res.send(result);
});

module.exports = router;

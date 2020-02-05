var fs = require("fs");
var _ = require("lodash");
require("dotenv").config();
var mongoose = require("mongoose");
var Nightmare = require("nightmare");
require("nightmare-download-manager")(Nightmare);

var models = require("../schemas/hts.js");

/**
 * getUpdated calls for web automation tool to download the latest csv file.
 */
let config = JSON.parse(fs.readFileSync("config.json"));

const filepath = process.env.mined_file_path; // for python
console.log("filepath" + filepath);

parseJsonUS = async () => {
  var data = JSON.parse(
    fs.readFileSync("./database/record/modified/hts_us.json")
  );
  console.log(data);
  return data;
};

updateUS = async (MAXTRIES, io) => {
  if (MAXTRIES === 0) {
    console.log("Maximum Retries reached");
    return false;
  }

  if (fs.existsSync(filepath)) {
    fs.unlink(filepath, function(err) {
      if (err) throw err;
      // if no error, file has been deleted successfully
      console.log("[Removal of previous hts.usitc file] File deleted!");
    });
  }

  mongoose.connection.db.dropCollection("hts_us", function(err, res) {
    if (err) {
    }
  });

  io.sockets.emit("status", { status: "Database dropped" });
  // Nightmare default characteristics for timeout, this depends on the amount of data as well as hardware.
  let nightmare = Nightmare({
    show: false,
    gotoTimeout: config["gotoTimeout"],
    waitTimeout: config["waitTimeout"],
    downloadTimeout: config["downloadTimeout"]
  });
  let spawn = require("child_process").spawn; // Spawn is for python script for data preprocessing
  io.sockets.emit("status", { status: "Running webscrapper" });
  console.log("[0] Nightmare is running... \n[0.1] Mining hts.usitc.gov ...");
  nightmare.on("download", function(state, downloadItem) {
    if (state == "started") {
      nightmare.emit("download", filepath, downloadItem);
    }
  });

  try {
    console.log("US-Nightmare tries left: " + MAXTRIES);
    await nightmare
      .downloadManager()
      .goto("https://hts.usitc.gov/export")
      .wait(1000)
      .type("body", "\u000d") // press enter
      .type(`input[name="from"]`, "0000")
      .type(`input[name="to"]`, "9999")
      .click("input#Submit.btn.btn-primary")
      .wait(10000)
      .waitDownloadsComplete() // Wait timeout
      .end(() => "some value")
      .then(async () => {
        io.sockets.emit("status", {
          status: "Mining completed. Running Python script"
        });
        // now run python script
        console.log("[1] Successfully mined hts.usitc.gov/export");
        console.log("[1.1] Starting child process, running Python script...");
        await new Promise(function(resolve, reject) {
          setTimeout(
            () => reject(new Error("Python Process timeout")),
            500 * 1000
          );
          var pythonProcess = spawn("python3", ["./focus.py", filepath]);
          pythonProcess.stdout.on("data", async data => {
            console.log(String(data));
            converted = await parseJsonUS();
            models.hts_us.collection.insertMany(
              converted,
              { safe: true },
              function(err, docs) {
                if (err) {
                  return console.error(err);
                } else {
                  console.log(
                    "[4] MongoDB database updated, " +
                      docs.insertedCount +
                      " documents inserted to Collection ..."
                  );
                }
              }
            );
            console.log(
              "[3] Successfully handled Python Record Manipulation ..."
            );
            resolve(true);
          });
        });
      });
    return true;
  } catch (e) {
    console.log(e.name + ":" + e.message);
    console.log("Error encountered... retrying");
    res = await this.updateUS(MAXTRIES - 1, io);
    return res;
  }
};

updateOfflineUS = async () => {
  mongoose.connection.db.dropDatabase();
  let spawn = require("child_process").spawn;
  res = await new Promise(function(resolve, reject) {
    var pythonProcess = spawn("python3", ["./focus.py", filepath]);
    pythonProcess.stdout.on("data", async data => {
      console.log(String(data));
      converted = await parseJSON();
      models.hts_us.collection.insertMany(converted, { safe: true }, function(
        err,
        docs
      ) {
        if (err) {
          return console.error(err);
        } else {
          console.log(
            "[4] MongoDB database updated, " +
              docs.insertedCount +
              " documents inserted to Collection ..."
          );
        }
      });
      console.log("[3] Successfully handled Python Record Manipulation ...");
      resolve(true);
    });
  });
  return res;
};

const getLastUpdatedUSTimestamp = async () => {
  timestamp = await models.hts_us.findOne();
  return timestamp._id.getTimestamp();
};

module.exports.updateUS = updateUS;
module.exports.getLastUpdatedUSTimestamp = getLastUpdatedUSTimestamp;
module.exports.updateOfflineUS = updateOfflineUS;

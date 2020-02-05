var fs = require("fs");
require("dotenv").config();
let cheerio = require("cheerio");
var mongoose = require("mongoose");
const Nightmare = require("nightmare");
require("nightmare-download-manager")(Nightmare);
cheerioTableParser = require("cheerio-tableparser");
let config = JSON.parse(fs.readFileSync("config.json"));

var models = require("../schemas/hts.js");
var results = [];
const filepath = process.env.modified_file_path; // for python
const hts_jp_file_path = process.env.hts_jp_file_path;

async function getTable(link) {
  let nightmare = Nightmare({
    show: false,
    gotoTimeout: 120000,
    waitTimeout: 120000,
    downloadTimeout: 10000
  });
  await nightmare.goto(link);
  bodyOfTable = await nightmare.evaluate(function() {
    return document.body.innerHTML;
  });
  var $ = cheerio.load(bodyOfTable);
  cheerioTableParser($);
  var data = $('table[name ="TV"]').parsetable(false, false, false);
  var hts_code = data[1];
  var suffix = data[2];
  var description = data[3];

  let previous = "ERR";
  for (i = 0; i < hts_code.length; i++) {
    // This to fix the empty suffix
    if (suffix[i] == "") {
      suffix[i] = "000";
    }
    // This is to fix empty hts_code
    if (hts_code[i] != "") {
      previous = hts_code[i];
    } else {
      hts_code[i] = previous;
    }

    results.push({
      hts_code: hts_code[i],
      suffix: suffix[i],
      description: description[i],
      country_import: "Japan"
    }); // Remember to add to United States Data
  }
  // console.log(results);
  nightmare.end();
}

updateJP = async (MAXTRIES, io) => {
  results = [];
  if (MAXTRIES === 0) {
    console.log("Maximum Retries reached");
    return false;
  }

  if (fs.existsSync(hts_jp_file_path)) {
    fs.unlink(hts_jp_file_path, function(err) {
      if (err) throw err;
      // if no error, file has been deleted successfully
      console.log("[Removal of previous hts.usitc file] File deleted!");
    });
  }

  mongoose.connection.db.dropCollection("hts_jps", function(err, res) {
    if (err) {
    }
  });

  io.sockets.emit("status", { status: "Database dropped" });
  console.log("Starting 日本の関税スケジュール Scrapping ...");
  let nightmare = Nightmare({
    show: false,
    gotoTimeout: config["gotoTimeout"],
    waitTimeout: config["waitTimeout"],
    downloadTimeout: config["downloadTimeout"]
  });

  io.sockets.emit("status", { status: "Running Japan webscrapper" });

  try {
    console.log("Japan-Nightmare tries left: " + MAXTRIES);
    const url = "https://www.customs.go.jp/english/tariff/index.htm";
    await nightmare.goto(url);
    await nightmare.click("ul.type02 li:first-child a"); //Click into latest Hts code
    links = await nightmare.evaluate(function() {
      // Grab all the Links
      return Array.from(document.querySelectorAll("td a")).map(a => a.href);
    });
    // console.log(links);
    console.log(
      "Chapter Links Collected! " + links.length + " Links acquired."
    );
    nightmare.end(); // end the nightmarew after collecting the links...

    //Change 5 back to links.length
    for (var i = 0; i < 2; i++) {
      console.log(
        "Scrapping Harmonized Tariff Schedule (日本の関税スケジュール)- Chapter " +
          Number(i + 1) +
          "/" +
          links.length +
          " ..."
      );
      await getTable(links[i]);
      console.log("Scrapped Hts Chapter " + Number(i + 1));
      io.sockets.emit("status", {
        status: "Scrapped Hts Chapter " + Number(i + 1)
      });
      // Partial Saving Implemented, every 10th.
      if (Number(i + 1) % 10 != 0) {
        console.log("*Partial Saving ...");
        data = JSON.stringify(results);
        fs.writeFile(filepath + "/hts_jp.json", data, err => {
          if (err) throw err;
          console.log("hts_jp has been saved!");
        });
      }
    }
    data = JSON.stringify(results);
    fs.writeFileSync(filepath + "/hts_jp.json", data, err => {
      if (err) throw err;
      console.log("100% Completed! hts_jp has been saved!");
    });

    converted = await parseJsonJp();
    models.hts_jp.collection.insertMany(converted, { safe: true }, function(
      err,
      docs
    ) {
      if (err) {
        return console.error(err);
      } else {
        console.log(
          "[4] MongoDB Japan database updated, " +
            docs.insertedCount +
            " documents inserted to Collection ..."
        );
      }
    });
  } catch (e) {
    console.log(e.name + ":" + e.message);
    console.log("Error encountered... retrying");
    res = await this.updateJP(MAXTRIES - 1, io);
    return res;
  }
};

parseJsonJp = async () => {
  var data = JSON.parse(fs.readFileSync(filepath + "/hts_jp.json"));
  console.log(data);
  return data;
};

module.exports.updateJP = updateJP;

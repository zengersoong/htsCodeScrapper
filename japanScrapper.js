const Nightmare = require("nightmare");
require("nightmare-download-manager")(Nightmare);
const express = require("express");
const app = express();
let cheerio = require("cheerio");
var fs = require("fs");
// let jsonframe = require('jsonframe-cheerio');
cheerioTableParser = require("cheerio-tableparser");

var results = [];

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
  var data = $("table.t").parsetable(true, true, true);
  var hts_code = data[1].slice(4, -4);
  var suffix = data[2].slice(4, -4);
  var description = data[3].slice(4, -4);

  let previous = "ERR";
  for (i = 0; i < data[1].length; i++) {
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

app.get("/", async function(req, res) {
  console.log("Starting 日本の関税スケジュール Scrapping ...");
  let nightmare = Nightmare({
    show: false,
    gotoTimeout: 120000,
    waitTimeout: 120000,
    downloadTimeout: 10000
  });
  const url = "https://www.customs.go.jp/english/tariff/index.htm";
  await nightmare.goto(url);
  await nightmare.click("ul.type02 li:first-child a"); //Click into latest Hts code
  links = await nightmare.evaluate(function() {
    // Grab all the Links
    return Array.from(document.querySelectorAll("td a")).map(a => a.href);
  });
  // console.log(links);
  console.log("Chapter Links Collected! " + links.length + " Links acquired.");
  nightmare.end(); // end the nightmarew after collecting the links...

  for (var i = 0; i < links.length; i++) {
    console.log(
      "Scrapping Harmonized Tariff Schedule (日本の関税スケジュール)- Chapter " +
        Number(i + 1) +
        "/" +
        links.length +
        " ..."
    );
    await getTable(links[i]);
    console.log("Scrapped Hts Chapter " + Number(i + 1));
    // Partial Saving Implemented, every 10th.
    if (Number(i + 1) % 10 == 0) {
      console.log("*Partial Saving ...");
      data = JSON.stringify(results);
      fs.writeFile("japan_hts.json", data, err => {
        if (err) throw err;
        console.log("japan_hts has been saved!");
      });
    }
  }
  data = JSON.stringify(results);
  fs.writeFile("japan_hts.json", data, err => {
    if (err) throw err;
    console.log("100% Completed!japan_hts has been saved!");
  });
});

var mongoose = require("mongoose");
var Schema = mongoose.Schema;

const usHTSSchema = new Schema({
  0: String, // HTS_codes
  1: String, // Indent
  2: String, // Description
  3: String,
  4: String,
  5: String,
  6: String,
  7: String,
  8: String, //index
  9: String, //Children
  10: String, //Parent
  11: String, //Keywords
  12: String //Ancestory
});

const hts_us = mongoose.model("hts_us", usHTSSchema);
exports.hts_us = hts_us;

const jpHTSSchema = new Schema({
  0: String, // hts_code (prefix)
  1: String, // suffix
  2: String, // Description
  3: String // country_import
});

const hts_jp = mongoose.model("hts_jp", jpHTSSchema);
exports.hts_jp = hts_jp;

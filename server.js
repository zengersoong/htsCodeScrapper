var _ = require("lodash");
require("dotenv").config();
var Nightmare = require("nightmare");
require("nightmare-download-manager")(Nightmare);

var models = require("./schemas/hts.js");

/*
Standard search would return anything that hits the keyword
*/
const search = async query => {
  hit = await models.hts_us
    .find({ 12: { $all: query.split(" ") } }, function(err, res) {
      if (err) console.log(err);
    })
    .setOptions({ lean: true });
  var parent_list = [];
  var hit_list = [];
  var ancestor_list = [];

  for (i = 0; i < hit.length; i++) {
    hit_list.push(hit[i][9]); // take all the key of the hits
    ancestor_list.push(hit[i][9]);
    ancestor_list = _.union(ancestor_list, hit[i][13]);
    if (hit[i][11] != "") {
      parent_list.push(hit[i][11]);
    }
    if (hit[i][1] == "0") {
      // Parents themselves
      parent_list.push(hit[i][0]);
    }
  }

  parents = await models.hts_us
    .find({ $and: [{ 0: { $in: parent_list } }, { 1: "0" }] }, function(
      err,
      res
    ) {
      if (err) console.log(err);
    })
    .setOptions({ lean: true });

  return [parents, hit_list, ancestor_list];
};

/*
Search By code
*/
const searchByCode = async query => {
  queryList = [];
  queryIndexes = query.split(".");
  queryList.push(query);

  // Remove trailing zeros
  if (queryIndexes.length > 1) {
    for (i = queryIndexes.length - 1; i > 0; i--) {
      if (queryIndexes.slice(i)[0] == "00") {
        queryList.push(queryIndexes.slice(0, i).join("."));
      }
    }
  }

  // Add trailing zeros until max out 4 indents
  if (queryIndexes.length < 4) {
    tails = query;
    for (i = 1; i <= 4 - queryIndexes.length; i++) {
      tails = tails + ".00";
      queryList.push(tails);
    }
  }
  console.log(queryList);
  hit = await models.hts_us
    .find({ 0: { $in: queryList } }, function(err, res) {
      if (err) console.log(err);
    })
    .setOptions({ lean: true });
  var parent_list = [];
  var hit_list = [];
  var ancestor_list = [];

  for (i = 0; i < hit.length; i++) {
    hit_list.push(hit[i][9]); // take all the key of the hits
    ancestor_list.push(hit[i][9]);
    ancestor_list = _.union(ancestor_list, hit[i][13]);
    if (hit[i][11] != "") {
      parent_list.push(hit[i][11]);
    }
    if (hit[i][1] == "0") {
      // Parents themselves
      parent_list.push(hit[i][0]);
    }
  }

  parents = await models.hts_us
    .find({ $and: [{ 0: { $in: parent_list } }, { 1: "0" }] }, function(
      err,
      res
    ) {
      if (err) console.log(err);
    })
    .setOptions({ lean: true });

  return [parents, hit_list, ancestor_list];
};

module.exports.search = search;
module.exports.searchByCode = searchByCode;

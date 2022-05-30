/*!
* Contentstack Export
* Copyright (c) 2019 Contentstack LLC
* MIT Licensed
*/

var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
const json = require("big-json");

exports.readFile = function (filePath, parse) {
  var data
  parse = (typeof parse === 'undefined') ? true : parse
  filePath = path.resolve(filePath)
  if (fs.existsSync(filePath)) {
    data = (parse) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : data
  }
  return data
};

exports.writeFile = function (filePath, data) {
  data = (typeof data === 'object') ? JSON.stringify(data) : data || '{}'
  fs.writeFileSync(filePath, data)
};


exports.writeLargeFile = function (filePath, data) {
  return new Promise((resolve, reject) => {
    const stringifyStream = json.createStringifyStream({
      body: data,
    });
    var writeStream = fs.createWriteStream(filePath, 'utf-8');
    stringifyStream.pipe(writeStream)

    writeStream.on("finish", () => {
      resolve();
    })

    writeStream.on("error", (error) => {
      reject(error);
    })
  });
};

exports.makeDirectory = function () {
  for (var key in arguments) {
    var dirname = path.resolve(arguments[key])
    if (!fs.existsSync(dirname)) {
      mkdirp.sync(dirname)
    }
  }
}

exports.readdir = function (dirPath) {
  if (fs.existsSync(path)) {
    return fs.readdirSync(dirPath)
  } else {
    return []
  }
}
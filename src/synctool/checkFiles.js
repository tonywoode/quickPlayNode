const fs = require("fs")
const Task = require("data.task")
//const { isEmpty, compose, map, chain } = require('Ramda')
//const { Maybe, Either } = require('sanctuary')
//const { Just, Nothing } = Maybe
//const { Left, Right } = Either
const { isFileInDir } = require("../synctool/checkFiles.js")

// statPath :: Path -> Task Error String
const stat = file =>
  new Task((rej, res) =>
    fs.stat(
      file,
      (err, stats) =>
        err ? rej(`stat error: ${err.message}`) : res(stats)
    )
  )

module.exports = { stat }

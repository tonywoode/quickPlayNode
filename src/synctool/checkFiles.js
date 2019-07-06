const fs = require("fs")
const Task = require("data.task")
const { compose, map } = require("Ramda")
//const { Maybe, Either } = require('sanctuary')
//const { Just, Nothing } = Maybe
//const { Left, Right } = Either
const { isFileInDir } = require("../synctool/checkFiles.js")

// statPath :: Path -> Task Error String
const stat = file =>
  new Task((rej, res) =>
    fs.stat(
      file,
      (err, stats) => (err ? rej(`stat error: ${err.message}`) : res(stats))
    )
  )

// isDir :: Path -> Task Error Boolean
const isDir = compose(
  map(statObj => statObj.isDirectory()),
  stat
)

// isFile :: Path -> Task Error Boolean
const isFile = compose(
  map(statObj => statObj.isFile()),
  stat
)

module.exports = { stat, isDir, isFile }

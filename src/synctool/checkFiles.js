const fs = require("fs")
const Task = require("data.task")
const { compose, map } = require('ramda')

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

// getSize :: Path -> Task Error String
const getSize = compose(
  map(statObj => statObj.size),
  stat
)

// fileIs0KB :: Path -> Task Error Boolean
const fileIs0KB = compose(
  map(size => size === 0), //folders have size 1
  map(statObj => statObj.size),
  stat
)


module.exports = { stat, isDir, isFile, getSize, fileIs0KB }

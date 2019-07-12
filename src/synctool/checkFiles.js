const fs = require("fs")
const Task = require("data.task")
const { compose, map } = require('ramda')
const { Maybe, Either, maybeToEither } = require('sanctuary')
const { Just, Nothing } = Maybe
const { Left, Right } = Either

const isObject = obj => obj === Object(obj) //https://stackoverflow.com/a/22482737/3536094

// Path -> Task Error String
const stat = file =>
  new Task((rej, res) =>
    fs.stat(
      file,
      (err, stats) => (err ? rej(`couldn't access file: ${err.message}`) : res(stats))
    )
  )

// Path -> Task Error Boolean
const isDir = compose(
  map(statObj => statObj.isDirectory()),
  stat
)

// Path -> Object -> Maybe Boolean
const isFile = stat => isObject(stat) ? Nothing : Just(stat.isFile)

// Object -> Maybe Number
const getSize = stat => isObject(stat) ? Nothing : Just(stat.size)

// Object -> Object -> Maybe Boolean
const fileIs0KB = stat => isObject(stat) ? Nothing : Just(stat.size === 0) //folders have size 1

module.exports = { stat, isDir, isFile, getSize, fileIs0KB }

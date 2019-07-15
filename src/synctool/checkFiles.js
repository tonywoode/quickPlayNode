const fs = require("fs")
const Task = require("data.task")
const { compose, map } = require('ramda')
const { Maybe, Either, maybeToEither } = require('../helpers/sanctuary.js')
const { Just, Nothing } = Maybe
const { Left, Right } = Either


// Path -> Task Error String
const stat = file =>
  new Task((rej, res) =>
    fs.stat(
      file,
      (err, stats) => (err ? rej(`couldn't access file: ${err.message}`) : res(stats))
    )
  )

const isObject = obj => obj === Object(obj) //https://stackoverflow.com/a/22482737/3536094
const validStat = stat => isObject(stat) ? Left("stat is invalid") : Right(stat)

// Object -> Error Boolean
// we need to map over this maybe - there's two maybes here - firstly do we have a valid stat, secondly is the stat a directory, the first needs to be made into its own fn
const isDir = stat =>  compose(map(stat => stat.isDirectory()), validStat)(stat)
//const isDir = stat => isObject(stat) ? statObj.isDirectory() : Nothing

// Object -> Maybe Boolean
const isFile = stat => isObject(stat) ? Just(stat.isFile()) : Nothing

// Object -> Maybe Number
const getSize = stat => isObject(stat) ? Just(stat.size) : Nothing

// Object -> Object -> Maybe Boolean
const fileIsNotEmpty = stat => isObject(stat) ? Just(stat.size === 0) : Nothing //folders have size 1

module.exports = { stat, isDir, isFile, getSize, fileIsNotEmpty }

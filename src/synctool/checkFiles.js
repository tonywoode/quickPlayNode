const fs = require("fs")
const { task } = require("folktale/concurrency/task")
const { compose, map } = require("ramda")
const Result = require("folktale/result")
const Maybe = require("folktale/maybe")

// Path -> Task Error String
const stat = file =>
  task(r => {
    fs.stat(file, (err, stats) => {
      err ? r.reject(err.message) : r.resolve(stats)
    })
  })

const isObject = obj => obj === Object(obj) //https://stackoverflow.com/a/22482737/3536094
const validStat = stat =>
  isObject(stat) ? Result.Error("stat is invalid") : Result.Ok(stat)

// Object -> Error Boolean
// we need to map over this maybe - there's two maybes here - firstly do we have a valid stat, secondly is the stat a directory, the first needs to be made into its own fn
const isDir = stat =>
  compose(
    map(stat => stat.isDirectory()),
    validStat
  )(stat)
//const isDir = stat => isObject(stat) ? statObj.isDirectory() : Nothing()

// Object -> Maybe Boolean
const isFile = stat => (isObject(stat) ? Maybe.Just(stat.isFile()) : Nothing())

// Object -> Maybe Number
const getSize = stat => (isObject(stat) ? Maybe.Just(stat.size) : Nothing())

//I don't think we need this because 0kb is just less than...
// Object -> Object -> Maybe Boolean
//const fileIsNotEmpty = stat =>
// isObject(stat) ? Maybe.Just(stat.size === 0) : Nothing() //folders have size 1

module.exports = { stat, isDir, isFile, getSize }

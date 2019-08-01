const fs = require('fs')
const { task } = require('folktale/concurrency/task')
const Maybe = require('folktale/maybe')
const { Just, Nothing } = Maybe

// Path -> Task Error String
const stat = file =>
  task(r => {
    fs.stat(file, (err, stats) => {
      err ? r.reject(err.message) : r.resolve(stats)
    })
  })

const isObject = obj => obj === Object(obj) // stackoverflow.com/a/22482737/3536094

// Object -> Maybe Boolean
const isDir = stat => (isObject(stat) ? Just(stat.isDirectory()) : Nothing())

// Object -> Maybe Boolean
const isFile = stat => (isObject(stat) ? Just(stat.isFile()) : Nothing())

// Object -> Maybe Number
const getSize = stat => (isObject(stat) ? Just(stat.size) : Nothing())

// I don't think we need this because 0kb is just less than...
// Object -> Object -> Maybe Boolean
// const fileIsNotEmpty = stat =>
// isObject(stat) ? Maybe.Just(stat.size === 0) : Nothing() //folders have size 1

module.exports = { stat, isDir, isFile, getSize }

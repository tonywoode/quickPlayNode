const fs = require("fs")
const { relative, isAbsolute } = require("path")
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

// isSubdir :: Path -> Path -> Boolean
const isSubdir = child => parent => { //stackoverflow.com/a/45242825/3536094
  const pathFromTo = relative(parent, child)
  const result =  pathFromTo
    && !pathFromTo.startsWith("..") 
    && !isAbsolute(pathFromTo)
    && relative(parent, child).length >= 0
  //console.log(`is "${child}" a child of "${parent}": ${result}`)
  return result
}

module.exports = { stat, isDir, isFile, isSubdir }

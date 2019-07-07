const fs = require("fs")
const { relative, isAbsolute } = require("path")
const Task = require("data.task")
const { compose, map } = require("Ramda")
const { Either } = require("sanctuary")
//const { Just, Nothing } = Maybe
const { Left, Right } = Either
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

// getSubDir :: Path -> Path -> Either Error RelativePath
const getSubDir = child => parent => {
  //stackoverflow.com/a/45242825/3536094
  const pathFromTo = relative(parent, child)
  const result =
    pathFromTo &&
    pathFromTo.length >= 0 &&
    !isAbsolute(pathFromTo) &&
    !pathFromTo.startsWith("..")
  console.log(`[getSubDir] is "${child}" a child of "${parent}": ${result}`)
  console.log(`[getSubDir] path from child to parent is ${pathFromTo}`)
  return result? Right(pathFromTo): Left(`${child} is not in ${parent}`)
}

module.exports = { stat, isDir, isFile, getSize, fileIs0KB, getSubDir }

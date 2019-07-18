const { isEmpty, isNil, compose, map, chain } = require("ramda")
const { relative, isAbsolute } = require("path")
const Maybe = require("folktale/maybe")
const Result = require("folktale/result")

const isString = str => typeof str === 'string' || str instanceof String
const strEmpty = str => isNil(str) || str === ""
// Object -> Boolean
const objEmpty = obj => isNil(obj) || isEmpty(obj)

// Object -> Maybe Object
const checkObjEmpty = obj =>
  (objEmpty(obj) && Maybe.Nothing()) || Maybe.Just(obj)
// String -> Object -> Result Error Object
const checkKey = key => config =>
  (config.hasOwnProperty(key) && !strEmpty(config[key]) && Result.Ok(config)) ||
  Result.Error(`${key} is not set`)

// Object -> Result Object Error
const checkConfigKeys = config =>
  compose(
    chain(checkKey("localPath")),
    checkKey("remotePath")
  )(config)

// Object -> Result Error Maybe Object
const isConfigValid = config =>
  compose(
   chain(checkConfigKeys),
   Result.fromMaybe,
   checkObjEmpty
  )(config)

// Path -> Path -> Result Error RelativePath
const getSubDir = child => parent => {
  //stackoverflow.com/a/45242825/3536094
  const pathFromTo = relative(parent, child)
  const result =
    pathFromTo &&
    pathFromTo.length >= 0 &&
    !isAbsolute(pathFromTo) &&
    !pathFromTo.startsWith("..")
  //console.log(`[getSubDir] is "${child}" a child of "${parent}": ${result}`)
  //console.log(`[getSubDir] path from child to parent is ${pathFromTo}`)
  return result ? Result.Ok(pathFromTo) : Result.Error(`${child} is not in ${parent}`)
}

module.exports = {
  isString,
  strEmpty,
  checkObjEmpty,
  checkKey,
  checkConfigKeys,
  isConfigValid,
  getSubDir
}

const { isEmpty, isNil, compose, map, chain } = require("ramda")
const { relative, isAbsolute } = require("path")
const Maybe = require("folktale/maybe")
const Result = require("folktale/result")

const isString = str => typeof str === "string" || str instanceof String
const strEmpty = str => isNil(str) || str === ""
const inputEmpty = str => !isString(str) || strEmpty(str)
const objEmpty = obj => isNil(obj) || isEmpty(obj)
const checkRequire = module => {
  try {
    const mod = require(module)
    return Result.Ok(mod)
  } catch (e) {
    return Result.Error(e)
  }
}
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
  return result
    ? Result.Ok(pathFromTo)
    : Result.Error(`${child} is not in ${parent}`)
}

module.exports = {
  inputEmpty,
  checkObjEmpty,
  checkRequire,
  checkKey,
  checkConfigKeys,
  isConfigValid,
  getSubDir
}

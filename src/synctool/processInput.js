const { isEmpty, isNil, compose, map, chain } = require("ramda")
const { relative, isAbsolute } = require("path")
const Maybe = require("folktale/maybe")
const Result = require("folktale/result")

const isString = str => typeof str === "string" || str instanceof String
const strEmpty = str => isNil(str) || str === ""
const inputEmpty = str => !isString(str) || strEmpty(str)
const isObj = obj => typeof obj === "object" //null is object tho
const objEmpty = obj => isNil(obj) || isEmpty(obj)
// string -> Result Error cjsModule
const checkRequire = module => {
  try {
    //stackoverflow.com/a/13214660/3536094
    const mod = require(module)
    return Result.Ok(mod)
  } catch (e) {
    return Result.Error(e)
  }
}
// Object -> Maybe Object
const checkObjEmpty = obj =>
  ((!isObj(obj) || objEmpty(obj)) && Maybe.Nothing()) || Maybe.Just(obj)
// String -> Object -> Result Error Object
const checkKey = key => config =>
  (config.hasOwnProperty(key) && !strEmpty(config[key]) && Result.Ok(config)) ||
  Result.Error(`${key} is not set`)

// Object -> Result Object Error
const checkConfigKeys = config => {
  const remote = checkKey("remotePath")(config)
  const local = checkKey("localPath")(config)
  return local
    .orElse(noLocal =>
      remote
        .orElse(noRemote =>
          Result.Error(`Problems with config:\n ${noRemote} \n ${noLocal}`)
        )
      .chain(_ => Result.Error(noLocal)) //there was a remote, but there still is no local
    )
    .chain(_ => remote) //there is a local, but there still may be no remote
}

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
  if (!pathFromTo) {
    return Result.Error(`${child} and ${parent} are the same path`)
  }
  const result = !isAbsolute(pathFromTo) && !pathFromTo.startsWith("..")
  //console.log(`[getSubDir] is "${child}" a child of "${parent}": ${result}`)
  //console.log(`[getSubDir] path from child to parent is ${pathFromTo}`)
  return result
    ? Result.Ok(pathFromTo)
    : Result.Error(`${child} is not in ${parent}`)
}

module.exports = {
  inputEmpty,
  checkRequire,
  isConfigValid,
  getSubDir
}

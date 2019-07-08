const { isEmpty, isNil, compose, map, chain } = require('ramda')
const { relative, isAbsolute } = require("path")
const { Maybe, Either, maybeToEither } = require('sanctuary')
const { Just, Nothing } = Maybe
const { Left, Right } = Either

// strEmpty :: Object -> Boolean
const strEmpty = str => isNil(str) || str === ""
// objEmpty :: Object -> Boolean
const objEmpty = obj => isNil(obj) || isEmpty(obj)

// checkObjEmpty :: Object -> Maybe Object
const checkObjEmpty = obj => objEmpty(obj) && Nothing || Just(obj)
// checkKey :: String -> Object -> Either Error Object
const checkKey = key => config => ( config.hasOwnProperty(key) && !strEmpty(config[key]) ) && Right(config) || Left(`${key} is not set`)

// checkConfigKeys :: Object -> Either Object Error
const checkConfigKeys = config => compose(chain(checkKey("localPath")), checkKey("remotePath"))(config)
// isConfigValid :: Object -> Either Error Maybe Object 
const isConfigValid = config => compose(chain(checkConfigKeys), maybeToEither("config file is empty"), checkObjEmpty)(config)

// getSubDir :: Path -> Path -> Either Error RelativePath
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
  return result? Right(pathFromTo): Left(`${child} is not in ${parent}`)
}


module.exports = { strEmpty, checkObjEmpty, checkKey, checkConfigKeys, isConfigValid, getSubDir }

const { isEmpty, isNil, compose, map, chain } = require('ramda')
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

module.exports = { strEmpty, checkObjEmpty, checkKey, checkConfigKeys, isConfigValid }

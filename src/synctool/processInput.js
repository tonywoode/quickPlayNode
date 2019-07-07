const { isEmpty, isNil, compose, map, chain } = require('Ramda')
const { Maybe, Either, maybeToEither } = require('sanctuary')
const { Just, Nothing } = Maybe
const { Left, Right } = Either

// checkStrEmpty :: Path -> Maybe Path
const checkStrEmpty = str => str && Just(str) || Nothing 
// objEmpty :: Object -> Boolean
const objEmpty = obj => isNil(obj) || isEmpty(obj)
// checkObjEmpty :: Object -> Maybe Object
const checkObjEmpty = obj => objEmpty(obj) && Nothing || Just(obj)
// checkKey = Object => Either Object Error
const checkKey = key => config => config.hasOwnProperty(key) && Right(config) || Left(`${key} is not set`)

const checkRemote = checkKey("remotePath")
const checkLocal = checkKey("localPath")
// checkConfigKeys :: Object -> Either Object Error
const checkConfigKeys = config => compose(chain(checkLocal), checkRemote)(config)

// isConfigValid :: Object -> Either Error Maybe Object 
const isConfigValid = config => compose(chain(checkConfigKeys), maybeToEither("config is empty"), checkObjEmpty)(config)

module.exports = { checkStrEmpty, checkObjEmpty, checkKey, checkConfigKeys, isConfigValid }

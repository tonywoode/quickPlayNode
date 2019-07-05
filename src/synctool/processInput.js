const { isEmpty, compose, map, chain } = require('Ramda')
const { Maybe, Either } = require('sanctuary')
const { Just, Nothing } = Maybe
const { Left, Right } = Either

// checkStrEmpty :: Path -> Maybe Path
const checkStrEmpty = str => str && Just(str) || Nothing 
// checkObjEmpty :: Object -> Maybe Object
const checkObjEmpty = config => isEmpty(config) && Nothing || Just(config)
// checkKey = Object => Either Object Error
const checkKey = key => config => config.hasOwnProperty(key) && Right(config) || Left(`${key} is not set`)

const checkRemote = checkKey("remotePath")
const checkLocal = checkKey("localPath")

// checkConfigKeys :: Object -> Either Object Error
const checkConfigKeys = config => compose(chain(checkLocal), checkRemote)(config)

module.exports = { checkStrEmpty, checkObjEmpty, checkKey, checkConfigKeys }

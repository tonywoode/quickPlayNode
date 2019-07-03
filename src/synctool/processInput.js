const { Maybe } = require('sanctuary')
const { Just, Nothing } = Maybe
const { isEmpty } = require('Ramda')
const checkEmpty = romPath => {
  return romPath && Just(romPath) || Nothing 
}

const checkRootPaths = config => {
 return isEmpty(config) && Nothing || Just(config)

}

module.exports = { checkEmpty, checkRootPaths }

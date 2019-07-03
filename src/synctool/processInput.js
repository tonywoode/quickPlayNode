const Maybe = require('data.maybe')
const { Just, Nothing } = Maybe

const processInput = romPath => {
  return romPath && Just(romPath) || Nothing() 
  console.log(romPath)
}

module.exports = processInput

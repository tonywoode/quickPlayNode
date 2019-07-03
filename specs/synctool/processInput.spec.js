const Maybe = require('data.maybe')
const { Just, Nothing } = Maybe
const  processInput = require("../../src/synctool/processInput.js")

describe.only('processInput', () => {

  describe('nullChecks', () => {
    it('when not passed a rompath, will do nothing', () => {
    expect(processInput()).to.deep.equal(Nothing())
    expect(processInput(null)).to.deep.equal(Nothing())
    expect(processInput(undefined)).to.deep.equal(Nothing())
    expect(processInput("")).to.deep.equal(Nothing())
    })


  })

  describe('inputCheck', () => {
   it('when given a value, returns it', () => {
   expect(processInput("hello")).to.deep.equal(Just("hello"))
   })
  })

})

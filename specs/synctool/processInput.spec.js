const { Maybe } = require("sanctuary")
const { Just, Nothing } = Maybe
const { checkEmpty, checkRootPaths } = require("../../src/synctool/processInput.js")

describe.only("processInput", () => {
  describe("nullChecks", () => {
    it("when not passed a rompath, will do nothing", () => {
      expect(checkEmpty()).to.deep.equal(Nothing)
      expect(checkEmpty(null)).to.deep.equal(Nothing)
      expect(checkEmpty(undefined)).to.deep.equal(Nothing)
      expect(checkEmpty("")).to.deep.equal(Nothing)
    })
  })

  it("when given a value, returns it", () => {
    expect(checkEmpty("hello")).to.deep.equal(Just("hello"))
  })

  describe("checkRootPaths", () => {
    it("when passed no rootPaths, warn", () => {
      expect(checkRootPaths({})).to.deep.equal(Nothing)

    })

  })
})

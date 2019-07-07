const { Maybe, Either } = require("sanctuary")
//const Either = require('data.either')
const { Just, Nothing } = Maybe
const { Left, Right } = Either
const {
  strEmpty,
  checkObjEmpty,
  checkKey,
  checkConfigKeys
} = require("../../src/synctool/processInput.js")

describe("synctool: processInput", () => {
    describe("strEmpty", () => {
      it("return false on empty String", () => {
        expect(strEmpty()).to.be.true
        expect(strEmpty(null)).to.be.true
        expect(strEmpty(undefined)).to.be.true
        expect(strEmpty("")).to.be.true
      })
      it("return false on non-empty string", () => {
        expect(strEmpty("hello")).to.be.false
      })
    })

    describe("checkObjEmpty", () => {
      it("error when not passed a config oject", () => {
        expect(checkObjEmpty()).to.deep.equal(Nothing)
      })
      it("error not passed a config object", () => {
        expect(checkObjEmpty("")).to.deep.equal(Nothing)
      })
      it("error when passed an empty config oject", () => {
        expect(checkObjEmpty({})).to.deep.equal(Nothing)
      })

      it("when passed a non-empty config, return it", () => {
        const nonEmptyObj = { notEmpty: "notEmpty" }
        expect(checkObjEmpty(nonEmptyObj)).to.deep.equal(Just(nonEmptyObj))
      })
    })

    describe("checkKey", () => {
      it("when passed an invalid config object, error", () => {
        const key = "remotePath"
        const config = {}
        expect(checkKey(key)(config)).to.deep.equal(Left(`${key} is not set`))
      })
      it("when passed an valid config object, return it", () => {
        const key = "remotePath"
        const config = {
          remotePath: "remotePath",
          localPath: "localPath"
        }
        expect(checkKey(key)(config)).to.deep.equal(Right(config))
      })
    })

     describe("checkConfigKeys", () => {
      it("when passed an invalid config object, errors", () => {
        const config = {
          localPath: "localPath"
        }
        expect(checkConfigKeys(config)).to.deep.equal(
          Left("remotePath is not set")
        )
      })
      it("when passed a valid config object, gives us our paths back", () => {
        const config = {
          remotePath: "remotePath",
          localPath: "localPath"
        }
        expect(checkConfigKeys(config)).to.deep.equal(Right(config))
      })
    })


})

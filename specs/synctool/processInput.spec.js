const { compose } = require("ramda")
const { Maybe, Either } = require("sanctuary")
const { either } = require("sanctuary")
const { Just, Nothing } = Maybe
const { Left, Right } = Either
const {
  strEmpty,
  checkObjEmpty,
  checkKey,
  checkConfigKeys,
  getSubDir
} = require("../../src/synctool/processInput.js")

const newError = msg => {
  throw new Error(msg)
}

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
  describe("getSubDir", () => {
    it("errors if child is not a subpath of parent", done => {
      compose(
        either(rej => expect(rej).to.match(/is not in/) && done())(res =>
          newError(`isSubDir should have failed: ${res}`)
        )(getSubDir("bar")("foo"))
      )
    })

    it("errors if child and parent paths are the same", done => {
      const samePath = "foo/bar/" //TODO: really should display a different error for this situation
      compose(
        either(rej => expect(rej).to.match(/is not in/) && done())(res =>
          newError(`isSubDir should have failed: ${res}`)
        )(getSubDir(samePath)(samePath))
      )
    })
    it("returns relative path if child is a subpath of parent", done => {
      compose(
        either(rej => newError(`isSubDir should have succeded: ${rej}`))(
          res => expect(res).to.equal("baz") && done()
        )
      )(getSubDir("foo/bar/baz")("foo/bar"))
    })
  })
})

const mock = require("mock-fs")
const path = require("path")
const { compose } = require("ramda")
const { either } = require("sanctuary")
const join = (...paths) => path.join(...paths)

const {
  stat,
  isDir,
  isFile,
  getSize,
  fileIs0KB,
  getSubDir
} = require("../../src/synctool/checkFiles.js")

const newError = msg => {
  throw new Error(msg)
}

const root = "root/path/on/my/pc"
const pathToSrcDir = join(root, `source`)
const pathToTextFile = join(root, `source/textFile`)
const pathToEmptyFile = join(root, `source/emptyFile`)
const sizeOfTextFile = 10

describe("synctool: checkFiles", () => {
  beforeEach(() => {
    mock({
      [root]: {
        source: {
          textFile: "helloThere",
          emptyFile: ""
        },
        dest: {}
      }
    })
  })

  describe("stat", () => {
    it("errors if path is not available", done => {
      stat("invalid path").fork(
        rej => expect(rej).to.match(/stat error/) && done(),
        res => newError("stat should have failed")
      )
    })
    it("produces stat if path is available", done => {
      stat(pathToTextFile).fork(
        _ => newError("stat should have succeeded"),
        res => expect(res).to.have.property("nlink") && done()
      )
    })
  })

  describe("isDir", () => {
    it("says a file is not a dir", done => {
      isDir(pathToTextFile).fork(
        _ => _,
        res => expect(res).to.be.false && done()
      )
    })
    it("says a dir is a dir", done => {
      isDir(pathToSrcDir).fork(_ => _, res => expect(res).to.be.true && done())
    })
  })

  describe("isFile", () => {
    it("says a dir is not a file", done => {
      isFile(pathToSrcDir).fork(
        _ => _,
        res => expect(res).to.be.false && done()
      )
    })
    it("says a file is a file", done => {
      isFile(pathToTextFile).fork(
        _ => _,
        res => expect(res).to.be.true && done()
      )
    })
  })

  describe("getSize", () => {
    it("errors if path isn't available", done => {
      getSize("random").fork(
        rej => expect(rej).to.match(/stat error/) && done(),
        res => newError(`getSize should have failed: ${res}`)
      )
    })
    it("returns filesize if file is available", done => {
      getSize(pathToTextFile).fork(
        rej => newError(`getSize should have succeded: ${rej}`),
        res => expect(res).to.equal(sizeOfTextFile) && done()
      )
    })
  })

  describe("fileIs0KB", () => {
    it("errors if path isn't available", done => {
      fileIs0KB("random").fork(
        rej => expect(rej).to.match(/stat error/) && done(),
        res => newError(`fileIs0KB should have failed: ${res}`)
      )
    })
    it("returns false on a folder", done => {
      fileIs0KB(pathToSrcDir).fork(
        rej => newError(`fileIs0KB should have succeded: ${rej}`),
        res => expect(res).to.be.false && done()
      )
    })
    it("returns false on a non-empty file", done => {
      fileIs0KB(pathToTextFile).fork(
        rej => newError(`fileIs0KB should have succeded: ${rej}`),
        res => expect(res).to.be.false && done()
      )
    })
    it("returns true on an empty file", done => {
      fileIs0KB(pathToEmptyFile).fork(
        rej => newError(`fileIs0KB should have succeded: ${rej}`),
        res => expect(res).to.be.true && done()
      )
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

    it("returns relative path if child is a subpath of parent", done => {
      compose(
        either(rej => newError(`isSubDir should have succeded: ${rej}`))(
          res => expect(res).to.equal("baz") && done()
        )(getSubDir("foo/bar/baz")("foo/bar"))
      )
    })
  })
})

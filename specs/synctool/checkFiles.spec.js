const mock = require("mock-fs")
const path = require("path")
const join = (...paths) => path.join(...paths)

const {
  stat,
  isDir,
  isFile,
  getSize,
  fileIs0KB
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
      stat("invalid path")
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/no such file/) && done(),
          onResolved: res => newError("stat should have failed")
        })
    })

    it("produces stat if path is available", done => {
      stat(pathToTextFile)
        .run()
        .listen({
          onRejected: _ => newError("stat should have succeeded"),
          onResolved: res => expect(res).to.have.property("nlink") && done()
        })
    })
  })

  describe("isDir", () => {
    it("says a file is not a dir", done => {
      stat(pathToTextFile)
        .run()
        .listen({
          onRejected: _ => newError("stat should have succeeded"),
          onResolved: res =>
            expect(isDir(res).getOrElse()).to.be.false && done()
        })
    })
    it("says a dir is a dir", done => {
      stat(pathToSrcDir)
        .run()
        .listen({
          onRejected: _ => newError("stat should have succeeded"),
          onResolved: res => expect(isDir(res).getOrElse()).to.be.true && done()
        })
    })
  })

  describe("isFile", () => {
    it("says a dir is not a file", done => {
      stat(pathToSrcDir)
        .run()
        .listen({
          onRejected: _ => newError("stat should have succeeded"),
          onResolved: res =>
            expect(isFile(res).getOrElse()).to.be.false && done()
        })
    })
    it("says a file is a file", done => {
      stat(pathToTextFile)
        .run()
        .listen({
          onRejected: _ => newError("stat should have succeeded"),
          onResolved: res =>
            expect(isFile(res).getOrElse()).to.be.true && done()
        })
    })
  })

  describe("getSize", () => {
    it("errors if path isn't available", done => {
      getSize("not a real path")
        .map(_ => newError("getSize should have failed"))
        .getOrElse(expect(true)) && done()
    })

    it("returns filesize if file is available", done => {
      const expectedSizeOfTextFile = 10
      stat(pathToTextFile)
        .run()
        .listen({
          onRejected: _ => newError("stat should have succeeded"),
          onResolved: res =>
            expect(getSize(res).getOrElse()).to.equal(expectedSizeOfTextFile) &&
            done()
        })
    })
  })

  //  describe("fileIs0KB", () => {
  //    it("errors if path isn't available", done => {
  //      fileIs0KB("random").fork(
  //        rej => expect(rej).to.match(/stat error/) && done(),
  //        res => newError(`fileIs0KB should have failed: ${res}`)
  //      )
  //    })
  //    it("returns false on a folder", done => {
  //      fileIs0KB(pathToSrcDir).fork(
  //        rej => newError(`fileIs0KB should have succeded: ${rej}`),
  //        res => expect(res).to.be.false && done()
  //      )
  //    })
  //    it("returns false on a non-empty file", done => {
  //      fileIs0KB(pathToTextFile).fork(
  //        rej => newError(`fileIs0KB should have succeded: ${rej}`),
  //        res => expect(res).to.be.false && done()
  //      )
  //    })
  //    it("returns true on an empty file", done => {
  //      fileIs0KB(pathToEmptyFile).fork(
  //        rej => newError(`fileIs0KB should have succeded: ${rej}`),
  //        res => expect(res).to.be.true && done()
  //      )
  //    })
  //  })
})

const mock = require("mock-fs")
const path = require("path")
const join = (...paths) => path.join(...paths)

const { stat, isDir, isFile, isSubdir } = require("../../src/synctool/checkFiles.js")

const newError = msg => {
  throw new Error(msg)
}
describe.only("checkFiles", () => {
  const root = "root/path/on/my/pc"
  const pathToSrcDir = join(root, `source`)
  const pathToTextFile = join(root, `source/textFile`)

  beforeEach(() => {
    mock({
      [root]: {
        source: {
          textFile: "helloThere"
        },
        dest: {}
      }
    })
  })
  describe("stat", () => {
    it("reports if path not available", done => {
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
      isDir(pathToSrcDir).fork(
        _ => _,
        res => expect(res).to.be.true && done()
      )
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

  describe("isSubdir", () => {
    it("falsey if child is not a subpath of parent", done => {
      expect( isSubdir("foo") ("bar")).to.be.false && done()
    })

    it("truthy if child is a subpath of parent", done => {
      expect( isSubdir("foo/bar/baz") ("foo/bar")).to.be.true && done()
    })
  })
})

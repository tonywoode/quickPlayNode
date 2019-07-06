const mock = require("mock-fs")
const { stat } = require("../../src/synctool/checkFiles.js")
const path = require("path")
const join = (...paths) => path.join(...paths)
const newError = msg => {
  throw new Error(msg)
}
describe("checkFiles", () => {
  const root = "root/path/on/my/pc"

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
      stat(join(root, `source/textFile`)).fork(
        res => newError("stat should have succeeded"),
        res => expect(res).to.have.property("nlink") && done()
      )
    })
  })
})

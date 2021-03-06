const mock = require('mock-fs')
const path = require('path')
const join = (...paths) => path.join(...paths)

const { stat, isDir, isFile, getSize } = require('../../src/synctool/checkFiles.js')

const newError = msg => {
  throw new Error(msg)
}

const root = 'root/path/on/my/pc'
const pathToSrcDir = join(root, `source`)
const pathToTextFile = join(root, `source/textFile`)

describe('synctool: checkFiles', () => {
  beforeEach(() => {
    mock({
      [root]: {
        source: {
          textFile: 'helloThere',
          emptyFile: ''
        },
        dest: {}
      }
    })
  })

  afterEach(() => mock.restore())

  describe('stat', () => {
    it('errors if path is not available', done =>
      stat('invalid path')
        .run()
        .listen({
          onRejected: rej => expect(rej).to.match(/ENOENT/) && done(), // https://stackoverflow.com/a/19902850/3536094
          onResolved: res => newError(`stat should have failed: ${res}`)
        }))

    it('produces stat if path is available', done =>
      stat(pathToTextFile)
        .run()
        .listen({
          onRejected: rej => newError(`stat should have succeeded: ${rej}`),
          onResolved: res => expect(res).to.have.property('nlink') && done()
        }))
  })

  describe('isDir', () => {
    it('says a file is not a dir', done =>
      stat(pathToTextFile)
        .run()
        .listen({
          onRejected: rej => newError(`stat should have succeeded: ${rej}`),
          onResolved: res => expect(isDir(res).getOrElse()).to.be.false && done()
        }))

    it('says a dir is a dir', done =>
      stat(pathToSrcDir)
        .run()
        .listen({
          onRejected: rej => newError(`stat should have succeeded: ${rej}`),
          onResolved: res => expect(isDir(res).getOrElse()).to.be.true && done()
        }))
  })

  describe('isFile', () => {
    it('says a dir is not a file', done =>
      stat(pathToSrcDir)
        .run()
        .listen({
          onRejected: rej => newError(`stat should have succeeded: ${rej}`),
          onResolved: res => expect(isFile(res).getOrElse()).to.be.false && done()
        }))

    it('says a file is a file', done =>
      stat(pathToTextFile)
        .run()
        .listen({
          onRejected: rej => newError(`stat should have succeeded: ${rej}`),
          onResolved: res => expect(isFile(res).getOrElse()).to.be.true && done()
        }))
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

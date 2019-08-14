const mock = require('mock-fs')
const path = require('path')
const join = (...paths) => path.join(...paths)

const { copyFile, mkdirRecursive } = require('../../src/synctool/copyFile.js')
const newError = msg => {
  throw new Error(msg)
}
const localRoot = 'the/local/root'
const remoteRoot = 'the/remote/root'

describe('synctool: copyFile', () => {
  beforeEach(() => {
    mock({
      [localRoot]: { directory: {} },
      [remoteRoot]: { directory: { AFile: 'Hi im a file' } }
    })
  })

  afterEach(() => mock.restore())

  // pity we're atomically testing this, really we need in integration test to
  // show that we shout instead of trying to copy folders, and we don't copy without mkdirp and so on
  describe('copyFile', () => {
    it('copies a file', done => {
      const fileName = 'AFile'
      copyFile(join(remoteRoot, 'directory', fileName), join(localRoot, 'directory', fileName))
        .run()
        .listen({
          onRejected: rej => newError(`copyFile should have succeeded: ${rej}`),
          onResolved: res => expect(res).to.be.true && done()
        })
    })
  })

  // works fine when outside mockfs, despite version number of mockfs being acceptable
  //  (https://github.com/tschaub/mock-fs/issues/257) - yet still doesn't work
  describe.skip('mkdirRecursive', () => {
    it('makes a number in on-path directories if they dont exist', done => {
      mkdirRecursive(join(localRoot, 'directory', 'anotherDirectory', 'yetAnotherDirectory'))
        .run()
        .listen({
          onRejected: rej => newError(`mkdirRecursive should have succeeded: ${rej}`),
          onResolved: res => expect(res).to.be.true && done()
        })
    })
  })
})
// should check checksums after copying?
// should report if there's an error during copy
// should overwrite existing files
// should refuse on directories?!?
// should report if read or write denied

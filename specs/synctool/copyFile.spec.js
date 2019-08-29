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
  // remember we need to pass a stat of the timestamps to update them for cross platform
  describe('copyFile', () => {
    it('copies a file', done => {
      const fileName = 'AFile'
      const year = 2019
      copyFile(join(remoteRoot, 'directory', fileName), join(localRoot, 'directory', fileName), {
        atime: year,
        mtime: year
      })
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

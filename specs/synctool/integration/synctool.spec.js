const fs = require('fs')
const path = require('path')
const join = (...paths) => path.join(...paths)
const { synctool } = require('../../../src/synctool/index.js')
const newError = msg => {
  throw new Error(msg)
}
const mountPath = join('specs', 'synctool', 'integration')
const localRoot = 'localRoot'
const remoteRoot = 'remoteRoot'
const configFileName = 'integrationTestConfigFile.json'

const fileName = '1MegFile'

describe('synctool: Integration Tests', () => {
  beforeEach(() => {})

  afterEach(() => {})
  // clear up all the files we copied
  after(() => {
    fs.unlink(join(mountPath, localRoot, fileName), err =>
      console.error(`cleanup unlink errors are: ${err}`)
    )
  })

  describe('copyFile', () => {
    it.only('copies a file', done => {
      console.log(process.cwd())
      synctool(join(mountPath, localRoot, fileName), join(mountPath, configFileName))
        .run()
        .listen({
          onRejected: rej => newError(`copyFile should have succeeded: ${rej}`),
          onResolved: res => expect(res).to.be.true && done()
        })
    })
  })

  //  show that we shout instead of trying to copy folders, and we don't copy without mkdirp and so on
 
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

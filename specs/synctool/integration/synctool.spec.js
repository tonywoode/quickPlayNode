const fs = require('fs')
const path = require('path')
const join = (...paths) => path.join(...paths)
const { synctool } = require('../../../src/synctool/index.js')
const newError = msg => {
  throw new Error(msg)
}
const mountPath = join('specs', 'synctool', 'integration')
const localRoot = 'localRoot'
const configFileName = 'integrationTestConfigFile.json'
const badConfigFileName = 'integrationTestConfigFileNoLocal.json'

const fileName = '1MegFile'
const sameFileName = '1MegSameFile'
const localIsLargerFile = 'localIsLarger'
const folderName = 'folder'
const nestedFolderName = 'anotherFolder'

describe('synctool: Integration Tests', () => {
  // clear up all the files we copied
  after(() => {
    fs.unlink(join(mountPath, localRoot, fileName), err =>
      console.error(`cleanup unlink errors are: ${err}`)
    )
    fs.unlink(join(mountPath, localRoot, folderName, fileName), err =>
      console.error(`cleanup unlink errors are: ${err}`)
    ) 
    fs.unlink(join(mountPath, localRoot, folderName, nestedFolderName, fileName), err =>
      console.error(`cleanup unlink errors are: ${err}`)
    )
    fs.rmdir(join(mountPath, localRoot, folderName, nestedFolderName), err =>
      console.error(`cleanup rmdir errors are: ${err}`)
    )
    fs.rmdir(join(mountPath, localRoot, folderName), err =>
      console.error(`cleanup unlink errors are: ${err}`)
    )
  })

  describe('readConfig', () => {
    it('reports that the right root isnt accessible', done => {
      // this requires the fileName to include the inacessible root specified in the config
      const invalidDir = 'directory/that/doesnt/exist'
      synctool(join(invalidDir, fileName), join(mountPath, badConfigFileName))
        .run()
        .listen({
          onRejected: rej => expect(rej).to.contain(invalidDir) && done(),
          onResolved: res => newError(`readConfig should have failed: ${res}`)
        })
    })
  })
  describe('copyFile', () => {
    it('copies a file', done => {
      synctool(join(mountPath, localRoot, fileName), join(mountPath, configFileName))
        .run()
        .listen({
          onRejected: rej => newError(`copyFile should have succeeded: ${rej}`),
          onResolved: res => expect(res).to.be.true && done()
        })
    })

    // show that we shout instead of trying to copy folders,
    it('doesnt copy a folder', done => {
      synctool(join(mountPath, localRoot, folderName), join(mountPath, configFileName))
        .run()
        .listen({
          onRejected: rej => expect(rej).to.include('only files can be synced') && done(),
          onResolved: res => newError(`copyFile should have failed: ${res}`)
        })
    })

    it('errors if remote file doesnt exist', done => {
      synctool(join(mountPath, localRoot, 'fileThatIsntThere'), join(mountPath, configFileName))
        .run()
        .listen({
          onRejected: rej => expect(rej).to.include('File Not In Remote Folder') && done(),
          onResolved: res => newError(`copySameFile should have failed: ${res}`)
        })
    })

    //  and we don't copy without mkdirp and so on
    it('copies a nested file', done => {
      synctool(join(mountPath, localRoot, folderName, fileName), join(mountPath, configFileName))
        .run()
        .listen({
          onRejected: rej => newError(`nested copyFile should have succeeded: ${rej}`),
          onResolved: res => expect(res).to.be.true && done()
        })
    })

    it('copies a deeply nested file', done => {
      synctool(join(mountPath, localRoot, folderName, nestedFolderName, fileName), join(mountPath, configFileName))
        .run()
        .listen({
          onRejected: rej => newError(`nested copyFile should have succeeded: ${rej}`),
          onResolved: res => expect(res).to.be.true && done()
        })
    })

    it('doesnt copy equal files', done => {
      synctool(join(mountPath, localRoot, sameFileName), join(mountPath, configFileName))
        .run()
        .listen({
          onRejected: rej => expect(rej).to.include('Equal file exists in both paths') && done(),
          onResolved: res => newError(`copySameFile should have failed: ${res}`)
        })
    })

    it('doesnt copy if local is larger', done => {
      synctool(join(mountPath, localRoot, localIsLargerFile), join(mountPath, configFileName))
        .run()
        .listen({
          onRejected: rej => expect(rej).to.include('local file is larger') && done(),
          onResolved: res => newError(`copySameFile should have failed: ${res}`)
        })
    })
  })
  // should check checksums after copying?
  // should report if there's an error during copy
  // should overwrite existing files
  // should refuse on directories?!?
  // should report if read or write denied
})

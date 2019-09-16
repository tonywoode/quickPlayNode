const fs = require('fs')
const { task } = require('folktale/concurrency/task')
const Maybe = require('folktale/maybe')
const { Just, Nothing } = Maybe

// Path -> Task Error String
const stat = file =>
  task(r => {
    fs.stat(file, (err, stats) => {
      // https://github.com/origamitower/folktale/issues/153#issuecomment-452928871
      // we have a race condition in a Task's 'or', so the timeout I 'or' in the
      // main runner behaves correctly, but causes a stack print, without this check
      if (r.isCancelled) return
      err ? r.reject(err.message) : r.resolve(stats)
    })
  })

const isObject = obj => obj === Object(obj) // stackoverflow.com/a/22482737/3536094

// Object -> Maybe Boolean
const isDir = stat => (isObject(stat) ? Just(stat.isDirectory()) : Nothing())

// Object -> Maybe Boolean
const isFile = stat => (isObject(stat) ? Just(stat.isFile()) : Nothing())

// I don't think we need this because 0kb is just less than...
// Object -> Object -> Maybe Boolean
// const fileIsNotEmpty = stat =>
// isObject(stat) ? Maybe.Just(stat.size === 0) : Nothing() //folders have size 1

// Stat follows symlinks, but other fs methods will need a real path
// don't switch on a returned error, the local file may very well not exist, we're only
  // interested in changing the path if we find there's an existing symlink in the detination folder
// Path -> Task Error Path
const getRealPath = filePath =>
  task(r => {
    fs.readlink(filePath, (err, target) => {
      err
          ? r.resolve(filePath) // assume its not a symlink
        : ( 
        console.log(`[synctool] - destination is a symlink real path set to ${target}`), 
        r.resolve(target))
    })
  })

module.exports = { stat, isDir, isFile, getRealPath }

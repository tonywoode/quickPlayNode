const fs = require('fs')
const { task } = require('folktale/concurrency/task')
const crypto = require('crypto')
const hashType = 'md5'
const readline = require('readline')
const ctrlCToQuit = require('../helpers/ctrlCToQuit.js')
const mkdirp = require('mkdirp')
const log = msg => console.log(`[synctool] - ${msg}`)

// String -> Task String String
// https://github.com/h2non/jsHashes is an alternative, however any kind of hashing must read the WHOLE file so this isn't really acceptable without a good connection
const fileHash = filePath =>
  task(r => {
    log(`generating ${hashType} hash for ${filePath}`)
    const hash = crypto.createHash(hashType)
    const stream = fs.createReadStream(filePath, { autoClose: true })
    stream.on(`data`, data => hash.update(data, `utf8`))
    stream.on(`end`, () => r.resolve(hash.digest(`hex`)))
    stream.on(`error`, err => r.reject(`couldn\t hash ${filePath} - \n\t error is: ${err}`))
  })

// Path -> Task Error Boolean
const mkdirRecursive = folderPath =>
  task(r =>
    mkdirp(
      folderPath,
      err =>
        err
          ? r.reject(err)
          : (log(`ensured dir path: ${folderPath}`), r.resolve(true))
    )
  )
// waiting for pkg to support node >10 without some issue
//  task(r =>
//    fs.mkdir(
//      folderPath,
//      { recursive: true },
//      err =>
//        err
//          ? r.reject(err)
//          : (log(`ensured dir path: ${folderPath}`), r.resolve(true))
//    )
//  )

// String -> Task Error Stream
const readFile = filePath =>
  task(r => {
    const stream = fs.createReadStream(filePath)
    stream.on(`error`, err => {
      r.reject(err)
    })
    r.resolve(stream) // nb: gets called at least once even in error condition
  })

// String -> Task Error, String
const writeFile = (filePath, stream) =>
  task(r => {
    const writeStream = fs.createWriteStream(filePath)
    writeStream.on('finish', () => {
      writeStream.close()
      r.resolve(filePath)
    })

    writeStream.on('error', err => {
      writeStream.end()
      r.reject(err)
    })

    writeStream.on('unpipe', () => {
      stream.destroy()
      // stackoverflow.com/a/38520486/3536094, however if the unlink
      //   is here, it always also runs on successful completion
    })

    stream.pipe(writeStream)
    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.on('keypress', (str, key) => {
      if (key.ctrl && key.name === 'c') {
        stream.unpipe()
        log(`Cancelling...`)
        // expect that filePath isn't a symlink
        fs.unlink(filePath, err => {
          err
            ? r.reject(`[synctool] - couldn't delete cancelled transfer: ${err}`)
            : r.reject(`[synctool] - transfer was cancelled - local file deleted: ${filePath}`)
          process.exit(1)
        })
      }
    })
    console.log('Press ctrl+c to abort...')
  })

/* we use modified date to determine equality, copyFile on windows preserves it
 * but nothing else does...to make this consistent, update modified date
 * why doesn't node do this? because of the concern that the file might
 * change underneath us as im talking...https://github.com/nodejs/node/issues/15793 */
// Path -> Stat -> Task _
const copyTimestamps = (path, sourceStat) =>
  task(r =>
    fs.utimes(
      path,
      sourceStat.atime,
      sourceStat.mtime,
      err =>
        err
          ? r.reject(`[synctool] - copied ${path} but couldn't update timestamps from source`)
          : (log(`copied timestamps from source file`), r.resolve(true))
    )
  )

// streams is the old way of copying, its much slower and copies only file contents and loses all metadata,
//  but has several advantages for us here: firstly it has hooks so we can cancel during copy, which won't
//  leave a corrupt destination file (on windows of full size!). We'll need the true path of the destination
//  in case we're pointing to a symlink
const copyFileStream = (src, dest, remoteStat) =>
  readFile(src)
    .chain(stream => writeFile(dest, stream))
    .chain(_ => copyTimestamps(dest, remoteStat))

// Path -> Path -> Task Error _
const copy = (src, dest) =>
  task(r =>
    fs.copyFile(
      src,
      dest,
      err =>
        err
          ? r.reject(`[synctool] - copy failed: ${err}`)
          : (log(`data copy succeeded: ${dest}`), r.resolve(dest))
    )
  )

/* fs.copyfile uses native os copy, which seems initially the better plan
 * but forget about progress: https://github.com/nodejs/node/pull/15034#issuecomment-326092955
 * and forget about progress in anything that uses fs.copyFile https://github.com/sindresorhus/cp-file/issues/18#issuecomment-327860860 */
// Path -> Path -> Stat -> Task Error _
const copyFile = (src, dest, remoteStat) => {
  log(`copying:\n ${src} \n to \n ${dest} \n file is ${humanFileSize(remoteStat.size)}`)
  // TODO: if using copyFile, on windows ctrl+c may have a problem doing anything, fix that
  const exitCodeZero = 0; ctrlCToQuit(exitCodeZero)
  return copy(src, dest).chain(_ => copyTimestamps(dest, remoteStat))
}

// stackoverflow.com/a/14919494/3536094
const humanFileSize = (bytes, si) => {
  const thresh = si ? 1000 : 1024
  Math.abs(bytes) < thresh && `${bytes} B`
  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  do {
    bytes /= thresh
    ++u
  } while (Math.abs(bytes) >= thresh && u < units.length - 1)
  return bytes.toFixed(1) + ' ' + units[u]
}

module.exports = { fileHash, copyFile, copyFileStream, mkdirRecursive, humanFileSize }

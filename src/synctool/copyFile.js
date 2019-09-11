const fs = require('fs')
const { task } = require('folktale/concurrency/task')
const crypto = require('crypto')
const hashType = 'md5'

// String -> Task String String
// https://github.com/h2non/jsHashes is an alternative, however any kind of hashing must read the WHOLE file so this isn't really acceptable without a good connection
const fileHash = filePath =>
  task(r => {
    console.log(`[synctool] - generating ${hashType} hash for ${filePath}`)
    const hash = crypto.createHash(hashType)
    const stream = fs.createReadStream(filePath, { autoClose: true })
    stream.on(`data`, data => hash.update(data, `utf8`))
    stream.on(`end`, () => r.resolve(hash.digest(`hex`)))
    stream.on(`error`, err => r.reject(`couldn\t hash ${filePath} - \n\t error is: ${err}`))
  })

// Path -> Task Error Boolean
const mkdirRecursive = folderPath =>
  task(r =>
    fs.mkdir(
      folderPath,
      { recursive: true },
      err =>
        err
          ? r.reject(err)
          : (console.log(`[synctool] - ensured dir path: ${folderPath}`), r.resolve(true))
    )
  )

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
    stream.pipe(writeStream)
  })

// here's the old way of copying, its much slower and copies only file contents and loses all metadata!
const copyFileStreamOLD = (src, dest, remoteStat) =>
  readFile(src).chain(stream => writeFile(dest, stream))

const copyFileStream = (src, dest, remoteStat) => {

    const to = fs.createWriteStream(dest)
    const from = fs.createReadStream(src)
to.on('unpipe', function () {
        fs.unlinkSync(dest) // effectively deletes the file
      })
    const readline = require('readline');
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', (str, key) => {
      if (key.ctrl && key.name === 'c') {
        from.unpipe()
        process.exit();
      } else {
        console.log(`You pressed the "${str}" key`);
        console.log();
        console.log(key);
        console.log();
      }
    });
    console.log('Press any key...');


  return task(r => {
      to.on('finish', () => {
        // we use modified date to determine equality, but only windows preserves it
        // to make this consistent on nix, we need to update the modified date
        // why doesn't node do this? because of the concern that the file might
        // change underneath us as im talking...https://github.com/nodejs/node/issues/15793
        fs.utimes( dest, remoteStat.atime, remoteStat.mtime,
          err => (err ? r.reject(err) : r.resolve(true))
        )
        to.close()
      })
      .on('error', err => {
        to.end()
        r.reject(err)
      })
      

    from.pipe(to)
  })
}
/* fs.copyfile uses native os copy, which seems initially the better plan
 * but forget about progress: https://github.com/nodejs/node/pull/15034#issuecomment-326092955
 * and forget about progress in anything that uses fs.copyFile https://github.com/sindresorhus/cp-file/issues/18#issuecomment-327860860 */
// String -> Task Error, String
const copyFile = (src, dest, remoteStat) =>
  task(r =>
    fs.copyFile(
      src,
      dest,
      err =>
        err
          ? r.reject(err)
          : // we use modified date to determine equality, but only windows preserves it
        // to make this consistent on nix, we need to update the modified date
        // why doesn't node do this? because of the concern that the file might
        // change underneath us as im talking...https://github.com/nodejs/node/issues/15793
          fs.utimes(
            dest,
            remoteStat.atime,
            remoteStat.mtime,
            err => (err ? r.reject(err) : r.resolve(true))
          )
    )
  )

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

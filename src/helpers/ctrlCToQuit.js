// https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js/14861513#14861513
// its said SIGINT should work on any platform now, i didn't find that to be true, the below finally makes windows cmd  quit,
// but doesn't print the message, I suspect signals are working on powershell but not cmd
// TODO: what code to exit with, and anyway is windows receiving the wxit code (havent seen the message print very often)?
module.exports = (exitCode) => {
  const message = '[QPNode] exiting...)'
  process.on('SIGINT', () => console.log(message) || process.exit(exitCode))
  if (process.platform === 'win32') {
    require('readline')
      .createInterface({
        input: process.stdin,
        output: process.stdout
      })
      .on('SIGINT', () => process.emit('SIGINT'))
  }
}

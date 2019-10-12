const remote = require('electron').remote
const main = remote.require('./main.js')
const config = main.getConfig()

let enabledOnMachines = []

document.getElementById('globalEnable').checked = config.globalEnable
document.getElementById('localPath').value = config.localRoot
document.getElementById('remotePath').value = config.remoteRoot
Array.isArray(config.enableOnHostName) && (enabledOnMachines = config.enableOnHostName)
displayArray()

function cancelEvent () {
  var window = remote.getCurrentWindow()
  window.close()
}

function okEvent () {
  const globalEnabled = document.getElementById('globalEnable').checked
  const localRoot = document.getElementById('localPath').value
  const remoteRoot = document.getElementById('remotePath').value

  const synctoolIsEnabled =
    (Array.isArray(enabledOnMachines) && enabledOnMachines.length !== 0) || globalEnabled
  if (synctoolIsEnabled && !(localRoot && remoteRoot)) {
    return alert('Both Local Root and Remote Root must be selected when Synctool is Enabled')
  }
  if (synctoolIsEnabled && localRoot === remoteRoot) {
    return alert('Local Root and Remote Root cannot be the same')
  }
  config.globalEnable = globalEnabled
  // i'd like to do path.normalize here, but that saves a dot instead of ''
  config.localRoot = localRoot
  config.remoteRoot = remoteRoot
  config.enableOnHostName = enabledOnMachines // in the unlikely case it wasn't an array when we started
  var window = remote.getCurrentWindow()
  main.saveConfig()
  window.close()
}

function openLocal () {
  const result = main.showOpenDialog()
  result && (document.getElementById('localPath').value = result)
}

function openRemote () {
  const result = main.showOpenDialog()
  result && (document.getElementById('remotePath').value = result)
}

function displayArray () {
  const printHosts = (accum, val) => accum + `Enabled on Host: ${val}<br/>`
  document.getElementById('Result').innerHTML = enabledOnMachines.reduce(printHosts, '')
}

function add_element_to_array () {
  const hostnameBox = document.getElementById('hostname')
  hostname.value &&
    (enabledOnMachines.push(hostnameBox.value), (hostnameBox.value = ''), displayArray())
}

function print_config () {
  alert(JSON.stringify(main.getConfig(), null, 2))
}
function delete_array () {
  enabledOnMachines.length = 0
  displayArray()
}

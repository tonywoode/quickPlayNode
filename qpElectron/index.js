const remote = require('electron').remote
const main = remote.require('./main.js')

function cancelEvent () {
  var window = remote.getCurrentWindow()
  window.close()
}

function okEvent () {
  var window = remote.getCurrentWindow()
  window.close()
}

function openLocal () {
  main.showOpenDialog()
}

function openRemote () {
  main.showOpenDialog()
}

const array = []

const displayArray = () => {
  let e = '<hr/>'
  for (const val of array) e += `Enabled on Host: ${val}<br/>`
  document.getElementById('Result').innerHTML = e
}

function add_element_to_array () {
  const hostnameBox = document.getElementById('hostname')
  hostname.value && (
    array.push(hostnameBox.value), 
    (hostnameBox.value = ''), 
    displayArray()
  )
}

function delete_array () {
  array.length = 0
  displayArray()
}

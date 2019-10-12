const { app, BrowserWindow, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const configFileName =  path.resolve('synctool_config.json')
//always write a config file on first run, irrespective of what happens...
let config = fs.existsSync(configFileName) ? require(configFileName) : makeConfigFile()
const _throw       = m => { throw new Error(m) }

let win

function makeConfigFile () {
  const newconfig = {
    'NOTE:OnWindows': '...use forward slashes for these paths, or double backslashes if you insist on backslashes',
    localRoot: '',
    remoteRoot: '',
    timeout: 10000,
    timeTolerance: 1000,
    globalEnable: false,
    enableOnHostName: [],
    useCopyOrCopyStream: 'copy'
  }
  const content = JSON.stringify(newconfig, null, 2)
  fs.writeFile(
    configFileName,
    content,
    'utf8',
    err => (err ? _throw(err) : config = require(configFileName))
  )
}

exports.getConfig = () => {
  return config
}

exports.saveConfig = () => {
  const content = JSON.stringify(config, null, 2)
  fs.writeFile(
    configFileName,
    content,
    'utf8',
    err => (err ? _throw(err) : console.log('[synctool] config saved'))
  )
}

function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 460,
    webPreferences: {
      nodeIntegration: true
    },
  })
  win.setMenuBarVisibility(false)
  win.loadFile('index.html')
}

app.on('ready', () => {
  createWindow()
  //win.webContents.openDevTools()
})

exports.showOpenDialog = () => {
  const result = dialog.showOpenDialogSync(win, {
    properties: ['openDirectory']
  })
  return result
}

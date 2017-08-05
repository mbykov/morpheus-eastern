'use strict'

const path = require('path')
const electron = require('electron')
const {app, Menu, Tray, ipcMain} = require('electron')
const clipboard = electron.clipboard
const jetpack = require("fs-jetpack")
const seg = require('hieroglyphic')
// const seg = require('../segmenter')
const PouchDB = require('pouchdb')
// PouchDB.plugin(require('pouchdb-adapter-node-websql'))
const isDev = require('electron-is-dev')
const tar = require('tar-fs')
const gunzip = require('gunzip-maybe')
const http = require('http')

// Module to control application life.
// const app = electron.app
// Module to create native browser window.

// console.log('ISDEV', isDev)

const upath = app.getPath('userData')
const dbPath = path.resolve(upath, 'pouchdb/chinese')
let dbState = jetpack.exists(dbPath)

if (!dbState) {
    // fs.chmodSync('test', 0755)
    const toPath = path.resolve(upath, 'pouchdb')
    // const fromPath = path.resolve(__dirname, '../app.asar.unpacked/pouchdb')
    const fromPath = path.resolve(__dirname, 'pouchdb')
    jetpack.copy(fromPath, toPath, { matching: '**/*' })
   dbState = jetpack.exists(dbPath)
}

process.on('unhandledRejection', (reason, p) => {
  // console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});


// 新华社北京
// 第三十七次会议 并发表重要讲话
let remote = new PouchDB('http:\/\/diglossa.org:5984/chinese')
let db = new PouchDB(dbPath)
// let db = PouchDB(dpath, {adapter: 'websql'})
db.sync(remote)

// function dbState(state) {
//     try {
//         mkdirp.sync(path.dirname(fullStoreFileName))
//         jsonfile.writeFileSync(fullStoreFileName, state)
//     } catch (err) {
//         // Don't care
//     }
// }


let timerId = null
let tray = null

app.on('ready', () => {
    let traypath = path.join(__dirname, 'assets/icons/32x32.png')
    tray = new Tray(traypath)
    const contextMenu = Menu.buildFromTemplate([
        {label: 'help', role: 'help'},
        {label: 'learn more', click () { electron.shell.openExternal('http:\/\/diglossa.org') }},
        {label: 'quit', role: 'quit'}
    ])
    tray.setToolTip('This is my application.')
    tray.setContextMenu(contextMenu)
})

const BrowserWindow = electron.BrowserWindow

let mainWindow

function createWindow () {
    mainWindow = new BrowserWindow({width: 800, height: 600, webPreferences: { webSecurity: false }})

    mainWindow.loadURL(`file://${__dirname}/build/index.html`)

    mainWindow.webContents.openDevTools()
    mainWindow.focus()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        timerId = null
        mainWindow = null
        tray = null
  })

    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    })

    mainWindow.webContents.on('download', function(langs) {
        console.log('L', langs)

    })

    // mainWindow.webContents.on('did-finish-load', function() {
        // mainWindow.webContents.send('parsed', 'kuku')
    // })
}

ipcMain.on('download', (event, langs) => {
    console.log('L', langs);
    let  target = './p/chinese'
    let req = http.request({
        host: 'localhost',
        port: 3001,
        path: '/dicts/pouch.tar.gz'
    })
    req.on('response', function(res){
        res.pipe(gunzip()).pipe(tar.extract(target));
        let len = parseInt(res.headers['content-length'], 10)
        mainWindow.webContents.send('barstart', len);

        res.on('data', function (chunk) {
            mainWindow.webContents.send('bar', chunk.length);
        })

        res.on('end', function () {
            mainWindow.webContents.send('barend');
            console.log('END')
        })
    })
    req.end()

});

function sendStatus(text) {
    mainWindow.webContents.send('status', text);
}



const template = [
    {
        role: 'window',
        submenu: [
            {role: 'minimize'},
            {role: 'close'},
            {role: 'quit'}
        ]
    },
    {
        label: 'Options',
        submenu: [
            {label: 'select dict',  click() { mainWindow.webContents.send('section', 'select-dict') }},
            {label: 'click dicts',  click() { console.log('item 1 clicked') }},
            {role: 'togglefullscreen'}
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click () { electron.shell.openExternal('https://electron.atom.io') }
            }
        ]
    }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)


app.on('ready', () => {
    let oldstr = null
    timerId = setInterval(function(){
        let str = clipboard.readText()
        if (!str) return
        if (str === oldstr) return
        oldstr = str

        seg(db, str, function(err, res) {
            if (err) return
            if (!mainWindow) return
            mainWindow.webContents.send('parsed', res)
        })

    }, 100)
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

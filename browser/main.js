const path = require('path')
const fs = require('fs')
const { promises } = require('fs')
const { app, session, BrowserWindow } = require('electron')

const { Tabs } = require('./tabs')
const { ElectronChromeExtensions } = require('electron-chrome-extensions')
const { setupMenu } = require('./menu')
const { buildChromeContextMenu } = require('electron-chrome-context-menu')

const CONFIG_FILE_PATH = 'configs'
const PAGES_FILE_NAME = 'pages.json'

// let startPage = "http://172.16.6.246.8090"

function loadConfig() {
  const configPath = path.join(path.resolve('./'), CONFIG_FILE_PATH)
  console.log(configPath)
  try {
    let result = fs.readFileSync(path.join(configPath, PAGES_FILE_NAME), { encoding: 'utf-8' })
    return JSON.parse(result)
  } catch (err) {
    console.log(err)
    return null
  }
}

function loadConfigToGlobal(jsonObject) {
  console.log(jsonObject)
  if (jsonObject && jsonObject.startPage) {
    return jsonObject.startPage
  }
}

let webuiExtensionId

const manifestExists = async dirPath => {
  if (!dirPath) return false
  const manifestPath = path.join(dirPath, 'manifest.json')
  try {
    return (await promises.stat(manifestPath)).isFile()
  } catch {
    return false
  }
}

async function loadExtensions(session, extensionsPath) {
  const subDirectories = await promises.readdir(extensionsPath, {
    withFileTypes: true
  })

  const extensionDirectories = await Promise.all(
    subDirectories
      .filter(dirEnt => dirEnt.isDirectory())
      .map(async dirEnt => {
        const extPath = path.join(extensionsPath, dirEnt.name)

        if (await manifestExists(extPath)) {
          return extPath
        }

        const extSubDirs = await promises.readdir(extPath, {
          withFileTypes: true
        })

        const versionDirPath =
          extSubDirs.length === 1 && extSubDirs[0].isDirectory() ? path.join(extPath, extSubDirs[0].name) : null

        if (await manifestExists(versionDirPath)) {
          return versionDirPath
        }
      })
  )

  const results = []

  for (const extPath of extensionDirectories.filter(Boolean)) {
    console.log(`Loading extension from ${extPath}`)
    try {
      const extensionInfo = await session.loadExtension(extPath)
      results.push(extensionInfo)
    } catch (e) {
      console.error(e)
    }
  }

  return results
}

const getParentWindowOfTab = tab => {
  switch (tab.getType()) {
    case 'window':
      return BrowserWindow.fromWebContents(tab)
    case 'browserView':
    case 'webview':
      return tab.getOwnerBrowserWindow()
    case 'backgroundPage':
      return BrowserWindow.getFocusedWindow()
    default:
      throw new Error(`Unable to find parent window of '${tab.getType()}'`)
  }
}

class TabbedBrowserWindow {
  constructor(options) {
    this.session = options.session || session.defaultSession
    this.extensions = options.extensions

    // Can't inheret BrowserWindow
    // https://github.com/electron/electron/issues/23#issuecomment-19613241
    this.window = new BrowserWindow(options.window)
    this.id = this.window.id
    this.webContents = this.window.webContents

    const webuiUrl = path.join('chrome-extension://', webuiExtensionId, '/webui.html')
    console.log(webuiUrl)
    this.webContents.loadURL(webuiUrl)

    this.tabs = new Tabs(this.window)

    const self = this

    this.tabs.on('tab-created', function onTabCreated(tab) {
      const startPage = loadConfigToGlobal(loadConfig())
      const initPage = startPage ? startPage : 'blank.page'
      if (options.initialUrl) tab.webContents.loadURL(initPage)
      console.log(options.initialUrl)

      // Track tab that may have been created outside of the extensions API.
      self.extensions.addTab(tab.webContents, tab.window)
    })

    this.tabs.on('tab-selected', function onTabSelected(tab) {
      self.extensions.selectTab(tab.webContents)
    })

    queueMicrotask(() => {
      // Create initial tab
      this.tabs.create()
    })
  }

  destroy() {
    this.tabs.destroy()
    this.window.destroy()
  }

  getFocusedTab() {
    return this.tabs.selected
  }
}

class Browser {
  windows = []

  constructor() {
    app.whenReady().then(this.init.bind(this))

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.destroy()
      }
    })

    app.on('web-contents-created', this.onWebContentsCreated.bind(this))

    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      // console.log(event)
      // console.log(url)
      // console.log(error)
      callback(true)
    })
  }

  destroy() {
    app.quit()
  }

  getFocusedWindow() {
    return this.windows.find(w => w.window.isFocused()) || this.windows[0]
  }

  getWindowFromBrowserWindow(window) {
    return !window.isDestroyed() ? this.windows.find(win => win.id === window.id) : null
  }

  getWindowFromWebContents(webContents) {
    let window

    if (this.popup && webContents === this.popup.browserWindow?.webContents) {
      window = this.popup.parent
    } else {
      window = getParentWindowOfTab(webContents)
    }

    return window ? this.getWindowFromBrowserWindow(window) : null
  }

  async init() {
    this.initSession()
    setupMenu(this)

    const browserPreload = path.join(__dirname, '../preload.js')
    this.session.setPreloads([browserPreload])

    this.extensions = new ElectronChromeExtensions({
      session: this.session,

      createTab: details => {
        const win = typeof details.windowId === 'number' && this.windows.find(w => w.id === details.windowId)

        if (!win) {
          throw new Error(`Unable to find windowId=${details.windowId}`)
        }

        const tab = win.tabs.create()

        if (details.url) tab.loadURL(details.url || newTabUrl)
        if (typeof details.active === 'boolean' ? details.active : true) win.tabs.select(tab.id)

        return [tab.webContents, tab.window]
      },
      selectTab: (tab, browserWindow) => {
        const win = this.getWindowFromBrowserWindow(browserWindow)
        win?.tabs.select(tab.id)
      },
      removeTab: (tab, browserWindow) => {
        const win = this.getWindowFromBrowserWindow(browserWindow)
        win?.tabs.remove(tab.id)
      },

      createWindow: details => {
        const win = this.createWindow({
          initialUrl: details.url || newTabUrl
        })
        // if (details.active) tabs.select(tab.id)
        return win.window
      },
      removeWindow: browserWindow => {
        const win = this.getWindowFromBrowserWindow(browserWindow)
        win?.destroy()
      }
    })

    this.extensions.on('browser-action-popup-created', popup => {
      this.popup = popup
    })

    const webuiExtension = await this.session.loadExtension(path.join(__dirname, 'ui'))
    webuiExtensionId = webuiExtension.id

    const newTabUrl = path.join('chrome-extension://', webuiExtensionId, 'new-tab.html')

    const installedExtensions = await loadExtensions(this.session, path.join(__dirname, '../extensions'))

    this.createWindow({ initialUrl: newTabUrl })
  }

  initSession() {
    this.session = session.defaultSession

    // Remove Electron and App details to closer emulate Chrome's UA
    const userAgent = this.session
      .getUserAgent()
      .replace(/\sElectron\/\S+/, '')
      .replace(new RegExp(`\\s${app.getName()}/\\S+`), '')
    this.session.setUserAgent(userAgent)
  }

  createWindow(options) {
    const win = new TabbedBrowserWindow({
      ...options,
      extensions: this.extensions,
      window: {
        width: 1280,
        height: 720,
        frame: false,
        webPreferences: {
          sandbox: true,
          nodeIntegration: false,
          enableRemoteModule: false,
          contextIsolation: true,
          worldSafeExecuteJavaScript: true
        }
      }
    })
    this.windows.push(win)

    if (process.env.SHELL_DEBUG) {
      win.webContents.openDevTools({ mode: 'detach' })
    }

    return win
  }

  async onWebContentsCreated(event, webContents) {
    const type = webContents.getType()
    const url = webContents.getURL()
    console.log(`'web-contents-created' event [type:${type}, url:${url}]`)

    if (process.env.SHELL_DEBUG && webContents.getType() === 'backgroundPage') {
      webContents.openDevTools({ mode: 'detach', activate: true })
    }

    webContents.setWindowOpenHandler(details => {
      switch (details.disposition) {
        case 'foreground-tab':
        case 'background-tab':
        case 'new-window': {
          // setWindowOpenHandler doesn't yet support creating BrowserViews
          // instead of BrowserWindows. For now, we're opting to break
          // window.open until a fix is available.
          // https://github.com/electron/electron/issues/33383
          queueMicrotask(() => {
            const win = this.getWindowFromWebContents(webContents)
            const tab = win.tabs.create()
            tab.loadURL(details.url)
          })

          return { action: 'deny' }
        }
        default:
          return { action: 'allow' }
      }
    })

    webContents.on('context-menu', (event, params) => {
      const menu = buildChromeContextMenu({
        params,
        webContents,
        extensionMenuItems: this.extensions.getContextMenuItems(webContents, params),
        openLink: (url, disposition) => {
          const win = this.getFocusedWindow()

          switch (disposition) {
            case 'new-window':
              this.createWindow({ initialUrl: url })
              break
            default:
              const tab = win.tabs.create()
              tab.loadURL(url)
          }
        }
      })

      menu.popup()
    })
  }
}

module.exports = Browser

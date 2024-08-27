import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  Tray,
  Menu,
  shell,
  nativeImage,
  screen,
} from 'electron';
import Server from 'electron-rpc/server';
import path from 'path';

const robot = require('robotjs');

const trayIcon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACW0lEQVR42l2TyWvaQRTHR/ODQi8lqEhB7KEHD3pI0fZQGm8SevAs+Q+8eWpMKaVpLW0vYo6eSreLx9JCECGIkVIwKS49BNz3fd/3fkecjPYHw8y8ee8z3zfv/Qj94vE4qdVqZLFYiJbLJZnP5/cx27F/PhqNdrEns9mM0DObzbaa2+02ufkCgQB1ECOAzg+m02mt0Wj8hNNvBP8dDAZ3ACKTyURMg+kwmUwckEgkqFG8vv0MgR+YY6/XOwf0ZL3f8Xg81EYHB0SjUXq4ko/bL3HTAdZ3MagiG27/6HQ6BazvrW0km81yQCwWYwB6eFWv1w8Auuh2u48Ae9Xv9x248Rlsn9dKBKPRyAHJZHILUCgUniLQXyqVHg+Hw9cIdrRaLStsXxhArVZzQDqd3gLk83kKuCgWi5uAo/F4zAA7KpWKA1Kp1BYgl8utFEAJBZwgldNms3mEt/jKAEqlkgPgyAC0Cpd4oJUC2J+ghG8AcABg3QTI5fL/q8AVZDIZCvABtofeOEZZT9EXVqj5xgASiYQDIpHIJuAPOtMA5zPkbMPL/0CXvgTgGLYbBTKZjANCodBmH1xBtgENs9fpdGII/AWX2wC/RTk/MYBUKuUAl8u1MtJD5PkdN7/Dmra4gPdYdShSOkd/vGAAhULBAYIgkHK5LEbZ6HvsQ8UATofUGSWlgPeQX0Q3yoPBIEGVRDqdjgO8Xi/R6/UsDZrSIWpfhJJrjBR64BopPaxWq6RSqYjMZjPRaDQcQGvKfp5wOCyy2+3EYrHs+nw+g9vt3tdqtbeon9/vFzE/9oj/AOHffdTL+hwRAAAAAElFTkSuQmCC';

const UPDATE_INTERVAL = 3 * 3600 * 1000;

let openAtLogin = false;
let updateAvailable = false;
let updateInterval = null;

let tray = null;
const server = new Server();
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const isWindows = process.platform === 'win32';

let activeScreen;
let crosshairdWindow;
let checkColorInterval;

// Minimal gap: 5px
const checkOffsets = [-2, 1, 0, 1, 2];

const crosshairWindowConfig = {
  show: false,
  frame: false,
  resizable: false,
  maximizable: false,
  fullscreenable: false,
  title: 'cp-scope',
  alwaysOnTop: true,
  skipTaskbar: true,
  visibleOnAllWorkspaces: true,
  focusable: false,
  transparent: true,
  hasShadow: false,
  webPreferences: {
    nodeIntegration: true,
  },
};

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  require('module').globalPaths.push(p);
}

const connectAutoUpdater = () => {
  autoUpdater.autoDownload = false;
  autoUpdater.on('update-available', () => {
    updateAvailable = true;
    if (isMac) {
      const response = dialog.showMessageBoxSync(null, {
        type: 'info',
        buttons: ['Close', 'Download'],
        title: 'cp-scope',
        detail: 'Update is available to download from GitHub.',
      });
      if (response) {
        shell.openExternal(
          'https://github.com/aklein13/cp-scope/releases/latest'
        );
      }
    } else {
      autoUpdater.downloadUpdate();
    }
  });
  autoUpdater.on('update-not-available', () => {
    updateAvailable = false;
  });
  autoUpdater.on('update-downloaded', () => {
    const response = dialog.showMessageBoxSync(null, {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      detail:
        'A new version has been downloaded.\nRestart the application to apply the updates.',
    });
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
};

const checkImgColors = (img, startColor, x, y, crossColor, shouldOffsetX) => {
  return checkOffsets.every(offset => {
    let color;
    try {
      color = img.colorAt(
        shouldOffsetX ? x + offset : x,
        shouldOffsetX ? y : y + offset,
      );
    } catch (e) {
      return false;
    }
    return color === startColor || color === crossColor;
  });
};

const checkColor = () => {
  const pos = robot.getMousePos();
  const newActiveScreen = screen.getDisplayNearestPoint(pos);
  const { bounds } = newActiveScreen;
  if (activeScreen && newActiveScreen.id !== activeScreen.id) {
    crosshairdWindow.setBounds(bounds);
  }
  activeScreen = newActiveScreen;
  const img = robot.screen.capture(
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height
  );
  pos.x -= bounds.x;
  pos.y -= bounds.y;
  const startX = pos.x;
  const startY = pos.y;
  const startColor = img.colorAt(startX, startY);
  // TODO Make it not take same as bg
  const crossColor = 'ff0000';

  let x = startX + 1;
  let y = startY + 1;
  let right = 0;
  let left = 0;
  let top = 0;
  let bottom = 0;

  while (x < bounds.width) {
    if (!checkImgColors(img, startColor, x, startY, crossColor, false)) {
      break;
    }
    x += 1;
    right += 1;
  }
  x = startX - 1;

  while (x > 0) {
    if (!checkImgColors(img, startColor, x, startY, crossColor, false)) {
      break;
    }
    x -= 1;
    left += 1;
  }

  while (y < bounds.height) {
    if (!checkImgColors(img, startColor, startX, y, crossColor, true)) {
      break;
    }
    y += 1;
    bottom += 1;
  }
  y = startY - 1;

  while (y > 0) {
    if (!checkImgColors(img, startColor, startX, y, crossColor, true)) {
      break;
    }
    y -= 1;
    top += 1;
  }

  const result = {
    right,
    left,
    bottom,
    top,
    mouse: pos,
  };
  server.send('coordinates', result);
};

const createTray = () => {
  if (tray) {
    tray.destroy();
  }
  tray = new Tray(nativeImage.createFromDataURL(trayIcon));
  let menuTemplate = [
    {
      label: 'Check updates',
      async click() {
        clearInterval(updateInterval);
        await autoUpdater.checkForUpdates();
        if (!isMac) {
          updateInterval = setInterval(
            () => autoUpdater.checkForUpdates(),
            UPDATE_INTERVAL
          );
        }
        if (!updateAvailable) {
          dialog.showMessageBox({
            type: 'info',
            buttons: ['Close'],
            title: 'cp-scope',
            detail: `There are currently no updates available.\nYour version ${app.getVersion()} is the latest one.`,
          });
        }
      },
    },
    {
      label: 'GitHub',
      click() {
        shell.openExternal('https://github.com/aklein13/cp-scope');
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click() {
        crosshairdWindow.removeAllListeners();
        app.quit();
      },
    },
  ];
  if (!isLinux) {
    openAtLogin = app.getLoginItemSettings().openAtLogin;
    menuTemplate.unshift({
      label: 'Autostart',
      type: 'checkbox',
      checked: openAtLogin,
      click() {
        openAtLogin = !openAtLogin;
        app.setLoginItemSettings({
          ...app.getLoginItemSettings(),
          openAtLogin,
        });
      },
    });
  }
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setToolTip('cp-scope');
  tray.setContextMenu(contextMenu);
};

const openWindow = () => {
  const activeScreen = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint()
  );
  const activeScreenBounds = activeScreen.bounds;
  crosshairdWindow.setBounds(activeScreenBounds);
  crosshairdWindow.show();
  // On Windows you can't set bounds before the window is shown
  if (isWindows) {
    crosshairdWindow.setBounds(activeScreenBounds);
  }
  crosshairdWindow.setAlwaysOnTop(true, 'floating', 100);
  crosshairdWindow.setIgnoreMouseEvents(true);

  // crosshairdWindow.openDevTools();

  globalShortcut.unregisterAll();
  globalShortcut.register('Escape', closeWindow);
  checkColorInterval = setInterval(checkColor, 10);
  setTimeout(
    () => globalShortcut.register('CommandOrControl + Shift + X', closeWindow),
    500
  );
};

const closeWindow = () => {
  clearInterval(checkColorInterval);
  if (isMac) {
    app.hide();
  }
  globalShortcut.unregisterAll();
  if (!isMac) {
    crosshairdWindow.minimize();
  }
  crosshairdWindow.hide();
  activeScreen = null;
  setTimeout(registerInitShortcuts, 500);
};

const registerInitShortcuts = () => {
  globalShortcut.register('CommandOrControl + Shift + X', openWindow);
};

app.on('ready', async () => {
  if (!isDebug) {
    connectAutoUpdater();
  }

  crosshairdWindow = new BrowserWindow(crosshairWindowConfig);
  crosshairdWindow.loadURL(`file://${__dirname}/app.html`);
  registerInitShortcuts();
  server.configure(crosshairdWindow.webContents);
  createTray();

  console.log('App is ready!');

  // Exclude Mac because I need paid $$$ developer account to sign the app...
  // Updates do not work for unsigned applications.
  if (!isDebug && !isMac) {
    await autoUpdater.checkForUpdates();
    updateInterval = setInterval(
      () => autoUpdater.checkForUpdates(),
      UPDATE_INTERVAL
    );
  }
});

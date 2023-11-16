import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  Tray,
  Menu,
  shell,
  nativeImage,
  clipboard,
  screen as electronScreen,
} from 'electron';
import Server from 'electron-rpc/server';
import path from 'path';

const robot = require('robotjs');
const fs = require('fs');

const trayIcon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACW0lEQVR42l2TyWvaQRTHR/ODQi8lqEhB7KEHD3pI0fZQGm8SevAs+Q+8eWpMKaVpLW0vYo6eSreLx9JCECGIkVIwKS49BNz3fd/3fkecjPYHw8y8ee8z3zfv/Qj94vE4qdVqZLFYiJbLJZnP5/cx27F/PhqNdrEns9mM0DObzbaa2+02ufkCgQB1ECOAzg+m02mt0Wj8hNNvBP8dDAZ3ACKTyURMg+kwmUwckEgkqFG8vv0MgR+YY6/XOwf0ZL3f8Xg81EYHB0SjUXq4ko/bL3HTAdZ3MagiG27/6HQ6BazvrW0km81yQCwWYwB6eFWv1w8Auuh2u48Ae9Xv9x248Rlsn9dKBKPRyAHJZHILUCgUniLQXyqVHg+Hw9cIdrRaLStsXxhArVZzQDqd3gLk83kKuCgWi5uAo/F4zAA7KpWKA1Kp1BYgl8utFEAJBZwgldNms3mEt/jKAEqlkgPgyAC0Cpd4oJUC2J+ghG8AcABg3QTI5fL/q8AVZDIZCvABtofeOEZZT9EXVqj5xgASiYQDIpHIJuAPOtMA5zPkbMPL/0CXvgTgGLYbBTKZjANCodBmH1xBtgENs9fpdGII/AWX2wC/RTk/MYBUKuUAl8u1MtJD5PkdN7/Dmra4gPdYdShSOkd/vGAAhULBAYIgkHK5LEbZ6HvsQ8UATofUGSWlgPeQX0Q3yoPBIEGVRDqdjgO8Xi/R6/UsDZrSIWpfhJJrjBR64BopPaxWq6RSqYjMZjPRaDQcQGvKfp5wOCyy2+3EYrHs+nw+g9vt3tdqtbeon9/vFzE/9oj/AOHffdTL+hwRAAAAAElFTkSuQmCC';

const server = new Server();
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const isWindows = process.platform === 'win32';

let screen;
let crosshairdWindow;
let checkColorInterval;

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

const checkColor = () => {
  const img = robot.screen.capture();
  const pos = robot.getMousePos();
  const startX = pos.x;
  const startY = pos.y;
  const startColor = img.colorAt(startX, startY);

  let x = startX + 1;
  let y = startY + 1;
  let right = 0;
  let left = 0;
  let top = 0;
  let bottom = 0;
  const crossColor = 'ff0000';

  while (x < screen.width) {
    const color = img.colorAt(x, startY);
    if (color !== startColor && color !== crossColor) {
      break;
    }
    x += 1;
    right += 1;
  }
  x = startX - 1;

  while (x > 0) {
    const color = img.colorAt(x, startY);
    if (color !== startColor && color !== crossColor) {
      break;
    }
    x -= 1;
    left += 1;
  }

  while (y < screen.height) {
    const color = img.colorAt(startX, y);
    if (color !== startColor && color !== crossColor) {
      break;
    }
    y += 1;
    bottom += 1;
  }
  y = startY - 1;

  while (y > 0) {
    const color = img.colorAt(startX, y);
    if (color !== startColor && color !== crossColor) {
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

const openWindow = () => {
  const activeScreen = electronScreen.getDisplayNearestPoint(
    electronScreen.getCursorScreenPoint()
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
  setTimeout(registerInitShortcuts, 500);
};

const registerInitShortcuts = () => {
  globalShortcut.register('CommandOrControl + Shift + X', openWindow);
};

app.on('ready', async () => {
  crosshairdWindow = new BrowserWindow(crosshairWindowConfig);
  crosshairdWindow.loadURL(`file://${__dirname}/app.html`);
  registerInitShortcuts();
  server.configure(crosshairdWindow.webContents);

  console.log('App is ready!');

  screen = robot.getScreenSize();
});

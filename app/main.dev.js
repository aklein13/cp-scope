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
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAEGWlDQ1BrQ0dDb2xvclNwYWNlR2VuZXJpY1JHQgAAOI2NVV1oHFUUPrtzZyMkzlNsNIV0qD8NJQ2TVjShtLp/3d02bpZJNtoi6GT27s6Yyc44M7v9oU9FUHwx6psUxL+3gCAo9Q/bPrQvlQol2tQgKD60+INQ6Ium65k7M5lpurHeZe58853vnnvuuWfvBei5qliWkRQBFpquLRcy4nOHj4g9K5CEh6AXBqFXUR0rXalMAjZPC3e1W99Dwntf2dXd/p+tt0YdFSBxH2Kz5qgLiI8B8KdVy3YBevqRHz/qWh72Yui3MUDEL3q44WPXw3M+fo1pZuQs4tOIBVVTaoiXEI/MxfhGDPsxsNZfoE1q66ro5aJim3XdoLFw72H+n23BaIXzbcOnz5mfPoTvYVz7KzUl5+FRxEuqkp9G/Ajia219thzg25abkRE/BpDc3pqvphHvRFys2weqvp+krbWKIX7nhDbzLOItiM8358pTwdirqpPFnMF2xLc1WvLyOwTAibpbmvHHcvttU57y5+XqNZrLe3lE/Pq8eUj2fXKfOe3pfOjzhJYtB/yll5SDFcSDiH+hRkH25+L+sdxKEAMZahrlSX8ukqMOWy/jXW2m6M9LDBc31B9LFuv6gVKg/0Szi3KAr1kGq1GMjU/aLbnq6/lRxc4XfJ98hTargX++DbMJBSiYMIe9Ck1YAxFkKEAG3xbYaKmDDgYyFK0UGYpfoWYXG+fAPPI6tJnNwb7ClP7IyF+D+bjOtCpkhz6CFrIa/I6sFtNl8auFXGMTP34sNwI/JhkgEtmDz14ySfaRcTIBInmKPE32kxyyE2Tv+thKbEVePDfW/byMM1Kmm0XdObS7oGD/MypMXFPXrCwOtoYjyyn7BV29/MZfsVzpLDdRtuIZnbpXzvlf+ev8MvYr/Gqk4H/kV/G3csdazLuyTMPsbFhzd1UabQbjFvDRmcWJxR3zcfHkVw9GfpbJmeev9F08WW8uDkaslwX6avlWGU6NRKz0g/SHtCy9J30o/ca9zX3Kfc19zn3BXQKRO8ud477hLnAfc1/G9mrzGlrfexZ5GLdn6ZZrrEohI2wVHhZywjbhUWEy8icMCGNCUdiBlq3r+xafL549HQ5jH+an+1y+LlYBifuxAvRN/lVVVOlwlCkdVm9NOL5BE4wkQ2SMlDZU97hX86EilU/lUmkQUztTE6mx1EEPh7OmdqBtAvv8HdWpbrJS6tJj3n0CWdM6busNzRV3S9KTYhqvNiqWmuroiKgYhshMjmhTh9ptWhsF7970j/SbMrsPE1suR5z7DMC+P/Hs+y7ijrQAlhyAgccjbhjPygfeBTjzhNqy28EdkUh8C+DU9+z2v/oyeH791OncxHOs5y2AtTc7nb/f73TWPkD/qwBnjX8BoJ98VQNcC+8AAAA4ZVhJZk1NACoAAAAIAAGHaQAEAAAAAQAAABoAAAAAAAKgAgAEAAAAAQAAABCgAwAEAAAAAQAAABAAAAAAF51TyAAAARVJREFUOBGlk82NwjAQheO0sA2kAeC2VSAtrUBTUaAo4MRp+blwCEnM+2AMSZCDECO9zIz95tkZ20kyYN77KRigxKdUmAn/hizO7M2oYCLkTdMc5G9mca5k0qN306qqZiId72V+I382EGNHON0qyzQ5giBc6rpeyP8IWwPxXLgIcEYvIhosBE9xmFT6C1o5wlgRxhIlqUDDTgJbZTX3IFjAmM3BgUtNmujDUe0EjH9eC6zs1LyV/BING1vLw8Gomab9lULunPMg5FEvle9+IShL6NZE+bdNVKOfTWwJPI4REaFzjHa08WNESEV/QriBG8U0DBBj8YvU2slYRK7tngoz4rwsy+GrHERsN5mKPn9MPZG3z/kK2LPHNFGxXvEAAAAASUVORK5CYII=';

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

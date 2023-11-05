import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  screen,
  Tray,
  Menu,
  shell,
  nativeImage,
  clipboard,
} from 'electron';
import Server from 'electron-rpc/server';
import path from 'path';

const robot = require('robotjs');
const fs = require('fs');

const trayIcon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACW0lEQVR42l2TyWvaQRTHR/ODQi8lqEhB7KEHD3pI0fZQGm8SevAs+Q+8eWpMKaVpLW0vYo6eSreLx9JCECGIkVIwKS49BNz3fd/3fkecjPYHw8y8ee8z3zfv/Qj94vE4qdVqZLFYiJbLJZnP5/cx27F/PhqNdrEns9mM0DObzbaa2+02ufkCgQB1ECOAzg+m02mt0Wj8hNNvBP8dDAZ3ACKTyURMg+kwmUwckEgkqFG8vv0MgR+YY6/XOwf0ZL3f8Xg81EYHB0SjUXq4ko/bL3HTAdZ3MagiG27/6HQ6BazvrW0km81yQCwWYwB6eFWv1w8Auuh2u48Ae9Xv9x248Rlsn9dKBKPRyAHJZHILUCgUniLQXyqVHg+Hw9cIdrRaLStsXxhArVZzQDqd3gLk83kKuCgWi5uAo/F4zAA7KpWKA1Kp1BYgl8utFEAJBZwgldNms3mEt/jKAEqlkgPgyAC0Cpd4oJUC2J+ghG8AcABg3QTI5fL/q8AVZDIZCvABtofeOEZZT9EXVqj5xgASiYQDIpHIJuAPOtMA5zPkbMPL/0CXvgTgGLYbBTKZjANCodBmH1xBtgENs9fpdGII/AWX2wC/RTk/MYBUKuUAl8u1MtJD5PkdN7/Dmra4gPdYdShSOkd/vGAAhULBAYIgkHK5LEbZ6HvsQ8UATofUGSWlgPeQX0Q3yoPBIEGVRDqdjgO8Xi/R6/UsDZrSIWpfhJJrjBR64BopPaxWq6RSqYjMZjPRaDQcQGvKfp5wOCyy2+3EYrHs+nw+g9vt3tdqtbeon9/vFzE/9oj/AOHffdTL+hwRAAAAAElFTkSuQmCC';

const server = new Server();

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
  console.log(pos);
  const color = img.colorAt(pos.x, pos.y);
  console.log(color);
}

app.on('ready', async () => {
  console.log('App is ready!');

  console.log(robot.getScreenSize());
  setInterval(checkColor, 10);


  // stream.on('data', chunk => {
  //   console.log(chunk);
  //   getColors(chunk, 'image/jpg').then(colors => console.log(colors));
  // });
});

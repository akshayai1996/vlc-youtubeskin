const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

// Set ffmpeg/ffprobe paths
function getBinPath(binName, staticModule) {
  let binPath = typeof staticModule === 'string' ? staticModule : staticModule.path;
  if (app.isPackaged) {
    // Strategy 1: Replace asar with unpacked
    let unpackedPath = binPath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpackedPath)) return unpackedPath;
    
    // Strategy 2: Search in resources
    const resourcesPath = process.resourcesPath;
    // node_modules/ffmpeg-static/ffmpeg.exe
    // node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe
    const searchPaths = [
      path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
      path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', binName + '-static', binName + '.exe'),
      path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', binName + '-static', 'bin', 'win32', process.arch === 'x64' ? 'x64' : 'ia32', binName + '.exe')
    ];
    for (const p of searchPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return binPath;
}

const ffmpegPath = getBinPath('ffmpeg', ffmpegStatic);
const ffprobePath = getBinPath('ffprobe', ffprobeStatic);

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Ensure temp directory for subtitles
const tempDir = path.join(app.getPath('userData'), 'temp_subs');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Re-enabling GPU with specific hints for Windows High-DPI
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('disable-gpu-rasterization'); // Known fix for blurry text/UI on some Windows scales
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow;

// Better error reporting for the packaged app
process.on('uncaughtException', (error) => {
  dialog.showErrorBox('Startup Error', error.stack || error.message || String(error));
});

process.on('unhandledRejection', (reason) => {
  dialog.showErrorBox('Startup Error (Async)', String(reason));
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    frame: false, // Make it frameless for custom title bar
    title: 'Simple YT Style Player',
    backgroundColor: '#181818',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    icon: path.join(__dirname, 'assets/custom_play_icon_red.png')
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  // Layer 3: Handle window moving between monitors with different DPIs
  mainWindow.on('move', () => {
    if (!mainWindow) return;
    const currentDisplay = screen.getDisplayNearestPoint(mainWindow.getBounds());
    mainWindow.webContents.send('dpi-changed', currentDisplay.scaleFactor);
  });

  // Send file path to renderer once it's ready
  mainWindow.webContents.on('did-finish-load', () => {
    const filePath = getFilePath(process.argv);
    if (filePath) {
      mainWindow.webContents.send('open-file', filePath);
    }
  });
}

function getFilePath(argv) {
  // argv[1] is typically the file path when double-clicked or "Open With"
  const args = argv.slice(app.isPackaged ? 1 : 2);
  return args.find(arg => !arg.startsWith('--'));
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const filePath = getFilePath(commandLine);
      if (filePath) {
        mainWindow.webContents.send('open-file', filePath);
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Media', extensions: ['mkv', 'avi', 'mp4', 'mp3', 'flac', 'webm', 'mov'] }
    ]
  });
  return result.filePaths;
});

// Window controls IPC
ipcMain.on('window-control', (event, action) => {
  if (!mainWindow) return;
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
      break;
    case 'close':
      mainWindow.close();
      break;
  }
});

// Media Probing
ipcMain.handle('probe-media', async (event, filePath) => {
  try {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) resolve({ error: err.message });
        else resolve(metadata);
      });
    });
  } catch (e) {
    return { error: e.message };
  }
});

// Subtitle Extraction
ipcMain.handle('extract-subtitle', async (event, { filePath, streamIndex }) => {
  try {
    const outputName = `sub_${streamIndex}_${Date.now()}.vtt`;
    const outputPath = path.join(tempDir, outputName);

    return new Promise((resolve) => {
      ffmpeg(filePath)
        .outputOptions([`-map 0:${streamIndex}`])
        .output(outputPath)
        .on('end', () => resolve({ path: outputPath }))
        .on('error', (err) => resolve({ error: err.message }))
        .run();
    });
  } catch (e) {
    return { error: e.message };
  }
});

// Audio Remuxing (Track Switching)
ipcMain.handle('remux-audio', async (event, { filePath, audioIndex }) => {
  try {
    const outputName = `remux_${audioIndex}_${Date.now()}.mp4`;
    const outputPath = path.join(tempDir, outputName);
    
    return new Promise((resolve) => {
      ffmpeg(filePath)
        .outputOptions([
          '-map 0:v:0',           // First video stream
          `-map 0:a:${audioIndex}`, // Selected audio stream
          '-c copy',              // Copy codecs as-is
          '-movflags +faststart', // Move metadata to start for browser seeking
          '-sn'                   // Strip subtitles
        ])
        .output(outputPath)
        .on('end', () => resolve({ path: outputPath }))
        .on('error', (err) => resolve({ error: err.message }))
        .run();
    });
  } catch (e) {
    return { error: e.message };
  }
});

// Clean up temp directory
ipcMain.handle('clear-temp', async () => {
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      try { fs.unlinkSync(path.join(tempDir, file)); } catch(e) {}
    }
  }
  return true;
});

// Clean up temp files on quit
app.on('will-quit', () => {
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      try { fs.unlinkSync(path.join(tempDir, file)); } catch(e) {}
    }
  }
});

# Simple YT Style Player 📽️✨

A high-performance, modern media player with a premium YouTube-style aesthetic. Build standard Windows installers from source with ease.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **🖼️ Picture-in-Picture (PiP)**: Dual-mode support for both standard videos and the reactive audio visualizer.
- **📊 Reactive Audio Visualizer**: Three distinct themes (Classic Bars, Circular Pulse, Retro Matrix) with customizable neon color palettes.
- **🔊 200% Volume Boost**: Integrated Web Audio API Gain Node for loudness beyond standard limits.
- **📦 Enterprise MKV Support**: Seamless multi-track audio switching and on-the-fly subtitle extraction (remuxing to MP4 for Chromium stability).
- **🎨 Premium UI**: Glassmorphism effects, centered title bar, and a sleek dark theme.
- **⌨️ Keyboard Shortcuts**: Fully controllable via keyboard for a fluid user experience.
- **🖥️ High-DPI Aware**: Multi-layer DPI awareness for razor-sharp text on 4K displays.

## ⌨️ Keyboard Shortcuts

| Key           | Action                    |
| ------------- | ------------------------- |
| `Space` / `K` | Play / Pause              |
| `F`           | Toggle Fullscreen         |
| `M`           | Mute / Unmute             |
| `I` / `P`     | Toggle Picture-in-Picture |
| `O`           | Open File                 |
| `Arrow Right` | Skip Forward              |
| `Arrow Left`  | Skip Backward             |

## 🚀 How to Build Your Own Installable EXE

Follow these steps to generate your own standalone 32-bit and 64-bit Windows installers (`.exe`) from the source code.

### 1. Prerequisites

- Download and install [Node.js](https://nodejs.org/) (Recommended version: 18 or 20).
- Ensure `npm` is installed (it comes with Node.js).

### 2. Setup

1. Clone or download this repository to your local machine.
2. Open a terminal (PowerShell or CMD) in the project folder.
3. Install the required dependencies by running:
   ```bash
   npm install
   ```

### 3. Generate the Installers

Run the following build command:

```bash
npm run build
```

This command will:

- Bundle all source code, assets, and binaries.
- Create 32-bit and 64-bit installers using the `electron-builder` engine.
- Configure the application with custom branding icons and High-DPI manifests.

### 4. Locate Your Files

Once the build is complete, look for the `dist/` folder in your project directory. You will find:

- `Simple YT Style Player Setup 1.0.0 64bit.exe` (64-bit installer)
- `Simple YT Style Player Setup 1.0.0 32bit.exe` (32-bit installer)

## 📦 Download Pre-built Releases

If you don't want to build from source, you can download the latest pre-compiled installers from the [Releases](https://github.com/akshayai1996/vlc-youtubeskin/releases) section.

## 🛠️ Built With

- **Electron** - Cross-platform desktop framework
- **FFmpeg/FFprobe** - Enterprise media handling
- **Web Audio API** - Visualizer and Volume management
- **Vanilla CSS/JS** - High-performance UI logic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Developed by the Project Contributors

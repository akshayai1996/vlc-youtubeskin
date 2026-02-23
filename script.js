const { ipcRenderer } = require('electron');

document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const video = document.getElementById("videoElement");
    const container = document.getElementById("video-container");
    const openFileBtn = document.getElementById("open-file-btn");
    const controls = document.getElementById("controls-wrapper");
    const spinner = document.getElementById("spinner");

    // IPC File loading (from Open With or second instance)
    ipcRenderer.on('open-file', (event, filePath) => {
        if (filePath) loadFile(filePath);
    });

    // Play/Pause
    const playPauseBtn = document.getElementById("play-pause-btn");
    const centerPlayBtn = document.getElementById("center-play-btn");
    const playIcon = document.getElementById("play-icon");
    const pauseIcon = document.getElementById("pause-icon");

    // Progress
    const progressContainer = document.getElementById("progress-container");
    const progressFill = document.getElementById("progress-fill");
    const progressTooltip = document.getElementById("progress-tooltip");
    const currentLabel = document.getElementById("time-current");
    const durationLabel = document.getElementById("time-duration");

    // Settings
    const skipSettingBtn = document.getElementById("skip-setting-btn");
    const skipMenu = document.getElementById("skip-menu");
    const speedSettingBtn = document.getElementById("speed-setting-btn");
    const speedMenu = document.getElementById("speed-menu");
    const aspectBtn = document.getElementById("aspect-ratio-btn");
    const aspectMenu = document.getElementById("aspect-menu");
    const audioBtn = document.getElementById("audio-settings-btn");
    const audioMenu = document.getElementById("audio-menu");
    const captionBtn = document.getElementById("caption-settings-btn");
    const captionMenu = document.getElementById("caption-menu");
    const visualizerBtn = document.getElementById("visualizer-settings-btn");
    const visualizerMenu = document.getElementById("visualizer-menu");

    // Controls
    const skipBackBtn = document.getElementById("skip-back-btn");
    const skipForwardBtn = document.getElementById("skip-forward-btn");
    const skipOptions = skipMenu.querySelectorAll(".popup-item");
    const speedOptions = speedMenu.querySelectorAll(".popup-item");
    const aspectOptions = aspectMenu.querySelectorAll(".popup-item");

    // Sliders
    const volSlider = document.getElementById("volume-range");
    const volArea = document.getElementById("volume-slider-area");
    const muteBtn = document.getElementById("mute-btn");
    const volHighIcon = document.getElementById("volume-high-icon");
    const volMutedIcon = document.getElementById("volume-muted-icon");

    const brightnessSlider = document.getElementById("brightness-range");
    const brightnessArea = document.getElementById("brightness-slider-area");
    const brightnessBtn = document.getElementById("brightness-btn");
    const speedSlider = document.getElementById("speed-range");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const visualizerCanvas = document.getElementById("visualizer");
    const visualizerCtx = visualizerCanvas.getContext("2d");
    const pipBtn = document.getElementById("pip-btn");
    const pipVideoOverlay = document.getElementById("pipVideoOverlay");

    // Title Bar Controls
    const minBtn = document.getElementById("min-btn");
    const maxBtn = document.getElementById("max-btn");
    const closeBtn = document.getElementById("close-btn");

    let hideTimer;
    let skipAmount = 10;
    let videoDuration = 0;
    let mediaMetadata = null;
    let currentFilePath = "";
    let isVisualizerEnabled = false;
    let animId;

    // --------------
    // INIT & HELPERS
    // --------------
    function formatTime(s) {
        if (!s || isNaN(s)) return "0:00";
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    function fillSlider(slider) {
        if (!slider) return;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const pct = ((val - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(to right, #f00 ${pct}%, rgba(255,255,255,0.3) ${pct}%)`;
        const tooltip = slider.parentElement.querySelector('.slider-val-tooltip');
        if (tooltip) {
            const displayPct = Math.max(10, Math.min(90, pct));
            tooltip.style.left = displayPct + "%";
        }
    }

    function setupDragClass(slider, wrappers) {
        if (!slider) return;
        slider.addEventListener('mousedown', () => wrappers.forEach(w => w?.classList.add('active_drag')));
        slider.addEventListener('touchstart', () => wrappers.forEach(w => w?.classList.add('active_drag')), {passive: true});
        const remove = () => wrappers.forEach(w => w?.classList.remove('active_drag'));
        window.addEventListener('mouseup', remove);
        window.addEventListener('touchend', remove);
    }

    setupDragClass(volSlider, [volArea, volArea.closest('.volume-group')]);
    setupDragClass(brightnessSlider, [brightnessArea, brightnessArea.closest('.volume-group')]);
    setupDragClass(speedSlider, [speedSlider.parentElement]);

    function resetHideTimer() {
        container.classList.add("active");
        clearTimeout(hideTimer);
        if (!video.paused) {
            hideTimer = setTimeout(() => {
                container.classList.remove("active");
                closeAllMenus();
            }, 3000);
        }
    }

    function closeAllMenus() {
        if (skipMenu) skipMenu.classList.remove("active");
        if (speedMenu) speedMenu.classList.remove("active");
        if (aspectMenu) aspectMenu.classList.remove("active");
        if (audioMenu) audioMenu.classList.remove("active");
        if (captionMenu) captionMenu.classList.remove("active");
        if (visualizerMenu) visualizerMenu.classList.remove("active");
    }

    container.addEventListener("mousemove", resetHideTimer);
    container.addEventListener("mousedown", resetHideTimer);
    document.addEventListener("click", (e) => {
        if (!e.target.closest('.popup-container')) closeAllMenus();
    });

    // ----------------
    // PLAYBACK
    // ----------------

    video.addEventListener("play", () => {
        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
        centerPlayBtn.classList.add("hidden");
        resetHideTimer();
    });

    video.addEventListener("pause", () => {
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
        centerPlayBtn.classList.remove("hidden");
        container.classList.add("active");
    });

    video.addEventListener("timeupdate", () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        progressFill.style.width = pct + "%";
        currentLabel.textContent = formatTime(video.currentTime);
    });

    video.addEventListener("loadedmetadata", () => {
        videoDuration = video.duration;
        durationLabel.textContent = formatTime(videoDuration);
        spinner.style.display = "none";
        
        // Build Track Menus (Native fallback)
        if (!mediaMetadata) {
            buildAudioTracksMenu();
            buildCaptionTracksMenu();
        }
    });

    video.addEventListener("waiting", () => spinner.style.display = "block");
    video.addEventListener("playing", () => spinner.style.display = "none");

    video.addEventListener("error", (e) => {
        const err = video.error;
        if (err) {
            console.error("Video Error Code:", err.code, "Message:", err.message);
            // If it failed after a remux, try to reload once
            if (video.src.includes('remux_')) {
                console.warn("Remuxed video failed, attempting recovery...");
                spinner.style.display = "block";
                setTimeout(() => {
                    video.load();
                }, 500);
            }
        }
    });

    playPauseBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePlay(); });
    centerPlayBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePlay(); });
    video.addEventListener("click", (e) => { e.stopPropagation(); togglePlay(); });

    // ----------------
    // PROGRESS
    // ----------------
    progressContainer.addEventListener("mousemove", (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        progressTooltip.style.opacity = "1";
        progressTooltip.style.left = (pos * 100) + "%";
        progressTooltip.textContent = formatTime(pos * (video.duration || 0));
    });

    progressContainer.addEventListener("mouseleave", () => progressTooltip.style.opacity = "0");
    progressContainer.addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = progressContainer.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        video.currentTime = pos * video.duration;
    });

    // ----------------
    // SKIP
    // ----------------
    function doSkip(amt) {
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + amt));
    }

    skipBackBtn.addEventListener("click", (e) => { e.stopPropagation(); doSkip(-skipAmount); });
    skipForwardBtn.addEventListener("click", (e) => { e.stopPropagation(); doSkip(skipAmount); });

    skipSettingBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = skipMenu.classList.contains("active");
        closeAllMenus();
        if (!wasActive) skipMenu.classList.add("active");
    });

    skipOptions.forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.stopPropagation();
            skipOptions.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            skipAmount = parseInt(opt.dataset.val);
            skipSettingBtn.textContent = skipAmount + "s";
            skipBackBtn.textContent = "-" + skipAmount + "s";
            skipForwardBtn.textContent = "+" + skipAmount + "s";
            closeAllMenus();
        });
    });

    // ----------------
    // SPEED
    // ----------------
    speedSettingBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = speedMenu.classList.contains("active");
        closeAllMenus();
        if (!wasActive) speedMenu.classList.add("active");
    });

    function setSpeed(val) {
        val = Math.max(0.1, Math.min(4, val));
        video.playbackRate = val;
        speedSettingBtn.textContent = val === 1 ? "1x" : (val.toFixed(2) + "x");
        speedSlider.value = val;
        fillSlider(speedSlider);
        document.getElementById("speed-tooltip").textContent = val.toFixed(2) + "x";
        speedOptions.forEach(o => o.classList.remove("active"));
    }

    speedSlider.addEventListener("input", (e) => setSpeed(parseFloat(e.target.value)));
    speedOptions.forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.stopPropagation();
            setSpeed(parseFloat(opt.dataset.val));
            opt.classList.add("active");
            closeAllMenus();
        });
    });

    // ----------------
    // ASPECT
    // ----------------
    aspectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = aspectMenu.classList.contains("active");
        closeAllMenus();
        if (!wasActive) aspectMenu.classList.add("active");
    });

    aspectOptions.forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.stopPropagation();
            aspectOptions.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            const ratio = opt.dataset.val;
            if (ratio === "default") video.style.objectFit = "contain";
            else if (ratio === "fill") video.style.objectFit = "fill";
            else if (ratio === "cover") video.style.objectFit = "cover";
            closeAllMenus();
        });
    });

    // ----------------
    // AUDIO & CAPTIONS
    // ----------------
    audioBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = audioMenu.classList.contains("active");
        closeAllMenus();
        if (!wasActive) audioMenu.classList.add("active");
    });

    captionBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = captionMenu.classList.contains("active");
        closeAllMenus();
        if (!wasActive) captionMenu.classList.add("active");
    });

    async function buildAudioTracksMenu() {
        const container = document.getElementById("audio-tracks-list");
        if (!container) return;
        container.innerHTML = "";
        
        if (mediaMetadata?.streams) {
            const audioStreams = mediaMetadata.streams.filter(s => s.codec_type === 'audio');
            if (audioStreams.length > 0) {
                audioStreams.forEach((stream, index) => {
                    const item = document.createElement("div");
                    const label = stream.tags?.title || stream.tags?.language || `Track ${index + 1}`;
                    const isDefault = stream.disposition?.default === 1;
                    item.className = "popup-item" + (isDefault ? " active" : "");
                    item.textContent = label;
                    item.onclick = async (e) => {
                        e.stopPropagation();
                        spinner.style.display = "block";
                        
                        const currentTime = video.currentTime;
                        const isPaused = video.paused;
                        
                        let result;
                        try {
                            result = await ipcRenderer.invoke('remux-audio', { 
                                filePath: currentFilePath, 
                                audioIndex: index 
                            });
                        } catch (err) {
                            result = { error: err.message };
                        }
                        
                        spinner.style.display = "none";
                        if (result && result.path) {
                            const onMetadata = () => {
                                video.currentTime = currentTime;
                                if (!isPaused) video.play().catch(console.error);
                                video.removeEventListener('loadedmetadata', onMetadata);
                            };
                            video.addEventListener('loadedmetadata', onMetadata);
                            
                            video.src = `file://${result.path.replace(/\\/g, '/')}`;
                            video.load();
                            
                            document.querySelectorAll("#audio-tracks-list .popup-item").forEach(i => i.classList.remove("active"));
                            item.classList.add("active");
                        } else {
                            alert("Failed to switch audio: " + result.error);
                        }
                        closeAllMenus();
                    };
                    container.appendChild(item);
                });
                return;
            }
        }

        const tracks = video.audioTracks || [];
        if (tracks.length <= 1) {
            container.innerHTML = '<div class="popup-item active">Default Language</div>';
            return;
        }

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const item = document.createElement("div");
            item.className = "popup-item" + (track.enabled ? " active" : "");
            item.textContent = track.label || track.language || `Track ${i + 1}`;
            item.onclick = (e) => {
                e.stopPropagation();
                for (let j = 0; j < tracks.length; j++) tracks[j].enabled = (i === j);
                buildAudioTracksMenu();
                closeAllMenus();
            };
            container.appendChild(item);
        }
    }

    async function buildCaptionTracksMenu() {
        const container = document.getElementById("caption-tracks-list");
        if (!container) return;
        container.innerHTML = "";
        
        // "Off" option
        const offItem = document.createElement("div");
        offItem.className = "popup-item active"; // Default
        offItem.textContent = "Off";
        offItem.onclick = (e) => {
            e.stopPropagation();
            Array.from(video.textTracks).forEach(t => t.mode = "disabled");
            document.querySelectorAll("#caption-tracks-list .popup-item").forEach(i => i.classList.remove("active"));
            offItem.classList.add("active");
            closeAllMenus();
        };
        container.appendChild(offItem);

        // Native tracks
        const nativeTracks = video.textTracks;
        for (let i = 0; i < nativeTracks.length; i++) {
            const track = nativeTracks[i];
            const item = document.createElement("div");
            item.className = "popup-item";
            item.textContent = track.label || track.language || `Subtitle ${i + 1}`;
            item.onclick = (e) => {
                e.stopPropagation();
                Array.from(nativeTracks).forEach((t, idx) => t.mode = (i === idx ? "showing" : "disabled"));
                document.querySelectorAll("#caption-tracks-list .popup-item").forEach(i => i.classList.remove("active"));
                item.classList.add("active");
                closeAllMenus();
            };
            container.appendChild(item);
        }

        // Embedded Tracks (MKV)
        if (mediaMetadata?.streams) {
            const subStreams = mediaMetadata.streams.filter(s => s.codec_type === 'subtitle');
            subStreams.forEach((stream) => {
                const item = document.createElement("div");
                const label = stream.tags?.title || stream.tags?.language || `Embedded Sub ${stream.index}`;
                item.className = "popup-item";
                item.textContent = label + " [Embedded]";
                item.onclick = async (e) => {
                    e.stopPropagation();
                    spinner.style.display = "block";
                    let result;
                    try {
                        result = await ipcRenderer.invoke('extract-subtitle', { 
                            filePath: currentFilePath, 
                            streamIndex: stream.index 
                        });
                    } catch (err) {
                        result = { error: err.message };
                    }
                    spinner.style.display = "none";
                    if (result && result.path) {
                        // Remove existing dynamic tracks
                        const existing = video.querySelectorAll('track.dynamic-sub');
                        existing.forEach(t => t.remove());

                        const track = document.createElement('track');
                        track.kind = 'subtitles';
                        track.label = label;
                        track.srclang = stream.tags?.language || 'en';
                        track.src = `file://${result.path.replace(/\\/g, '/')}`;
                        track.className = 'dynamic-sub';
                        track.default = true;
                        video.appendChild(track);
                        
                        // Force showing the new track
                        setTimeout(() => {
                           for (let i = 0; i < video.textTracks.length; i++) {
                               const t = video.textTracks[i];
                               if (t.label === label) {
                                   t.mode = "showing";
                               } else {
                                   t.mode = "disabled";
                               }
                           }
                        }, 200);

                        document.querySelectorAll("#caption-tracks-list .popup-item").forEach(i => i.classList.remove("active"));
                        item.classList.add("active");
                    } else {
                        alert("Failed to extract subtitle: " + result.error);
                    }
                    closeAllMenus();
                };
                container.appendChild(item);
            });
        }
    }

    // ----------------
    // VOLUME (200% Boost) & Visualizer
    // ----------------
    let audioCtx, source, gainNode, analyser, dataArray;
    let vizTheme = "bars";
    let vizColor = "red";

    function initAudio() {
        if (audioCtx) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            source = audioCtx.createMediaElementSource(video);
            
            // Analyser for visualizer
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            gainNode = audioCtx.createGain();
            
            source.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            // Sync current volume
            gainNode.gain.value = parseFloat(volSlider.value);
        } catch (e) {
            console.error("Web Audio not supported or failed:", e);
        }
    }

    function drawVisualizer() {
        if (!isVisualizerEnabled) {
            cancelAnimationFrame(animId);
            return;
        }
        animId = requestAnimationFrame(drawVisualizer);
        
        analyser.getByteFrequencyData(dataArray);
        
        const width = visualizerCanvas.width = visualizerCanvas.offsetWidth;
        const height = visualizerCanvas.height = visualizerCanvas.offsetHeight;
        
        visualizerCtx.clearRect(0, 0, width, height);
        
        const bufferLength = dataArray.length;
        
        // Detect Beat for Pulse
        let sum = 0;
        for(let i=0; i<10; i++) sum += dataArray[i]; 
        const avgBass = sum / 10;
        const pulse = avgBass / 255;

        const getColor = (i, opacity) => {
            if (vizColor === "cyan") return `rgba(0, ${255 - i}, 255, ${opacity})`;
            if (vizColor === "ocean") return `rgba(0, ${Math.floor(dataArray[i]/2)}, ${255}, ${opacity})`;
            return `rgba(255, ${Math.floor(255 - dataArray[i])}, 0, ${opacity})`;
        };
        
        if (vizTheme === "bars") {
            const barWidth = (width / bufferLength) * 2.5;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * height * 0.7;
                visualizerCtx.fillStyle = getColor(i, 0.5 + pulse * 0.5);
                visualizerCtx.fillRect(x, height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        } else if (vizTheme === "pulse") {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = 100 + pulse * 50;
            
            for (let i = 0; i < bufferLength; i += 2) {
                const angle = (i / bufferLength) * Math.PI * 2;
                const h = (dataArray[i] / 255) * 100;
                const x1 = centerX + Math.cos(angle) * radius;
                const y1 = centerY + Math.sin(angle) * radius;
                const x2 = centerX + Math.cos(angle) * (radius + h);
                const y2 = centerY + Math.sin(angle) * (radius + h);
                
                visualizerCtx.strokeStyle = getColor(i, 0.8);
                visualizerCtx.lineWidth = 4;
                visualizerCtx.beginPath();
                visualizerCtx.moveTo(x1, y1);
                visualizerCtx.lineTo(x2, y2);
                visualizerCtx.stroke();
            }
        } else if (vizTheme === "matrix") {
            const cols = 20;
            const rows = 15;
            const cw = width / cols;
            const ch = height / rows;
            for (let i = 0; i < cols; i++) {
                const val = dataArray[i * 5] || 0;
                const activeRows = Math.floor((val / 255) * rows);
                for (let j = 0; j < activeRows; j++) {
                    visualizerCtx.fillStyle = getColor(i * 5, 0.3 + (j/rows));
                    visualizerCtx.fillRect(i * cw + 2, height - (j + 1) * ch + 2, cw - 4, ch - 4);
                }
            }
        }

        // Draw Ambient Pulse
        if (pulse > 0.05) {
            visualizerCtx.beginPath();
            visualizerCtx.arc(width/2, height/2, 50 + pulse * 150, 0, Math.PI * 2);
            visualizerCtx.strokeStyle = getColor(0, pulse * 0.2);
            visualizerCtx.lineWidth = 2;
            visualizerCtx.stroke();
        }
    }

    
    // ----------------
    // PIP (Picture-in-Picture)
    // ----------------
    async function togglePiP() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                const isAudioOnly = !mediaMetadata?.streams?.some(s => s.codec_type === 'video');
                
                if (isAudioOnly && isVisualizerEnabled) {
                    const stream = visualizerCanvas.captureStream();
                    pipVideoOverlay.srcObject = stream;
                    await pipVideoOverlay.play();
                    await pipVideoOverlay.requestPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            }
        } catch (error) {
            console.error("PiP failed:", error);
        }
    }

    pipBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        togglePiP();
    });

    video.addEventListener('enterpictureinpicture', () => pipBtn.classList.add('text-danger'));
    video.addEventListener('leavepictureinpicture', () => pipBtn.classList.remove('text-danger'));
    pipVideoOverlay.addEventListener('enterpictureinpicture', () => pipBtn.classList.add('text-danger'));
    pipVideoOverlay.addEventListener('leavepictureinpicture', () => pipBtn.classList.remove('text-danger'));

    function toggleVisualizer(force) {
        if (vizTheme === "off") {
            isVisualizerEnabled = false;
        } else {
            isVisualizerEnabled = (force !== undefined) ? force : true;
        }

        if (isVisualizerEnabled) {
            initAudio();
            visualizerCanvas.classList.add("active");
            visualizerBtn.classList.add("text-danger");
            drawVisualizer();
        } else {
            visualizerCanvas.classList.remove("active");
            visualizerBtn.classList.remove("text-danger");
            cancelAnimationFrame(animId);
        }
    }

    visualizerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = visualizerMenu.classList.contains("active");
        closeAllMenus();
        if (!wasActive) visualizerMenu.classList.add("active");
    });

    visualizerMenu.querySelectorAll(".popup-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            const type = item.dataset.type;
            const val = item.dataset.val;
            
            visualizerMenu.querySelectorAll(`.popup-item[data-type="${type}"]`).forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            
            if (type === "theme") vizTheme = val;
            if (type === "color") vizColor = val;
            
            toggleVisualizer(vizTheme !== "off");
            if (vizTheme !== "off") closeAllMenus();
        });
    });

    function applyVolume(val) {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const v = Math.max(0, Math.min(2, val));
        if (gainNode) {
            gainNode.gain.value = v;
        }
        
        volSlider.value = v;
        fillSlider(volSlider);
        document.getElementById("volume-tooltip").textContent = Math.round(v * 100) + "%";
        volHighIcon.style.display = v === 0 ? "none" : "block";
        volMutedIcon.style.display = v === 0 ? "block" : "none";
    }

    muteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentGain = gainNode ? gainNode.gain.value : parseFloat(volSlider.value);
        if (currentGain > 0) {
            muteBtn.dataset.lastVol = currentGain;
            applyVolume(0);
        } else {
            applyVolume(parseFloat(muteBtn.dataset.lastVol) || 1);
        }
    });

    volSlider.addEventListener("input", (e) => applyVolume(parseFloat(e.target.value)));

    // Ensure audio context resumes on play
    function togglePlay() {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (video.paused) video.play().catch(console.error);
        else video.pause();
    }
    function setBrightness(val) {
        let overlay = document.getElementById("brightness-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "brightness-overlay";
            overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1";
            container.insertBefore(overlay, controls);
        }
        if (val <= 1) overlay.style.backgroundColor = `rgba(0,0,0, ${1 - val})`;
        else overlay.style.backgroundColor = `rgba(255,255,255, ${(val - 1) * 0.5})`;
        
        brightnessSlider.value = val;
        fillSlider(brightnessSlider);
        document.getElementById("brightness-tooltip").textContent = Math.round(val * 100) + "%";
    }

    brightnessBtn.addEventListener("click", (e) => { e.stopPropagation(); setBrightness(1); });
    brightnessSlider.addEventListener("input", (e) => setBrightness(parseFloat(e.target.value)));

    // ----------------
    // EXTRA
    // ----------------
    fullscreenBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(console.error);
            document.getElementById("custom-title-bar").style.display = "none";
        } else {
            document.exitFullscreen();
            document.getElementById("custom-title-bar").style.display = "flex";
        }
    });

    // Window Controls
    minBtn.addEventListener("click", () => ipcRenderer.send('window-control', 'minimize'));
    maxBtn.addEventListener("click", () => ipcRenderer.send('window-control', 'maximize'));
    closeBtn.addEventListener("click", () => ipcRenderer.send('window-control', 'close'));

    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement) {
             document.getElementById("custom-title-bar").style.display = "flex";
        } else {
             document.getElementById("custom-title-bar").style.display = "none";
        }
    });

    document.addEventListener("keydown", (e) => {
        if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
        const k = e.key.toLowerCase();
        if (k === " " || k === "k") { e.preventDefault(); togglePlay(); }
        else if (k === "m") { muteBtn.click(); }
        else if (k === "f") { fullscreenBtn.click(); }
        else if (k === "o") { openFileBtn.click(); }
        else if (k === "i" || k === "p") { togglePiP(); }
        else if (e.key === "ArrowRight") doSkip(skipAmount);
        else if (e.key === "ArrowLeft") doSkip(-skipAmount);
    });

    // ----------------
    // FILES
    // ----------------
    async function loadFile(path) {
        if (!path) return;
        currentFilePath = path;
        spinner.style.display = "block";
        
        // Clear old temp remuxed files
        await ipcRenderer.invoke('clear-temp');

        // Probe media first
        try {
            mediaMetadata = await ipcRenderer.invoke('probe-media', path);
            if (mediaMetadata?.error) {
                console.error("Probe Error:", mediaMetadata.error);
                // Fallback: clear metadata to allow native play attempt
                mediaMetadata = null;
            }
        } catch (err) {
            console.error("Probe Invoke Error:", err);
            mediaMetadata = null;
        }
        console.log("Media Probed:", mediaMetadata);

        let formatted = path.replace(/\\/g, '/');
        if (!formatted.startsWith('/')) formatted = '/' + formatted;
        video.src = `file://${formatted}`;
        video.load();
        
        // Re-build menus after probe
        buildAudioTracksMenu();
        buildCaptionTracksMenu();

        // Auto-enable visualizer for audio-only
        const isAudioOnly = !mediaMetadata?.streams?.some(s => s.codec_type === 'video');
        if (isAudioOnly) toggleVisualizer(true);
        else toggleVisualizer(false);

        video.play().catch(err => {
            console.error(err);
        });
    }

    openFileBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const paths = await ipcRenderer.invoke('open-file-dialog');
        if (paths?.length > 0) loadFile(paths[0]);
    });

    container.addEventListener("dragover", (e) => {
        e.preventDefault(); e.stopPropagation();
        container.classList.add("drag_over");
    });
    container.addEventListener("dragleave", () => container.classList.remove("drag_over"));
    container.addEventListener("drop", (e) => {
        e.preventDefault(); e.stopPropagation();
        container.classList.remove("drag_over");
        if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0].path);
    });

    // START
    applyVolume(0.5);
    setBrightness(1);
    setSpeed(1);
});

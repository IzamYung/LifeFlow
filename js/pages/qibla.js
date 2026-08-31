/* UniFlow */

const QiblaPage = {
    qiblaBearing: 292.0, // Default average bearing for Malaysia (Northwest)
    userLocation: null,
    currentHeading: 0,
    permissionRequested: false,
    sensorTimeout: null,
    dialRotation: 0,
    arrowRotation: 0,

    // Static coordinate lookup for Malaysian zones as a fallback
    zoneCoords: {
        "WLY01": { lat: 3.1390, lon: 101.6869, name: "Kuala Lumpur" },
        "WLY02": { lat: 5.2831, lon: 115.2308, name: "Labuan" },
        "SGR01": { lat: 3.0738, lon: 101.5183, name: "Shah Alam" },
        "SGR02": { lat: 3.3482, lon: 101.2503, name: "Kuala Selangor" },
        "SGR03": { lat: 3.0449, lon: 101.4456, name: "Klang" },
        "JHR01": { lat: 1.4854, lon: 103.7618, name: "Johor Bahru" },
        "MLK01": { lat: 2.1896, lon: 102.2501, name: "Malacca" },
        "KTN01": { lat: 6.1254, lon: 102.2381, name: "Kota Bharu" },
        "KDH01": { lat: 6.1210, lon: 100.3601, name: "Alor Setar" },
        "NSD01": { lat: 2.5229, lon: 101.7946, name: "Port Dickson" },
        "PHG01": { lat: 3.2084, lon: 101.9126, name: "Bentong" },
        "PRK01": { lat: 4.5921, lon: 101.0901, name: "Ipoh" },
        "PLS01": { lat: 6.4449, lon: 100.2048, name: "Kangar" },
        "PNG01": { lat: 5.4141, lon: 100.3288, name: "Georgetown" },
        "SBH01": { lat: 5.9804, lon: 116.0753, name: "Kota Kinabalu" },
        "SWK01": { lat: 1.5533, lon: 110.3592, name: "Kuching" },
        "TRG01": { lat: 5.3302, lon: 103.1408, name: "Kuala Terengganu" }
    },

    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="qibla-page">
                <!-- Header with Back action -->
                <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="welcome-section">
                        <h2>Qibla Direction</h2>
                        <p id="qibla-loc-subtitle">Detecting location...</p>
                    </div>
                    <button class="btn btn-secondary" onclick="location.hash='#/prayer'" style="display:flex; align-items:center; gap:6px; padding:6px 12px; font-size:12px; font-weight:700;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;"><polyline points="15 18 9 12 15 6"/></svg>
                        Back
                    </button>
                </div>

                <!-- Compass Wrapper -->
                <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px;">
                    <!-- Sensor Request Button (specifically for iOS Safari orientation permission) -->
                    <button class="btn btn-secondary" id="btn-request-sensor" style="display:none; margin-bottom: 20px; font-weight: 700;">
                        🔌 Enable Compass Sensors
                    </button>

                    <!-- The Compass Graphic -->
                    <div class="compass-container" style="position: relative; width: 280px; height: 280px; margin: 20px auto; display: flex; align-items: center; justify-content: center;">
                        <!-- Direction ring/dial (Rotates opposite to device heading) -->
                        <div id="qibla-compass-dial" style="position: absolute; width: 100%; height: 100%; border: 6px solid var(--border-color); border-radius: 50%; background: var(--surface-color); box-shadow: var(--card-shadow); transition: transform 0.1s ease-out, border-color 0.3s ease;">
                            <!-- Marks -->
                            <span style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-weight: 800; font-size: 18px; color: var(--error);">N</span>
                            <span style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-weight: 800; font-size: 16px; color: var(--text-secondary);">S</span>
                            <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; font-size: 16px; color: var(--text-secondary);">E</span>
                            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; font-size: 16px; color: var(--text-secondary);">W</span>
                            
                            <!-- Dashed inner line -->
                            <div style="position: absolute; top: 10%; left: 10%; width: 80%; height: 80%; border-radius: 50%; border: 1px dashed var(--border-color);"></div>
                        </div>

                        <!-- Kaaba Arrow (Rotates relative to dial: Bearing - Heading) -->
                        <div id="qibla-arrow-container" style="position: absolute; width: 100%; height: 100%; pointer-events: none; transition: transform 0.1s ease-out;">
                            <!-- Green needle pointer -->
                            <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 24px; height: 50px; background: var(--success); clip-path: polygon(50% 0%, 0% 100%, 100% 100%); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"></div>
                            <!-- Kaaba Emoji icon -->
                            <div style="position: absolute; top: 40px; left: 50%; transform: translateX(-50%); font-size: 28px; z-index: 10;">🕋</div>
                        </div>

                        <!-- Center Axis Pin -->
                        <div style="position: absolute; width: 12px; height: 12px; background: var(--primary); border: 2px solid #ffffff; border-radius: 50%; z-index: 5; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                    </div>

                    <!-- Details Display -->
                    <div style="text-align: center; margin-top: 30px; width: 100%; max-width: 320px;">
                        <h3 id="qibla-status-text" style="font-family:var(--font-heading); color:var(--text-secondary);">Detecting orientation...</h3>
                        <div class="card" style="margin-top: 16px; padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary);">QIBLA ANGLE</div>
                                <div id="lbl-qibla-bearing" style="font-size: 20px; font-weight: 800; font-family: var(--font-heading); color: var(--success);">292.0°</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary);">YOUR HEADING</div>
                                <div id="lbl-device-heading" style="font-size: 20px; font-weight: 800; font-family: var(--font-heading); color: var(--primary);">0°</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('qibla-page');
            if (page) page.classList.add('active');
        }, 50);

        this.dialRotation = 0;
        this.arrowRotation = 0;

        // 1. Calculate Qibla Bearing (GPS or Zone Fallback)
        await this.initLocationAndBearing();

        // 2. Setup Device Orientation Listeners
        this.initOrientationSensors();
    },

    async initLocationAndBearing() {
        const subtitle = document.getElementById('qibla-loc-subtitle');
        const bearingLabel = document.getElementById('lbl-qibla-bearing');

        // Check GPS Geolocation API
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    this.userLocation = { lat, lon, source: "GPS Device" };

                    this.qiblaBearing = this.calculateQibla(lat, lon);
                    
                    if (subtitle) subtitle.textContent = `Using GPS (Accuracy: ${Math.round(pos.coords.accuracy)}m)`;
                    if (bearingLabel) bearingLabel.textContent = `${this.qiblaBearing.toFixed(1)}° NW`;
                    
                    console.log(`Qibla calculated via GPS: Bearing ${this.qiblaBearing.toFixed(2)}°`);
                },
                async (err) => {
                    // Fallback to database prayer zone coordinates
                    console.warn("GPS access denied or unavailable, falling back to prayer zone coordinates:", err);
                    await this.applyZoneCoordsFallback(subtitle, bearingLabel);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            await this.applyZoneCoordsFallback(subtitle, bearingLabel);
        }
    },

    async applyZoneCoordsFallback(subtitleEl, bearingEl) {
        try {
            const dbZone = await API.query("SELECT value_val FROM settings WHERE key_name = 'prayer_zone'");
            const zoneCode = dbZone[0] ? dbZone[0].value_val : 'WLY01';

            const coord = this.zoneCoords[zoneCode] || this.zoneCoords["WLY01"];
            this.userLocation = { lat: coord.lat, lon: coord.lon, source: `Zone fallback (${coord.name})` };

            this.qiblaBearing = this.calculateQibla(coord.lat, coord.lon);

            if (subtitleEl) subtitleEl.textContent = `Zone Fallback: ${coord.name} (${zoneCode})`;
            if (bearingEl) bearingEl.textContent = `${this.qiblaBearing.toFixed(1)}° NW`;
        } catch (e) {
            console.error("Failed to read zone coordinates fallback:", e);
        }
    },

    // Kaaba Spherical Trigonometry Formula
    calculateQibla(lat, lon) {
        const KaabaLat = 21.4225 * Math.PI / 180;
        const KaabaLon = 39.8262 * Math.PI / 180;
        const userLat = lat * Math.PI / 180;
        const userLon = lon * Math.PI / 180;

        const y = Math.sin(KaabaLon - userLon);
        const x = Math.cos(userLat) * Math.tan(KaabaLat) - Math.sin(userLat) * Math.cos(KaabaLon - userLon);

        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360;
        return bearing;
    },

    initOrientationSensors() {
        const btnRequest = document.getElementById('btn-request-sensor');
        
        // Handle iOS orientation permissions
        const isIOS = typeof DeviceOrientationEvent !== 'undefined' && 
                      typeof DeviceOrientationEvent.requestPermission === 'function';

        if (isIOS) {
            if (btnRequest) {
                btnRequest.style.display = 'block';
                btnRequest.addEventListener('click', async () => {
                    try {
                        const permission = await DeviceOrientationEvent.requestPermission();
                        if (permission === 'granted') {
                            btnRequest.style.display = 'none';
                            this.bindOrientationEvents();
                        } else {
                            alert('Permission to access device compass sensor was denied.');
                        }
                    } catch (err) {
                        alert('Orientation permission request failed: ' + err.message);
                    }
                });
            }
        } else {
            // Android / Desktop
            this.bindOrientationEvents();
        }
    },

    getShortestRotation(targetAngle, currentRotation) {
        let diff = targetAngle - currentRotation;
        // Normalize diff to [-180, 180]
        diff = ((diff + 180) % 360 + 360) % 360 - 180;
        return currentRotation + diff;
    },

    bindOrientationEvents() {
        // Clear any existing sensor timeout
        if (this.sensorTimeout) {
            clearTimeout(this.sensorTimeout);
            this.sensorTimeout = null;
        }

        const handleAbsoluteOrientation = (event) => {
            if (event.alpha !== null) {
                const heading = (360 - event.alpha) % 360;
                this.updateCompass(heading);
            }
        };

        const handleOrientation = (event) => {
            let heading = null;
            if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
                // iOS native compass heading
                heading = event.webkitCompassHeading;
            } else if (event.alpha !== null && event.absolute === true) {
                // Android absolute fallback inside deviceorientation
                heading = (360 - event.alpha) % 360;
            }

            if (heading !== null) {
                this.updateCompass(heading);
            }
        };

        const useAbsolute = 'ondeviceorientationabsolute' in window;

        if (useAbsolute) {
            window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
        } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
        }

        // Set timeout to show desktop fallback warning if no sensor event updates the compass in 2 seconds
        this.sensorTimeout = setTimeout(() => {
            this.showDesktopCompassWarning();
        }, 2000);

        // Keep a cleanup hook when routes change
        const checkRouteCleanup = () => {
            if (window.location.hash !== '#/qibla') {
                if (useAbsolute) {
                    window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
                } else {
                    window.removeEventListener('deviceorientation', handleOrientation, true);
                }
                if (this.sensorTimeout) {
                    clearTimeout(this.sensorTimeout);
                    this.sensorTimeout = null;
                }
                window.removeEventListener('hashchange', checkRouteCleanup);
            }
        };
        window.addEventListener('hashchange', checkRouteCleanup);
    },

    lastVibrateTime: 0,
    wasAligned: false,

    updateCompass(heading) {
        if (this.sensorTimeout) {
            clearTimeout(this.sensorTimeout);
            this.sensorTimeout = null;
        }

        this.currentHeading = heading;

        const dial = document.getElementById('qibla-compass-dial');
        const arrow = document.getElementById('qibla-arrow-container');
        const lblHeading = document.getElementById('lbl-device-heading');
        const statusText = document.getElementById('qibla-status-text');

        if (!dial || !arrow) return;

        // 1. Calculate target rotations
        const targetDialRotation = -heading;
        const targetArrowRotation = this.qiblaBearing - heading;

        // 2. Get shortest path accumulated rotations to prevent the 360 -> 0 degree spinning jump
        this.dialRotation = this.getShortestRotation(targetDialRotation, this.dialRotation);
        this.arrowRotation = this.getShortestRotation(targetArrowRotation, this.arrowRotation);

        // 3. Rotate dial and arrow container using accumulated rotations
        dial.style.transform = `rotate(${this.dialRotation}deg)`;
        arrow.style.transform = `rotate(${this.arrowRotation}deg)`;

        if (lblHeading) lblHeading.textContent = `${Math.round(heading)}°`;

        // 4. Check alignment (tolerance within 4 degrees)
        const rawDiff = Math.abs(heading - this.qiblaBearing);
        const normalizedDiff = Math.min(rawDiff, 360 - rawDiff);
        const isAligned = normalizedDiff <= 4.0;

        const now = Date.now();

        if (isAligned) {
            dial.style.borderColor = 'var(--success)';
            dial.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.45), 0 0 10px rgba(16, 185, 129, 0.3)';
            if (statusText) {
                statusText.textContent = '🕋 ALIGNED WITH QIBLA';
                statusText.style.color = 'var(--success)';
            }
            
            // Haptic vibration on entering alignment or every 1.5s while holding
            if (('vibrate' in navigator)) {
                if (!this.wasAligned || (now - this.lastVibrateTime > 1500)) {
                    try {
                        // Double pulse on initial alignment, single pulse to sustain
                        if (!this.wasAligned) {
                            navigator.vibrate([60, 40, 80]);
                        } else {
                            navigator.vibrate(50);
                        }
                        this.lastVibrateTime = now;
                    } catch (vibErr) {
                        console.warn('Vibration API:', vibErr);
                    }
                }
            }
            this.wasAligned = true;
        } else {
            dial.style.borderColor = 'var(--border-color)';
            dial.style.boxShadow = 'var(--card-shadow)';
            if (statusText) {
                statusText.textContent = 'Rotate device to align needle';
                statusText.style.color = 'var(--text-secondary)';
            }
            this.wasAligned = false;
        }
    },

    showDesktopCompassWarning() {
        if (this.sensorTimeout) {
            clearTimeout(this.sensorTimeout);
            this.sensorTimeout = null;
        }

        const statusText = document.getElementById('qibla-status-text');
        if (statusText) {
            statusText.innerHTML = `
                <span style="font-size:12px; color:var(--warning);">
                    ⚠️ Compass sensor not detected. Face <b>${this.qiblaBearing.toFixed(1)}° Northwest</b> relative to North.
                </span>
            `;
        }

        // Set static dial smoothly (North is UP)
        const dial = document.getElementById('qibla-compass-dial');
        const arrow = document.getElementById('qibla-arrow-container');
        if (dial && arrow) {
            this.dialRotation = this.getShortestRotation(0, this.dialRotation);
            this.arrowRotation = this.getShortestRotation(this.qiblaBearing, this.arrowRotation);
            dial.style.transform = `rotate(${this.dialRotation}deg)`;
            arrow.style.transform = `rotate(${this.arrowRotation}deg)`;
        }
    }
};

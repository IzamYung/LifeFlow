/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\pages\map.js */

const MapPage = {
    map: null,
    userMarker: null,
    userCoords: null,
    watchId: null,

    async render(container) {
        // Inject self-contained premium Map CSS (specifically, dark-mode tile filters & haptic pulse)
        container.innerHTML = `
            <style>
                #map-canvas-container {
                    flex: 1;
                    width: 100%;
                    position: relative;
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                    box-shadow: var(--card-shadow);
                    border: 1px solid var(--border-color);
                }
                
                #map {
                    width: 100%;
                    height: 100%;
                    min-height: 400px;
                }

                /* Dark Theme filter for OpenStreetMap Tiles */
                [data-theme="dark"] #map .leaflet-tile-container {
                    filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(95%);
                }
                [data-theme="dark"] #map {
                    background: #0b0c10 !important;
                }
                [data-theme="dark"] .leaflet-bar a {
                    background-color: var(--surface-color) !important;
                    color: var(--text-primary) !important;
                    border-bottom: 1px solid var(--border-color) !important;
                }

                /* Pulsing animation for user location blue dot */
                @keyframes pulse-ring {
                    0% { transform: scale(0.6); opacity: 1; }
                    100% { transform: scale(1.6); opacity: 0; }
                }
            </style>

            <div class="page-container" id="map-page" style="height: 100%; display: flex; flex-direction: column; padding-bottom: 0;">
                <!-- Header -->
                <div class="dashboard-header" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div class="welcome-section">
                        <h2>Map UTHM</h2>
                        <p>Live GPS campus tracking.</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" id="btn-map-center-uthm" style="display: flex; align-items: center; gap: 6px; padding: 10px 16px; font-weight: 700; border-radius: var(--radius-sm);">
                            🏛️ UTHM
                        </button>
                        <button class="btn btn-secondary" id="btn-map-center-you" style="display: flex; align-items: center; gap: 6px; padding: 10px 16px; font-weight: 700; border-radius: var(--radius-sm);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px; height:14px;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                            Find Me
                        </button>
                    </div>
                </div>

                <!-- Map Canvas -->
                <div id="map-canvas-container">
                    <div id="map"></div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('map-page');
            if (page) page.classList.add('active');
            this.initMap();
        }, 100);
    },

    initMap() {
        if (typeof L === 'undefined') {
            console.error("Leaflet.js CDN not loaded properly.");
            return;
        }

        // Initialize Map centered at UTHM
        this.map = L.map('map', {
            zoomControl: true,
            attributionControl: false
        }).setView([1.8589, 103.0869], 17);

        // Load OpenStreetMap tiles
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(this.map);

        // Bind events
        this.bindEvents();

        // Start GPS tracking
        this.startGPSTracking();
    },

    bindEvents() {
        const btnUthm = document.getElementById('btn-map-center-uthm');
        if (btnUthm) {
            btnUthm.addEventListener('click', () => {
                this.map.setView([1.8589, 103.0869], 17);
            });
        }

        const btnCenter = document.getElementById('btn-map-center-you');
        if (btnCenter) {
            btnCenter.addEventListener('click', () => {
                if (this.userCoords) {
                    this.map.setView([this.userCoords.lat, this.userCoords.lng], 18);
                } else {
                    alert("GPS location detecting... Please ensure location services are enabled on your device.");
                }
            });
        }

        // Handle route cleanups (stop listening to GPS changes when leaving this view)
        const checkRouteCleanup = () => {
            if (window.location.hash !== '#/map') {
                if (this.watchId !== null && navigator.geolocation) {
                    navigator.geolocation.clearWatch(this.watchId);
                    this.watchId = null;
                }
                window.removeEventListener('hashchange', checkRouteCleanup);
            }
        };
        window.addEventListener('hashchange', checkRouteCleanup);
    },

    startGPSTracking() {
        if (navigator.geolocation) {
            this.watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    this.userCoords = { lat, lng };

                    // Render or Update blue user location marker
                    const userIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: `
                            <div style="position: relative; width: 20px; height: 20px;">
                                <!-- Pulse ring outer circle -->
                                <div style="position: absolute; width: 24px; height: 24px; top: -2px; left: -2px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: pulse-ring 1.8s infinite ease-in-out;"></div>
                                <!-- Core solid circle -->
                                <div style="position: absolute; width: 12px; height: 12px; top: 4px; left: 4px; border-radius: 50%; background: #3b82f6; border: 2.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>
                            </div>
                        `,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });

                    if (this.userMarker) {
                        this.userMarker.setLatLng([lat, lng]);
                    } else {
                        this.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
                        
                        // Centering the map on the user on their first location lock
                        this.map.setView([lat, lng], 18);
                    }
                },
                (err) => {
                    console.warn("Geolocation watchPosition failed:", err);
                },
                { enableHighAccuracy: true, maximumAge: 10000 }
            );
        }
    }
};

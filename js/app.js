// Global PWA install prompt handler
// Global App Coordinator for UniFlow
const App = {
    currentRoute: '',
    session: null,
    routes: {
        'dashboard': DashboardPage,
        'finance': FinancePage,
        'planner': PlannerPage,
        'map': MapPage,
        'prayer': PrayerPage,
        'qibla': QiblaPage,
        'settings': SettingsPage,
        'vault': VaultPage
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then((reg) => {
                        console.log('Service Worker registered with scope:', reg.scope);

                        // 1. Check if a new Service Worker is installing
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        // New version detected! Show update banner
                                        App.showUpdateBanner(newWorker);
                                    }
                                });
                            }
                        });

                        // 2. If a new version is already waiting in background
                        if (reg.waiting && navigator.serviceWorker.controller) {
                            App.showUpdateBanner(reg.waiting);
                        }

                        // Register Periodic Background Sync if supported
                        if ('periodicSync' in reg) {
                            navigator.permissions.query({ name: 'periodic-background-sync' }).then((status) => {
                                if (status.state === 'granted') {
                                    reg.periodicSync.register('check-notifications', {
                                        minInterval: 5 * 60 * 1000 // 5 minutes
                                    }).catch(err => console.warn('Periodic Sync registration failed:', err));
                                }
                            });
                        }
                    })
                    .catch((err) => {
                        console.error('Service Worker registration failed:', err);
                    });

                // 3. Reload page when the new Service Worker takes control
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true;
                        window.location.reload();
                    }
                });
            });
        }
    },

    // Show PWA Update Banner when a new version is ready
    showUpdateBanner(worker) {
        if (document.getElementById('pwa-update-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.className = 'pwa-update-banner';
        banner.innerHTML = `
            <div class="update-banner-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
            </div>
            <div class="update-banner-info">
                <div class="update-banner-title">New update available!</div>
                <div class="update-banner-sub">Click update to load the latest version.</div>
            </div>
            <button class="update-banner-btn ripple-container" id="pwa-update-action-btn">
                Update Now
            </button>
        `;

        document.body.appendChild(banner);

        // Smooth slide-up animation
        requestAnimationFrame(() => {
            banner.classList.add('visible');
        });

        const updateBtn = document.getElementById('pwa-update-action-btn');
        if (updateBtn) {
            updateBtn.onclick = () => {
                updateBtn.textContent = 'Updating...';
                updateBtn.disabled = true;

                if (worker) {
                    worker.postMessage({ type: 'SKIP_WAITING' });
                } else if (navigator.serviceWorker) {
                    navigator.serviceWorker.getRegistration().then(reg => {
                        if (reg && reg.waiting) {
                            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                        } else {
                            window.location.reload();
                        }
                    });
                }
            };
        }
    },

    async init() {
        this.initStatusClock();
        this.registerServiceWorker();

        // 1. Immediately bind Auth UI listeners to prevent default form submits
        this.initAuthUI();

        // 2. Clean query params from URL if user submitted via browser GET
        if (window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            const userParam = urlParams.get('username');
            if (userParam) {
                const userInput = document.getElementById('login-username');
                if (userInput) userInput.value = userParam;
            }
            if (window.history && window.history.replaceState) {
                const cleanUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, cleanUrl);
            }
        }

        try {
            // 3. Check for active login session
            await this.checkAuth();

            // 4. Auto-seed default database records on startup in background
            await API.checkAndSeedDatabase();
        } catch (e) {
            console.error("Initialization failed:", e);
        }
    },

    // -------------------------------------------------------------------------
    // 1. SINGLE-INPUT PERSISTENT AUTHENTICATION (SQLite settings based)
    // -------------------------------------------------------------------------
    async checkAuth() {
        const sessionStr = localStorage.getItem('uniflow_session');
        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app-container');

        if (sessionStr) {
            try {
                this.session = JSON.parse(sessionStr);
                
                // Hide login screen, display app shell
                loginScreen.style.display = 'none';
                appContainer.style.display = 'flex';

                // Initialize SPA routers, FAB, and pull-to-refresh
                this.initRouting();
                this.initFAB();
                this.initPullToRefresh();
                await this.initThemeAndPermissions();
                
            } catch (e) {
                console.error('Session validation failed: ', e);
                this.logout();
            }
        } else {
            // Display fullscreen login page
            loginScreen.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    },

    initAuthUI() {
        const panelLogin = document.getElementById('form-auth-login');
        if (!panelLogin || panelLogin.dataset.bound) return;
        panelLogin.dataset.bound = 'true';

        // Submit Login Form
        panelLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = panelLogin.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying...';
            }

            const inputName = document.getElementById('login-username').value.trim().toLowerCase();

            try {
                // Fetch seeded profile name from Turso settings table
                const nameDb = await API.query("SELECT value_val FROM settings WHERE key_name = 'user_name'");
                const univDb = await API.query("SELECT value_val FROM settings WHERE key_name = 'user_university'");
                
                const realName = nameDb[0] ? nameDb[0].value_val.trim() : '';
                const regName = realName.toLowerCase();
                const realUniv = univDb[0] ? univDb[0].value_val.trim() : '';

                // Allow exact match or first-name match
                const isMatch = regName && ((inputName === regName) || 
                                (regName.split(' ')[0] === inputName) || 
                                (regName.includes(inputName) && inputName.length >= 3));

                if (isMatch) {
                    const session = {
                        name: realName,
                        university: realUniv
                    };

                    // Save session into localStorage (No expiration timer)
                    localStorage.setItem('uniflow_session', JSON.stringify(session));
                    panelLogin.reset();
                    await this.checkAuth();
                } else {
                    alert('Profile name not recognized. Access denied.');
                }
            } catch (err) {
                alert('Database communication error: ' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    },

    logout() {
        if (confirm('Are you sure you want to log out of UniFlow?')) {
            localStorage.removeItem('uniflow_session');
            this.session = null;
            window.location.hash = '#/dashboard';
            window.location.reload();
        }
    },

    // -------------------------------------------------------------------------
    // 2. ROUTING & SPA PAGES TRANSITIONS
    // -------------------------------------------------------------------------
    initRouting() {
        const handleRoute = async () => {
            if (!this.session) return;

            let hash = window.location.hash.slice(2) || 'dashboard';
            
            if (hash.includes('?')) {
                hash = hash.split('?')[0];
            }

            if (!this.routes[hash]) {
                hash = 'dashboard';
            }

            this.currentRoute = hash;
            this.syncNavbars(hash);

            const viewport = document.getElementById('main-viewport');
            
            const fabContainer = document.getElementById('global-fab-container');
            if (fabContainer) {
                fabContainer.style.display = hash === 'settings' ? 'none' : 'flex';
            }

            API.showSkeletons('#main-viewport', 3);

            try {
                await this.routes[hash].render(viewport);
            } catch (err) {
                viewport.innerHTML = `
                    <div class="empty-state" style="padding:100px 0;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <h5>Failed to load page</h5>
                        <p>${err.message}</p>
                        <button class="btn btn-primary" style="margin-top:12px;" onclick="location.reload()">Reload App</button>
                    </div>
                `;
            }
        };

        if (!this.routingBound) {
            window.addEventListener('hashchange', handleRoute);
            window.addEventListener('DOMContentLoaded', handleRoute);
            this.routingBound = true;
        }

        handleRoute();
    },

    syncNavbars(activeRoute) {
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(item => {
            if (item.dataset.page === activeRoute) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        const navItems = document.querySelectorAll('.bottom-nav-item');
        navItems.forEach(item => {
            if (item.dataset.page === activeRoute) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        navItems.forEach(item => {
            item.onclick = () => {
                const target = item.dataset.page;
                window.location.hash = `#/${target}`;
            };
        });
    },

    // -------------------------------------------------------------------------
    // 2.1 RELOAD & REFRESH LOGIC (Pull-to-refresh & Header Button)
    // -------------------------------------------------------------------------
    async reloadPage() {
        if (!this.session) return;
        const currentHash = this.currentRoute || 'dashboard';

        try {
            // Re-sync local cache from Turso cloud
            await API.forceSync();
        } catch (e) {
            console.warn("API forceSync on reload:", e);
        }

        // Re-render current active page route
        const viewport = document.getElementById('main-viewport');
        if (viewport && this.routes[currentHash]) {
            API.showSkeletons('#main-viewport', 2);
            try {
                await this.routes[currentHash].render(viewport);
            } catch (err) {
                console.error("Page render failed on reload:", err);
            }
        }
    },

    initPullToRefresh() {
        const viewport = document.getElementById('main-viewport');
        const ptrIndicator = document.getElementById('pull-to-refresh');
        if (!viewport || !ptrIndicator || viewport.dataset.ptrBound) return;
        viewport.dataset.ptrBound = 'true';

        const ptrIcon = ptrIndicator.querySelector('svg');
        let startY = 0;
        let currentY = 0;
        let isPulling = false;
        let isRefreshing = false;

        const isModalOrSheetActive = () => {
            const overlay = document.getElementById('global-modal-overlay');
            const sheet = document.getElementById('global-bottom-sheet');
            return (overlay && overlay.classList.contains('active')) ||
                   (sheet && sheet.classList.contains('active')) ||
                   document.querySelector('.modal-overlay.active, .bottom-sheet.active');
        };

        viewport.addEventListener('touchstart', (e) => {
            if (isRefreshing) return;

            // Strict check: if any modal/popup/sheet is active, completely ignore gesture
            if (isModalOrSheetActive()) {
                isPulling = false;
                return;
            }

            // Only trigger if scrolled to the very top
            if (viewport.scrollTop <= 0 && e.touches.length === 1) {
                startY = e.touches[0].clientY;
                isPulling = true;
                ptrIndicator.style.transition = 'none';
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (!isPulling || isRefreshing) return;

            // If modal became active during move, cancel immediately
            if (isModalOrSheetActive()) {
                isPulling = false;
                ptrIndicator.style.transform = 'translateX(-50%) translateY(-65px)';
                ptrIndicator.classList.remove('active');
                return;
            }

            currentY = e.touches[0].clientY;
            const diffY = currentY - startY;

            if (diffY > 0 && viewport.scrollTop <= 0) {
                // Apply soft resistance curve
                const pullDistance = Math.min(diffY * 0.42, 75);
                const rotation = Math.min(diffY * 2.2, 360);

                ptrIndicator.classList.add('active');
                ptrIndicator.style.transform = `translateX(-50%) translateY(${pullDistance - 55}px)`;
                if (ptrIcon) {
                    ptrIcon.style.transform = `rotate(${rotation}deg)`;
                }
            } else {
                ptrIndicator.classList.remove('active');
                ptrIndicator.style.transform = 'translateX(-50%) translateY(-65px)';
            }
        }, { passive: true });

        viewport.addEventListener('touchend', async () => {
            if (!isPulling || isRefreshing) return;
            isPulling = false;

            const diffY = currentY - startY;
            const pullDistance = Math.min(diffY * 0.42, 75);

            if (pullDistance >= 40 && viewport.scrollTop <= 0 && !isModalOrSheetActive()) {
                isRefreshing = true;
                ptrIndicator.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                ptrIndicator.classList.add('refreshing');

                try {
                    await this.reloadPage();
                } finally {
                    setTimeout(() => {
                        ptrIndicator.classList.remove('refreshing', 'active');
                        ptrIndicator.style.transform = 'translateX(-50%) translateY(-65px)';
                        if (ptrIcon) ptrIcon.style.transform = 'rotate(0deg)';
                        isRefreshing = false;
                    }, 400);
                }
            } else {
                ptrIndicator.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                ptrIndicator.classList.remove('active');
                ptrIndicator.style.transform = 'translateX(-50%) translateY(-65px)';
                if (ptrIcon) ptrIcon.style.transform = 'rotate(0deg)';
            }

            startY = 0;
            currentY = 0;
        });
    },

    // -------------------------------------------------------------------------
    // 3. SIMULATED ANDROID STATUS BAR CLOCK
    // -------------------------------------------------------------------------
    initStatusClock() {
        const updateClock = () => {
            const clockEl = document.getElementById('android-clock');
            if (!clockEl) return;
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            clockEl.textContent = timeStr;
        };
        updateClock();
        setInterval(updateClock, 30000); 
    },

    // -------------------------------------------------------------------------
    // 4. FLOATING ACTION BUTTON (FAB) LOGIC
    // -------------------------------------------------------------------------
    initFAB() {
        const fabContainer = document.getElementById('global-fab-container');
        const mainFab = document.getElementById('main-fab');

        if (!mainFab) return;

        const newFab = mainFab.cloneNode(true);
        mainFab.parentNode.replaceChild(newFab, mainFab);

        newFab.addEventListener('click', (e) => {
            e.stopPropagation();
            fabContainer.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            fabContainer.classList.remove('active');
        });
    },

    refreshActivePage() {
        const viewport = document.getElementById('main-viewport');
        if (this.routes[this.currentRoute]) {
            this.routes[this.currentRoute].render(viewport);
        }
    },

    // -------------------------------------------------------------------------
    // 5. GLOBAL THEME AND PERMISSIONS CHECK
    // -------------------------------------------------------------------------
    async initThemeAndPermissions() {
        try {
            const dbTheme = await API.query("SELECT value_val FROM settings WHERE key_name = 'dark_mode'");
            const isDark = dbTheme[0] ? dbTheme[0].value_val === '1' : true;
            document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

            // Sync global checkboxes
            const sidebarToggle = document.getElementById('global-sidebar-dark-mode');
            const statusToggle = document.getElementById('global-status-dark-mode');
            if (sidebarToggle) sidebarToggle.checked = isDark;
            if (statusToggle) statusToggle.checked = isDark;

            const handleThemeToggle = async (checked) => {
                const isDarkVal = checked ? '1' : '0';
                document.body.setAttribute('data-theme', checked ? 'dark' : 'light');
                
                // Keep checkboxes synced
                if (sidebarToggle) sidebarToggle.checked = checked;
                if (statusToggle) statusToggle.checked = checked;
                const settingsToggle = document.getElementById('sett-dark-mode');
                if (settingsToggle) settingsToggle.checked = checked;

                try {
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('dark_mode', ?)", [isDarkVal]);
                } catch (err) {
                    console.error('Failed to save theme state: ' + err.message);
                }
            };

            if (sidebarToggle) {
                sidebarToggle.addEventListener('change', (e) => handleThemeToggle(e.target.checked));
            }
            if (statusToggle) {
                statusToggle.addEventListener('change', (e) => handleThemeToggle(e.target.checked));
            }

            const dbNotif = await API.query("SELECT value_val FROM settings WHERE key_name = 'notifications_enabled'");
            const isEnabled = dbNotif[0] ? dbNotif[0].value_val === '1' : true;

            if (isEnabled) {
                if (window.Notification && Notification.permission === 'granted') {
                    this.subscribeToWebPush();
                } else if (window.Notification && Notification.permission === 'default') {
                    setTimeout(() => {
                        Notification.requestPermission().then(perm => {
                            if (perm === 'granted') this.subscribeToWebPush();
                        });
                    }, 2000);
                }
            }
        } catch (err) {
            console.error('Core configuration setup failed: ' + err.message);
        }
    },

    // Register Web Push subscription to Turso cloud for cron-job.org
    async subscribeToWebPush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (!window.Notification || Notification.permission !== 'granted') return;

        try {
            const reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();

            if (!sub) {
                const publicKey = "BKo1ZzuNImLi5DaIJzwzjB9t1uE3SUaAhVLGWMWbtub8p4Eq_eZATXK9Fs-DruPoNNvuUZZHN0vJF3THehYKn7E";
                const padding = '='.repeat((4 - publicKey.length % 4) % 4);
                const base64 = (publicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }

                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: outputArray
                });
            }

            if (sub) {
                const subJson = sub.toJSON();
                const p256dh = subJson.keys?.p256dh || '';
                const auth = subJson.keys?.auth || '';
                const endpoint = sub.endpoint;

                if (endpoint && p256dh && auth) {
                    await API.execute(
                        "INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)",
                        [endpoint, p256dh, auth]
                    );
                    console.log("Web push subscription synced with Turso cloud.");
                }
            }
        } catch (e) {
            console.warn("Web Push subscription sync failed:", e);
        }
    },

    // -------------------------------------------------------------------------
    // 6. LOCAL BACKGROUND NOTIFICATIONS POLLING ENGINE (SQLite backed)
    // -------------------------------------------------------------------------
    initNotificationPolling() {
        const poll = async () => {
            if (!this.session) return;
            try {
                // Fetch scheduled alerts due now or in the past
                const pending = await API.query("SELECT * FROM notifications WHERE sent = 0 AND datetime(scheduled_time) <= datetime('now', 'localtime')");
                
                if (pending.length > 0) {
                    for (const notif of pending) {
                        this.triggerSystemNotification(notif.title, notif.body);
                        await API.execute("UPDATE notifications SET sent = 1 WHERE id = ?", [notif.id]);
                    }
                }
            } catch (err) {
                console.error('Notification polling tick failed: ' + err.message);
            }
        };

        if (this.notifInterval) clearInterval(this.notifInterval);
        poll();
        this.notifInterval = setInterval(poll, 30000);
    },

    triggerSystemNotification(title, body) {
        if (Notification.permission === 'granted') {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then((reg) => {
                    reg.showNotification(title, {
                        body: body,
                        icon: './logo.png',
                        badge: './logo.png',
                        vibrate: [100, 50, 100]
                    });
                }).catch((e) => {
                    new Notification(title, { body: body });
                });
            } else {
                try {
                    new Notification(title, { body: body });
                } catch (e) {
                    console.warn('HTML5 Notification error: ', e);
                }
            }
        }

        if (window.AndroidBridge && typeof window.AndroidBridge.showNotification === 'function') {
            window.AndroidBridge.showNotification(title, body);
        }
    }
};

// Start application
document.addEventListener('DOMContentLoaded', () => App.init());

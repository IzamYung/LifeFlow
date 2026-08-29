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
            });
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

                // Initialize SPA routers, FAB, and alerts polling
                this.initRouting();
                this.initFAB();
                await this.initThemeAndPermissions();
                this.initNotificationPolling();
                
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

            if (isEnabled && Notification.permission === 'default') {
                setTimeout(() => {
                    Notification.requestPermission();
                }, 2000);
            }
        } catch (err) {
            console.error('Core configuration setup failed: ' + err.message);
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

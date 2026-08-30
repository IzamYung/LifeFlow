/* UniFlow */

const SettingsPage = {
    settings: {},

    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="settings-page">
                <!-- Header -->
                <div class="dashboard-header">
                    <div class="welcome-section">
                        <h2>Settings</h2>
                        <p>Configure theme preferences, notifications, and profile details.</p>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr; gap: 20px;">
                    
                    <!-- 1. Theme and Preferences Group -->
                    <div class="settings-group">
                        <div class="settings-group-title">Preferences</div>
                        <div class="settings-list">
                            <div class="settings-item">
                                <div class="settings-item-left">
                                    <div class="settings-icon-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                                    </div>
                                    <div class="settings-label">
                                        <span class="settings-title">Dark Mode Theme</span>
                                        <span class="settings-subtitle">Switch to battery-saving dark interface.</span>
                                    </div>
                                </div>
                                <label class="switch">
                                    <input type="checkbox" id="sett-dark-mode">
                                    <span class="slider"></span>
                                </label>
                            </div>

                            <div class="settings-item">
                                <div class="settings-item-left">
                                    <div class="settings-icon-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                                    </div>
                                    <div class="settings-label">
                                        <span class="settings-title">Background Notifications</span>
                                        <span class="settings-subtitle">Prayer times & task reminders — even when app is closed.</span>
                                    </div>
                                </div>
                                <label class="switch">
                                    <input type="checkbox" id="sett-notifications">
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- PWA Install App Group -->
                    <div class="settings-group" id="pwa-install-group">
                        <div class="settings-group-title">Progressive Web App</div>
                        <div class="settings-list">
                            <div class="settings-item" style="flex-direction:column; align-items:flex-start; gap:12px; padding:16px;">
                                <div class="settings-item-left" style="width:100%;">
                                    <div class="settings-icon-box" style="background:var(--primary-light);">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                    </div>
                                    <div class="settings-label" style="flex:1;">
                                        <span class="settings-title">Install UniFlow App</span>
                                        <span class="settings-subtitle" id="pwa-status-text">Install to home screen for offline access & background notifications.</span>
                                    </div>
                                </div>
                                <button id="btn-pwa-install" class="btn btn-primary" style="width:100%; font-weight:700; padding:12px;">
                                    📲 Install App to Home Screen
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Profile Details Form Card -->
                    <div class="settings-group">
                        <div class="settings-group-title">Student Profile</div>
                        <div class="card" style="padding: 16px;">
                            <form id="form-profile-settings" class="settings-form">
                                <div class="form-group">
                                    <label for="sett-profile-name">Full Name</label>
                                    <input type="text" id="sett-profile-name" name="user_name" required>
                                </div>
                                <div class="form-group">
                                    <label for="sett-profile-univ">University / College</label>
                                    <input type="text" id="sett-profile-univ" name="user_university" required>
                                </div>
                                <div class="form-group">
                                    <label for="sett-profile-budget">Monthly Expenses Budget ($)</label>
                                    <input type="number" id="sett-profile-budget" name="monthly_budget" step="1" required>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Save Profile</button>
                                </div>
                            </form>
                        </div>
                    </div>





                    <!-- 3. Telegram Vault Credentials Form -->
                    <div class="settings-group">
                        <div class="settings-group-title">Telegram Vault Credentials</div>
                        <div class="card" style="padding: 16px;">
                            <form id="form-telegram-settings" class="settings-form" style="display: flex; flex-direction: column; gap: 14px;">
                                <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
                                    <label for="sett-tele-token" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary);">Telegram Bot Token</label>
                                    <input type="password" id="sett-tele-token" placeholder="Paste bot token..." style="padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background-color: var(--surface-variant); color: var(--text-primary); font-family: var(--font-body); font-size: 14px;">
                                </div>
                                <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
                                    <label for="sett-tele-chat" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary);">Telegram Chat / Channel ID</label>
                                    <input type="text" id="sett-tele-chat" placeholder="e.g. -1001234567890" style="padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background-color: var(--surface-variant); color: var(--text-primary); font-family: var(--font-body); font-size: 14px;">
                                    <span style="font-size: 11px; color: var(--text-secondary); line-height: 1.45;">
                                        Add the bot to a private channel as Admin, and input the Channel Chat ID (starts with <code>-100</code>).
                                    </span>
                                </div>
                                <button type="submit" class="btn btn-primary" style="align-self: flex-start; padding: 10px 16px;">Save Telegram Credentials</button>
                            </form>
                        </div>
                    </div>

                    <!-- 4. About Info Screen -->
                    <div class="about-panel" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                        <img src="logo.png" alt="UniFlow" style="width:64px; height:64px; border-radius:12px; object-fit:contain; border:1.5px solid var(--border-color); background-color:var(--surface-variant); padding:6px; margin-bottom:12px;" onerror="this.style.display='none';">
                        <h4 style="font-family:var(--font-heading);">UniFlow Productivity App</h4>
                        <div class="about-version">Version 1.0.0 (Release Build)</div>
                        <p class="about-desc">
                            UniFlow is a university-targeted personal dashboard designed to combine finance ledgers, schedules, and assignment tracking. Packaged for Android WebView optimization and powered by Turso Serverless SQLite DB.
                        </p>
                    </div>

                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('settings-page');
            if (page) page.classList.add('active');
        }, 50);

        // Hide FAB on settings screen
        const fab = document.getElementById('global-fab-container');
        if (fab) fab.style.display = 'none';

        await this.loadSettings();
        this.bindEvents();
    },

    async loadSettings() {
        try {
            const list = await API.query("SELECT key_name, value_val FROM settings");
            this.settings = {};
            list.forEach(s => this.settings[s.key_name] = s.value_val);

            // Sync values to UI inputs
            document.getElementById('sett-profile-name').value = this.settings.user_name || '';
            document.getElementById('sett-profile-univ').value = this.settings.user_university || '';
            document.getElementById('sett-profile-budget').value = parseInt(this.settings.monthly_budget || 500);

            // Sync toggle checks
            document.getElementById('sett-dark-mode').checked = this.settings.dark_mode === '1';
            document.getElementById('sett-notifications').checked = this.settings.notifications_enabled === '1';

            // Sync Telegram inputs
            const teleToken = document.getElementById('sett-tele-token');
            if (teleToken) teleToken.value = this.settings.telegram_bot_token || '';

            const teleChat = document.getElementById('sett-tele-chat');
            if (teleChat) teleChat.value = this.settings.telegram_chat_id || '';


        } catch (err) {
            console.error('Failed to load settings data: ' + err.message);
        }
    },



    bindEvents() {
        const form = document.getElementById('form-profile-settings');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('sett-profile-name').value.trim();
                const university = document.getElementById('sett-profile-univ').value.trim();
                const budget = document.getElementById('sett-profile-budget').value;

                try {
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('user_name', ?)", [name]);
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('user_university', ?)", [university]);
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('monthly_budget', ?)", [budget]);

                    // Update session state in localStorage
                    const sessionStr = localStorage.getItem('uniflow_session');
                    if (sessionStr) {
                        const session = JSON.parse(sessionStr);
                        session.name = name;
                        session.university = university;
                        localStorage.setItem('uniflow_session', JSON.stringify(session));
                    }

                    alert('Profile updated successfully!');
                    
                    // Update UI layout titles immediately
                    const sidebarName = document.getElementById('sidebar-profile-name');
                    if (sidebarName) sidebarName.textContent = name;
                    const sidebarUniv = document.getElementById('sidebar-profile-univ');
                    if (sidebarUniv) sidebarUniv.textContent = university;
                    
                    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const avatarLetters = document.getElementById('profile-avatar-letters');
                    if (avatarLetters) avatarLetters.textContent = initials;
                    const avatarLogo = document.getElementById('sidebar-avatar-logo');
                    if (avatarLogo) avatarLogo.textContent = initials;

                    await this.loadSettings();
                } catch (err) {
                    alert('Save failed: ' + err.message);
                }
            });
        }

        // Theme Toggle Switch Event
        const themeSwitch = document.getElementById('sett-dark-mode');
        if (themeSwitch) {
            themeSwitch.addEventListener('change', async (e) => {
                const isDark = e.target.checked ? '1' : '0';
                document.body.setAttribute('data-theme', isDark === '1' ? 'dark' : 'light');

                // Sync global switches
                const sidebarToggle = document.getElementById('global-sidebar-dark-mode');
                const statusToggle = document.getElementById('global-status-dark-mode');
                if (sidebarToggle) sidebarToggle.checked = e.target.checked;
                if (statusToggle) statusToggle.checked = e.target.checked;

                try {
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('dark_mode', ?)", [isDark]);
                } catch (err) {
                    console.error('Failed to save theme state: ' + err.message);
                }
            });
        }

        // Notifications Toggle Switch Event
        const notifSwitch = document.getElementById('sett-notifications');
        if (notifSwitch) {
            notifSwitch.addEventListener('change', async (e) => {
                const isEnabled = e.target.checked ? '1' : '0';

                if (e.target.checked && Notification.permission !== 'granted') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        notifSwitch.checked = false;
                        alert('Notifications permissions were denied. Please enable them in your browser settings.');
                        return;
                    }
                }

                try {
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('notifications_enabled', ?)", [isEnabled]);

                    // If enabled, try to register Periodic Background Sync for background alerts
                    if (e.target.checked && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
                        const reg = await navigator.serviceWorker.ready;
                        if ('periodicSync' in reg) {
                            try {
                                const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                                if (status.state === 'granted') {
                                    await reg.periodicSync.register('check-notifications', {
                                        minInterval: 5 * 60 * 1000 // every 5 minutes
                                    });
                                    console.log('Background Sync registered for prayer alerts.');
                                }
                            } catch (syncErr) {
                                console.warn('Periodic background sync registration failed:', syncErr);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to save notification preferences: ' + err.message);
                }
            });
        }

        // PWA Install Prompt Handler
        const btnInstall = document.getElementById('btn-pwa-install');
        const statusText = document.getElementById('pwa-status-text');
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

        if (isStandalone) {
            if (btnInstall) {
                btnInstall.disabled = true;
                btnInstall.textContent = '✅ App Installed (Standalone Mode)';
                btnInstall.style.backgroundColor = 'var(--success)';
                btnInstall.style.color = '#ffffff';
                btnInstall.style.opacity = '0.9';
                btnInstall.style.cursor = 'default';
            }
            if (statusText) {
                statusText.textContent = 'UniFlow is currently running as an installed standalone app.';
            }
        } else if (btnInstall) {
            btnInstall.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (window.deferredInstallPrompt) {
                    window.deferredInstallPrompt.prompt();
                    const { outcome } = await window.deferredInstallPrompt.userChoice;
                    if (outcome === 'accepted') {
                        btnInstall.disabled = true;
                        btnInstall.textContent = '✅ Installed Successfully!';
                        btnInstall.style.backgroundColor = 'var(--success)';
                        window.deferredInstallPrompt = null;
                    }
                } else {
                    // Show in-app bottom sheet guide instead of blocking alert
                    const guideHtml = `
                        <div style="display:flex; flex-direction:column; gap:14px; padding:4px 0 16px 0;">
                            <p style="font-size:13px; color:var(--text-secondary); margin:0;">
                                Install UniFlow to your device home screen for quick offline access and background notifications:
                            </p>
                            
                            <div style="background:var(--surface-variant); border-radius:var(--radius-md); padding:14px; border:1px solid var(--border-color);">
                                <div style="font-weight:700; font-size:14px; margin-bottom:6px; color:var(--text-primary);">📱 Android (Google Chrome)</div>
                                <div style="font-size:13px; color:var(--text-secondary); line-height:1.5;">
                                    1. Tap the <strong>three-dots menu (⋮)</strong> at the top right.<br>
                                    2. Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                                </div>
                            </div>
                            
                            <div style="background:var(--surface-variant); border-radius:var(--radius-md); padding:14px; border:1px solid var(--border-color);">
                                <div style="font-weight:700; font-size:14px; margin-bottom:6px; color:var(--text-primary);">🍎 iPhone / iPad (Safari)</div>
                                <div style="font-size:13px; color:var(--text-secondary); line-height:1.5;">
                                    1. Tap the <strong>Share button</strong> (square with arrow pointing up).<br>
                                    2. Scroll down and tap <strong>"Add to Home Screen"</strong>.
                                </div>
                            </div>

                            <div style="background:var(--surface-variant); border-radius:var(--radius-md); padding:14px; border:1px solid var(--border-color);">
                                <div style="font-weight:700; font-size:14px; margin-bottom:6px; color:var(--text-primary);">💻 PC / Mac (Chrome & Edge)</div>
                                <div style="font-size:13px; color:var(--text-secondary); line-height:1.5;">
                                    Click the <strong>Install icon</strong> in the right corner of your browser's address bar.
                                </div>
                            </div>

                            <button class="btn btn-primary" style="width:100%; margin-top:6px;" onclick="Modal.close()">Got it</button>
                        </div>
                    `;
                    Modal.open('How to Install UniFlow', guideHtml);
                }
            };
        }

        // Telegram API Credentials form submit
        const teleForm = document.getElementById('form-telegram-settings');
        if (teleForm) {
            teleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const botToken = document.getElementById('sett-tele-token').value.trim();
                const chatId = document.getElementById('sett-tele-chat').value.trim();

                try {
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('telegram_bot_token', ?)", [botToken]);
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('telegram_chat_id', ?)", [chatId]);
                    alert('Telegram credentials saved successfully!');
                    await this.loadSettings();
                } catch (err) {
                    alert('Save failed: ' + err.message);
                }
            });
        }
    }
};

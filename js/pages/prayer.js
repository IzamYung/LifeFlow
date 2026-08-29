/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\pages\prayer.js */

const PrayerPage = {
    cache: {}, // Holds monthly query cache: { "zone-year-month": [prayerTimeArray] }
    selectedZone: localStorage.getItem('uniflow_prayer_zone') || 'WLY01',
    selectedDate: new Date(),

    zones: {
        "Federal Territories": {
            "WLY01": "Kuala Lumpur, Putrajaya",
            "WLY02": "Labuan"
        },
        "Selangor": {
            "SGR01": "Gombak, Petaling, Sepang, Hulu Langat, Shah Alam",
            "SGR02": "Kuala Selangor, Sabak Bernam",
            "SGR03": "Klang, Kuala Langat"
        },
        "Johor": {
            "JHR01": "Johor Bahru, Kulai, Pontian",
            "JHR02": "Kota Tinggi",
            "JHR03": "Mersing",
            "JHR04": "Muar, Ledang, Segamat",
            "JHR05": "Batu Pahat",
            "JHR06": "Kluang"
        },
        "Kedah": {
            "KDH01": "Kota Setar, Pokok Sena, Kubang Pasu",
            "KDH02": "Kuala Muda, Yan, Pendang",
            "KDH03": "Kulim, Bandar Baharu",
            "KDH04": "Baling",
            "KDH05": "Bandar Baharu",
            "KDH06": "Langkawi",
            "KDH07": "Padang Terap, Sik"
        },
        "Kelantan": {
            "KTN01": "Kota Bharu, Bachok, Pasir Puteh, Tumpat, Pasir Mas",
            "KTN02": "Kuala Krai, Gua Musang"
        },
        "Malacca": {
            "MLK01": "Whole State of Malacca"
        },
        "Negeri Sembilan": {
            "NSD01": "Port Dickson",
            "NSD02": "Seremban, Jempol, Jelebu, Kuala Pilah, Rembau, Tampin"
        },
        "Pahang": {
            "PHG01": "Bentong, Raub, Lipis",
            "PHG02": "Temerloh, Jerantut, Maran, Bera",
            "PHG03": "Pekan, Kuantan, Rompin",
            "PHG04": "Cameron Highlands"
        },
        "Perak": {
            "PRK01": "Tapah, Slim River, Tanjung Malim",
            "PRK02": "Ipoh, Batu Gajah, Kampar",
            "PRK03": "Kuala Kangsar, Sungai Siput",
            "PRK04": "Gerik, Pengkalan Hulu",
            "PRK05": "Manjung, Perak Tengah"
        },
        "Perlis": {
            "PLS01": "Whole State of Perlis"
        },
        "Penang": {
            "PNG01": "Whole State of Penang"
        },
        "Sabah": {
            "SBH01": "Kota Kinabalu, Penampang, Tuaran",
            "SBH02": "Sandakan, Beluran",
            "SBH03": "Tawau, Lahad Datu"
        },
        "Sarawak": {
            "SWK01": "Kuching, Bau, Lundu",
            "SWK02": "Sibu, Mukah",
            "SWK03": "Miri, Marudi"
        },
        "Terengganu": {
            "TRG01": "Kuala Terengganu, Marang",
            "TRG02": "Kemaman, Dungun",
            "TRG03": "Besut, Setiu"
        }
    },

    async render(container) {
        try {
            const dbZone = await API.query("SELECT value_val FROM settings WHERE key_name = 'prayer_zone'");
            if (dbZone[0]) {
                this.selectedZone = dbZone[0].value_val;
            }
        } catch (e) {
            console.warn("Could not fetch prayer zone from DB settings:", e);
        }

        let zoneOptions = '';
        for (const state in this.zones) {
            zoneOptions += `<optgroup label="${state}">`;
            for (const code in this.zones[state]) {
                const isSelected = this.selectedZone === code ? 'selected' : '';
                zoneOptions += `<option value="${code}" ${isSelected}>${code} - ${this.zones[state][code]}</option>`;
            }
            zoneOptions += `</optgroup>`;
        }

        const dateISO = this.selectedDate.toISOString().split('T')[0];

        // Dynamically compute date label prefix (Today/Tomorrow/Yesterday) for the initial render
        const today = new Date();
        const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
        
        let prefix = '';
        if (isSameDay(this.selectedDate, today)) {
            prefix = 'Today, ';
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            if (isSameDay(this.selectedDate, tomorrow)) {
                prefix = 'Tomorrow, ';
            } else if (isSameDay(this.selectedDate, yesterday)) {
                prefix = 'Yesterday, ';
            }
        }
        const activeDateStr = prefix + this.selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        container.innerHTML = `
            <div class="page-container" id="prayer-page">
                <!-- Header -->
                <div class="dashboard-header">
                    <div class="welcome-section">
                        <h2>Prayer Times</h2>
                        <p>Malaysia daily prayer times and Islamic Hijri dates.</p>
                    </div>
                </div>

                <!-- Controls -->
                <div class="card" style="margin-bottom: 20px; padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <!-- Location Selector -->
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="prayer-zone-select" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Location / Zone</label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <span style="position: absolute; left: 12px; color: var(--text-secondary); pointer-events: none; font-size: 14px;">📍</span>
                            <select id="prayer-zone-select" style="width:100%; padding: 10px 10px 10px 34px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background-color:var(--surface-color); color:var(--text-primary); font-size:13px; font-weight:600; cursor: pointer; outline: none;">
                                ${zoneOptions}
                            </select>
                        </div>
                    </div>
                    
                    <!-- Date Selector Bar -->
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Date Selector</label>
                        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-variant); padding: 4px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                            <!-- Previous Day Button -->
                            <button type="button" class="btn btn-secondary" id="btn-prev-day" style="padding: 10px; display: flex; align-items: center; justify-content: center; min-width: 44px; border: none; background: transparent; box-shadow: none; cursor: pointer; border-radius: var(--radius-xs);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" stroke-width="2.5" style="width:16px; height:16px;"><polyline points="15 18 9 12 15 6"/></svg>
                            </button>
                            
                            <!-- Clickable Date Indicator with Hidden Calendar Input -->
                            <div style="position: relative; display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-xs); border: 1px solid var(--border-color); background: var(--surface-color); cursor: pointer; min-width: 170px; justify-content: center; box-shadow: var(--card-shadow);">
                                <span id="lbl-active-date" style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-align: center;">${activeDateStr}</span>
                                <input type="date" id="prayer-date-picker" value="${dateISO}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" style="width:14px; height:14px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            </div>
                            
                            <!-- Next Day Button -->
                            <button type="button" class="btn btn-secondary" id="btn-next-day" style="padding: 10px; display: flex; align-items: center; justify-content: center; min-width: 44px; border: none; background: transparent; box-shadow: none; cursor: pointer; border-radius: var(--radius-xs);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" stroke-width="2.5" style="width:16px; height:16px;"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Compass Link -->
                    <button class="btn btn-primary" onclick="location.hash='#/qibla'" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 10px 0; margin-top: 4px; border-radius: var(--radius-sm);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 16px; height: 16px;"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                        Qibla Compass
                    </button>
                </div>

                <!-- Hijri and Gregorian Title -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 id="prayer-hijri-date" style="font-family:var(--font-heading); color:var(--primary);">-- Hijri Date --</h3>
                    <p id="prayer-greg-date" style="font-size:13px; color:var(--text-secondary); margin-top:4px;">-- Gregorian Date --</p>
                </div>

                <!-- Times Grid -->
                <div class="assignments-grid" id="prayer-times-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px;">
                    <!-- Prayer time cards rendered here -->
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('prayer-page');
            if (page) page.classList.add('active');
        }, 50);

        this.bindEvents();
        await this.loadPrayerTimes();
    },

    async loadPrayerTimes() {
        const zone = this.selectedZone;
        const year = this.selectedDate.getFullYear();
        const month = this.selectedDate.getMonth() + 1; // 1-indexed

        const cacheKey = `${zone}-${year}-${month}`;
        let monthTimes = this.cache[cacheKey];

        const grid = document.getElementById('prayer-times-grid');
        grid.innerHTML = `
            <div style="grid-column: span 4; text-align: center; padding: 40px 0; color: var(--text-secondary);">
                <div class="skeleton-text skeleton" style="width: 40%; margin: 10px auto;"></div>
                <div class="skeleton-text skeleton" style="width: 25%; margin: 10px auto;"></div>
            </div>
        `;

        try {
            if (!monthTimes) {
                const response = await fetch(`https://api.waktusolat.app/v2/solat/${zone}?year=${year}&month=${month}`);
                if (!response.ok) {
                    throw new Error("Failed to contact prayer times server.");
                }
                const data = await response.json();
                
                if (data && data.prayers) {
                    monthTimes = data.prayers;
                    this.cache[cacheKey] = monthTimes; // Save to cache
                } else {
                    throw new Error("Invalid response format.");
                }
            }

            // Find matching day by number (1-31)
            const dayNum = this.selectedDate.getDate();
            const todayData = monthTimes.find(t => t.day === dayNum);

            if (todayData) {
                this.renderTimes(todayData);
            } else {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: span 4; padding: 40px 16px;">
                        <h5>Data not available</h5>
                        <p>No prayer times found for day of month: ${dayNum}</p>
                    </div>
                `;
            }
        } catch (e) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: span 4; padding: 40px 16px;">
                    <h5>Connection Error</h5>
                    <p>${e.message}</p>
                    <button class="btn btn-primary" style="margin-top: 10px;" onclick="PrayerPage.loadPrayerTimes()">Try Again</button>
                </div>
            `;
        }
    },

    renderTimes(dayData) {
        // Display Gregorian Date
        const optionGreg = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        document.getElementById('prayer-greg-date').textContent = this.selectedDate.toLocaleDateString('en-US', optionGreg);
        
        // Display Hijri Date
        // Format from API: "hijri": "1448-01-15" (YYYY-MM-DD)
        const hijriParts = dayData.hijri.split('-');
        let hijriStr = dayData.hijri;
        if (hijriParts.length === 3) {
            const hYear = hijriParts[0];
            const hMonth = parseInt(hijriParts[1], 10);
            const hDay = parseInt(hijriParts[2], 10);

            const hijriMonths = [
                "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
                "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
                "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
            ];
            
            const monthName = hijriMonths[hMonth - 1] || 'Month';
            hijriStr = `${hDay} ${monthName} ${hYear} AH`;
        }
        document.getElementById('prayer-hijri-date').textContent = hijriStr;

        // Render Times Grid (imsak, fajr, syuruk, dhuhr, asr, maghrib, isha)
        const prayers = [
            { key: 'imsak', label: 'Imsak', color: 'var(--text-tertiary)' },
            { key: 'fajr', label: 'Fajr', color: '#4dabf7' },
            { key: 'syuruk', label: 'Sunrise', color: '#ffd43b' },
            { key: 'dhuhr', label: 'Dhuhr', color: '#51cf66' },
            { key: 'asr', label: 'Asr', color: '#f783ac' },
            { key: 'maghrib', label: 'Maghrib', color: '#ff6b6b' },
            { key: 'isha', label: 'Isha', color: '#845ef7' }
        ];

        const grid = document.getElementById('prayer-times-grid');
        grid.innerHTML = prayers.map(p => {
            const rawTimestamp = dayData[p.key]; // Unix timestamp in seconds
            const pDate = new Date(rawTimestamp * 1000);
            const formatted = pDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const isPassed = new Date() > pDate;
            const passedStyle = isPassed ? 'opacity: 0.6; filter: grayscale(20%);' : '';

            return `
                <div class="card ripple-container" style="padding:16px; display:flex; flex-direction:column; align-items:center; text-align:center; border-top: 4px solid ${p.color}; ${passedStyle}">
                    <div style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">${p.label}</div>
                    <div style="font-size:18px; font-weight:800; font-family:var(--font-heading); margin-top:8px; color:var(--text-primary);">${formatted}</div>
                </div>
            `;
        }).join('');

        // Pre-schedule next 7 days of prayer notifications
        const cacheKey = `${this.selectedZone}-${this.selectedDate.getFullYear()}-${this.selectedDate.getMonth() + 1}`;
        const monthTimes = this.cache[cacheKey];
        if (monthTimes) {
            this.scheduleWeekPrayerNotifications(monthTimes);
        }
    },

    async scheduleWeekPrayerNotifications(monthTimes) {
        const prayersToNotify = [
            { key: 'fajr', label: 'Fajr' },
            { key: 'dhuhr', label: 'Dhuhr' },
            { key: 'asr', label: 'Asr' },
            { key: 'maghrib', label: 'Maghrib' },
            { key: 'isha', label: 'Isha' }
        ];

        const nowMS = Date.now();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Collect the next 7 days (today + 6 more)
        const targetDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            targetDays.push(d.getDate()); // day-of-month numbers
        }

        // Filter month data to only those 7 days
        const weekData = monthTimes.filter(t => targetDays.includes(t.day));

        for (const dayData of weekData) {
            for (const p of prayersToNotify) {
                const rawTimestamp = dayData[p.key]; // Unix timestamp in seconds
                if (!rawTimestamp) continue;

                const triggerTimeMS = rawTimestamp * 1000;
                if (triggerTimeMS <= nowMS) continue; // Skip past prayers

                const trigDate = new Date(triggerTimeMS);
                trigDate.setMinutes(trigDate.getMinutes() - trigDate.getTimezoneOffset());
                const notifTimeStr = trigDate.toISOString().replace('T', ' ').slice(0, 19);

                try {
                    // Skip if already scheduled (avoid duplicates)
                    const exist = await API.query(
                        "SELECT id FROM notifications WHERE type = 'prayer' AND scheduled_time = ?",
                        [notifTimeStr]
                    );

                    if (exist.length === 0) {
                        await API.execute(
                            "INSERT INTO notifications (title, body, type, scheduled_time, sent) VALUES (?, ?, 'prayer', ?, 0)",
                            [
                                `Prayer Time: ${p.label}`,
                                `It is now time for ${p.label} in ${this.selectedZone}.`,
                                notifTimeStr
                            ]
                        );
                        console.log(`Scheduled prayer notification: ${p.label} at ${notifTimeStr}`);
                    }
                } catch (err) {
                    console.error("Failed to schedule prayer notification:", err);
                }
            }
        }
    },

    bindEvents() {
        const zoneSelect = document.getElementById('prayer-zone-select');
        if (zoneSelect) {
            zoneSelect.addEventListener('change', async (e) => {
                this.selectedZone = e.target.value;
                try {
                    await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('prayer_zone', ?)", [this.selectedZone]);
                    // Delete old unsent prayer warnings so they don't trigger at the wrong times
                    await API.execute("DELETE FROM notifications WHERE type = 'prayer' AND sent = 0");
                } catch (err) {
                    console.error("Failed to save prayer zone to DB settings:", err);
                }
                this.loadPrayerTimes();
            });
        }

        // Previous Day
        const btnPrev = document.getElementById('btn-prev-day');
        if (btnPrev) {
            btnPrev.addEventListener('click', async () => {
                this.selectedDate.setDate(this.selectedDate.getDate() - 1);
                this.updateDateUI();
                await this.loadPrayerTimes();
            });
        }

        // Next Day
        const btnNext = document.getElementById('btn-next-day');
        if (btnNext) {
            btnNext.addEventListener('click', async () => {
                this.selectedDate.setDate(this.selectedDate.getDate() + 1);
                this.updateDateUI();
                await this.loadPrayerTimes();
            });
        }

        // Hidden calendar picker
        const datePicker = document.getElementById('prayer-date-picker');
        if (datePicker) {
            datePicker.addEventListener('change', async (e) => {
                if (e.target.value) {
                    this.selectedDate = new Date(e.target.value);
                    this.updateDateUI();
                    await this.loadPrayerTimes();
                }
            });
        }
    },

    updateDateUI() {
        const dateISO = this.selectedDate.toISOString().split('T')[0];
        const datePicker = document.getElementById('prayer-date-picker');
        if (datePicker) datePicker.value = dateISO;

        const dateLabel = document.getElementById('lbl-active-date');
        if (dateLabel) {
            const today = new Date();
            const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
            
            let prefix = '';
            if (isSameDay(this.selectedDate, today)) {
                prefix = 'Today, ';
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(today.getDate() + 1);
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);

                if (isSameDay(this.selectedDate, tomorrow)) {
                    prefix = 'Tomorrow, ';
                } else if (isSameDay(this.selectedDate, yesterday)) {
                    prefix = 'Yesterday, ';
                }
            }

            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            dateLabel.textContent = prefix + this.selectedDate.toLocaleDateString('en-US', options);
        }
    }
};

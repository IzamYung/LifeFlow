/* UniFlow */

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

    // Representative GPS Anchor Points for Malaysian JAKIM Prayer Zones
    zoneAnchors: {
        'WLY01': [[3.1390, 101.6869], [2.9264, 101.6964]],
        'WLY02': [[5.2831, 115.2308]],
        'SGR01': [[3.0738, 101.5183], [2.9935, 101.7874], [2.7456, 101.7072], [3.2450, 101.6500], [3.1073, 101.6067]],
        'SGR02': [[3.3500, 101.2500], [3.6667, 100.9833]],
        'SGR03': [[3.0449, 101.4456], [2.8167, 101.5000], [2.8000, 101.6000]],
        'JHR01': [[1.4927, 103.7414], [1.6667, 103.6000], [1.5000, 103.4000]],
        'JHR02': [[1.7381, 103.8999], [1.5667, 104.1333]],
        'JHR03': [[2.4312, 103.8405], [2.6000, 103.6500]],
        'JHR04': [[2.0442, 102.5689], [2.2667, 102.5333], [2.5167, 102.8167]],
        'JHR05': [[1.8548, 102.9325], [1.9000, 103.1333]],
        'JHR06': [[2.0251, 103.3328], [2.1667, 103.4000]],
        'KDH01': [[6.1248, 100.3678], [6.1667, 100.5167], [6.4333, 100.4333]],
        'KDH02': [[5.6436, 100.4884], [5.8000, 100.3667], [5.9833, 100.4667]],
        'KDH03': [[5.3649, 100.5618], [5.2000, 100.6000]],
        'KDH04': [[5.6764, 100.9169]],
        'KDH05': [[5.1374, 100.4939]],
        'KDH06': [[6.3500, 99.8000]],
        'KDH07': [[6.2500, 100.6667], [5.8167, 100.7500]],
        'KTN01': [[6.1254, 102.2386], [6.0667, 102.4000], [5.8333, 102.4000], [6.2000, 102.1667], [6.0500, 102.1333]],
        'KTN02': [[5.5333, 102.2000], [4.8823, 101.9686]],
        'MLK01': [[2.1896, 102.2501], [2.2833, 102.1500], [2.3500, 102.4000]],
        'NSD01': [[2.5228, 101.7959]],
        'NSD02': [[2.7258, 101.9424], [2.8000, 102.3000], [2.9000, 102.0667], [2.7333, 102.2500], [2.5833, 102.0833], [2.4667, 102.2333]],
        'PHG01': [[3.5221, 101.9085], [3.7833, 101.8667], [4.1833, 102.0500]],
        'PHG02': [[3.4496, 102.4175], [3.9333, 102.3667], [3.5833, 102.7667], [3.1833, 102.5333]],
        'PHG03': [[3.8077, 103.3260], [3.4833, 103.4000], [2.8167, 103.4833]],
        'PHG04': [[4.4707, 101.3764]],
        'PRK01': [[4.2000, 101.2667], [3.8333, 101.4000], [3.6800, 101.5200]],
        'PRK02': [[4.5975, 101.0901], [4.4667, 101.0333], [4.3000, 101.1500]],
        'PRK03': [[4.7758, 100.9416], [4.8167, 101.0667]],
        'PRK04': [[5.4292, 101.1272], [5.7000, 100.9833]],
        'PRK05': [[4.2000, 100.6667], [4.3500, 100.9333], [4.0259, 101.0197]],
        'PLS01': [[6.4449, 100.1986], [6.5000, 100.2667]],
        'PNG01': [[5.4164, 100.3327], [5.3667, 100.4500], [5.3000, 100.2833]],
        'SBH01': [[5.9804, 116.0735], [5.9167, 116.1167], [6.1833, 116.2333]],
        'SBH02': [[5.8402, 118.1179], [5.9000, 117.5500]],
        'SBH03': [[4.2446, 117.8912], [5.0333, 118.3333]],
        'SWK01': [[1.5535, 110.3592], [1.4167, 110.1500], [1.6667, 109.8500]],
        'SWK02': [[2.3000, 111.8167], [2.9000, 112.1000]],
        'SWK03': [[4.3995, 113.9914], [4.1833, 114.3333]],
        'TRG01': [[5.3117, 103.1324], [5.2000, 103.2000]],
        'TRG02': [[4.2333, 103.4167], [4.7667, 103.4167]],
        'TRG03': [[5.8333, 102.5500], [5.5500, 102.7333]]
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
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label for="prayer-zone-select" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Location / Zone</label>
                        </div>
                        <div style="display: flex; align-items: stretch; gap: 8px;">
                            <div style="position: relative; flex: 1; display: flex; align-items: center; min-width: 0;">
                                <span style="position: absolute; left: 12px; z-index: 2; color: var(--text-secondary); pointer-events: none; font-size: 15px; line-height: 1;">📍</span>
                                <select id="prayer-zone-select" style="width:100%; padding: 12px 14px 12px 38px !important; border-radius:var(--radius-sm); border:1px solid var(--border-color); background-color:var(--surface-color); color:var(--text-primary); font-size:13px; font-weight:600; cursor: pointer; outline: none; min-height: 44px; text-overflow: ellipsis;">
                                    ${zoneOptions}
                                </select>
                            </div>
                            <button id="btn-detect-gps" type="button" class="ripple-container" title="Detect current GPS location" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 14px; min-height: 44px; border-radius: var(--radius-sm); border: 1px solid var(--primary); background: var(--primary-container); color: var(--primary); font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all var(--transition-fast); flex-shrink: 0;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>
                                <span>Detect</span>
                            </button>
                        </div>
                        <div id="gps-detection-status" style="font-size: 11.5px; font-weight: 600; display: none; line-height: 1.4; padding: 4px 6px; border-radius: var(--radius-xs);"></div>
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
                                `It is now time for ${p.label} (${new Date(triggerTimeMS).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) in ${this.selectedZone}.`,
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

        // GPS Auto-detect Button
        const btnDetect = document.getElementById('btn-detect-gps');
        if (btnDetect) {
            btnDetect.addEventListener('click', () => this.detectLocation());
        }
    },

    findNearestZone(lat, lon) {
        let nearest = null;
        let minDist = Infinity;
        for (const [code, pts] of Object.entries(this.zoneAnchors)) {
            for (const [clat, clon] of pts) {
                const dLat = (clat - lat) * Math.PI / 180;
                const dLon = (clon - lon) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(clat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                if (dist < minDist) {
                    minDist = dist;
                    nearest = { code, dist: Math.round(dist) };
                }
            }
        }
        return nearest;
    },

    getZoneLabel(code) {
        for (const state in this.zones) {
            if (this.zones[state][code]) {
                return `${code} - ${this.zones[state][code]}`;
            }
        }
        return code;
    },

    async detectLocation() {
        const btn = document.getElementById('btn-detect-gps');
        const statusEl = document.getElementById('gps-detection-status');
        if (!navigator.geolocation) {
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.color = 'var(--error)';
                statusEl.innerHTML = '⚠️ Geolocation is not supported by your browser.';
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin" style="width:14px; height:14px;"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                <span>Detecting...</span>
            `;
        }
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.color = 'var(--text-secondary)';
            statusEl.innerHTML = '📡 Finding your GPS coordinates...';
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const nearest = this.findNearestZone(lat, lon);

                if (nearest) {
                    this.selectedZone = nearest.code;
                    const select = document.getElementById('prayer-zone-select');
                    if (select) select.value = nearest.code;

                    try {
                        await API.execute("INSERT OR REPLACE INTO settings (key_name, value_val) VALUES ('prayer_zone', ?)", [nearest.code]);
                        localStorage.setItem('uniflow_prayer_zone', nearest.code);
                        await API.execute("DELETE FROM notifications WHERE type = 'prayer' AND sent = 0");
                    } catch (e) {
                        console.warn("Error saving auto-detected prayer zone:", e);
                    }

                    if (statusEl) {
                        statusEl.style.color = 'var(--success)';
                        const label = this.getZoneLabel(nearest.code);
                        statusEl.innerHTML = `✅ Detected: <b>${label}</b> (~${nearest.dist} km)`;
                    }

                    await this.loadPrayerTimes();
                }

                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>
                        <span>Detect</span>
                    `;
                }
            },
            (error) => {
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>
                        <span>Detect</span>
                    `;
                }
                if (statusEl) {
                    statusEl.style.display = 'block';
                    statusEl.style.color = 'var(--error)';
                    let msg = 'Unable to detect location.';
                    if (error.code === 1) msg = 'Location access was denied. Please allow location access in your browser settings.';
                    else if (error.code === 2) msg = 'GPS location unavailable. Please check your device location settings.';
                    else if (error.code === 3) msg = 'Location request timed out. Please try again.';
                    statusEl.innerHTML = `⚠️ ${msg}`;
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
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

/* UniFlow */

const AttendancePage = {
    subjects: [],
    records: [],
    scheduleClasses: [],
    unmarkedSessions: [],
    filter: 'all', // 'all' | 'unmarked' | 'at-risk' | 'good'
    MIN_PCT: 80,

    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="attendance-page" style="display:flex; flex-direction:column; height:100%; overflow:hidden; padding-bottom:0;">
                <!-- Fixed Top Section (Header, Summary Card, Filter Tabs) -->
                <div style="flex-shrink:0;">
                    <!-- Header -->
                    <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; gap:8px;">
                        <div class="welcome-section" style="min-width:0;">
                            <h2>Attendance</h2>
                            <p>Track your class attendance</p>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                            <button class="btn btn-secondary" id="att-manage-btn" style="padding:8px 14px; font-size:13px; display:flex; align-items:center; gap:6px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                                Manage Subjects
                            </button>
                        </div>
                    </div>

                    <!-- Overall Summary Card -->
                    <div class="card" id="att-summary-card" style="padding:18px 16px; margin-bottom:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:12px; flex-shrink:0;">
                        <!-- Circular ring -->
                        <div style="position:relative; width:88px; height:88px; flex-shrink:0;">
                            <svg viewBox="0 0 36 36" style="width:88px;height:88px;transform:rotate(-90deg); display:block;">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-color)" stroke-width="3"/>
                                <circle id="att-overall-ring" cx="18" cy="18" r="15.9" fill="none" stroke="#8b5cf6" stroke-width="3"
                                    stroke-dasharray="100 100" stroke-dashoffset="0" stroke-linecap="round"
                                    style="transition:stroke-dasharray 0.6s ease;"/>
                            </svg>
                            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                                <span id="att-overall-pct" style="font-size:18px;font-weight:800;color:var(--text-primary);">--%</span>
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:center; text-align:center; width:100%;">
                            <div style="font-weight:800;font-size:15px;color:var(--text-primary);margin-bottom:4px;">Overall Attendance</div>
                            <div id="att-overall-status" style="font-size:12px;color:var(--text-secondary); display:flex; align-items:center; justify-content:center; gap:4px;">Loading...</div>
                            <div id="att-overall-counts" style="font-size:11px;color:var(--text-tertiary);margin-top:4px;"></div>
                        </div>
                    </div>

                    <!-- Filter Tabs with dedicated Unmarked Pill -->
                    <div style="display:flex; gap:8px; margin-bottom:12px; overflow-x:auto; padding-bottom:2px;" id="att-filter-tabs-bar">
                        <button class="att-filter-btn active" data-filter="all"
                            style="padding:7px 15px;border-radius:20px;border:1px solid var(--primary);background:var(--primary);color:#fff;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;">
                            All Subjects
                        </button>
                        <button class="att-filter-btn" id="att-unmarked-filter-btn" data-filter="unmarked"
                            style="display:none; padding:7px 14px;border-radius:20px;border:1px solid rgba(139,92,246,0.5);background:rgba(139,92,246,0.12);color:var(--primary);font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;">
                            ⚡ Unmarked (0)
                        </button>
                        <button class="att-filter-btn" data-filter="at-risk"
                            style="padding:7px 15px;border-radius:20px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;">
                            ⚠️ At Risk
                        </button>
                        <button class="att-filter-btn" data-filter="good"
                            style="padding:7px 15px;border-radius:20px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;">
                            ✅ Good
                        </button>
                    </div>
                </div>

                <!-- Scrollable Subject List & Views -->
                <div id="att-subject-list" style="flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:12px; padding-bottom:calc(var(--bottom-nav-height) + 30px); min-height:0;">
                    <!-- Rendered dynamically -->
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('attendance-page');
            if (page) page.classList.add('active');
        }, 50);

        await this.loadData();
        this.bindEvents();
    },

    async loadData() {
        try {
            this.subjects = await API.query('SELECT * FROM attendance_subjects ORDER BY name ASC');
            this.records  = await API.query('SELECT * FROM attendance_records ORDER BY date DESC, id DESC');
            this.scheduleClasses = await API.query("SELECT * FROM schedule WHERE type = 'class' ORDER BY start_time ASC");
        } catch (err) {
            console.error('Attendance load failed:', err);
            this.subjects = [];
            this.records  = [];
            this.scheduleClasses = [];
        }

        this.computeUnmarkedSessions();
        this.updateFilterPillBadge();
        this.renderSummary();
        this.renderSubjects();
    },

    // ── Compute Unmarked Sessions from Past Timetable Schedule ───────────────
    computeUnmarkedSessions() {
        if (!this.subjects || this.subjects.length === 0 || !this.scheduleClasses || this.scheduleClasses.length === 0) {
            this.unmarkedSessions = [];
            return;
        }

        const now = new Date();
        const sessions = [];

        this.scheduleClasses.forEach(sched => {
            if (!sched.start_time) return;
            const startDT = new Date(sched.start_time.replace(' ', 'T'));
            if (isNaN(startDT.getTime())) return;

            // Only include past or currently active class sessions (start_time <= now)
            if (startDT > now) return;

            // Match subject by name
            const schedTitle = (sched.title || '').trim().toLowerCase();
            const matchedSubj = this.subjects.find(s => {
                const sName = s.name.trim().toLowerCase();
                return sName === schedTitle || schedTitle.includes(sName) || sName.includes(schedTitle);
            });

            if (!matchedSubj) return;

            const dateISO = sched.start_time.slice(0, 10);

            // Check if already marked for this subject on this date
            const isMarked = this.records.some(r => {
                if (r.subject_id !== matchedSubj.id) return false;
                if (r.date === dateISO || r.date.startsWith(dateISO)) return true;
                return false;
            });

            if (!isMarked) {
                let timeStr = '';
                let durationHrs = 2.0;
                try {
                    const endDT = new Date((sched.end_time || '').replace(' ', 'T'));
                    const sTime = startDT.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const eTime = !isNaN(endDT.getTime()) ? endDT.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    timeStr = eTime ? `${sTime} - ${eTime}` : sTime;
                    if (!isNaN(endDT.getTime()) && endDT > startDT) {
                        durationHrs = Math.max(0.5, Math.round(((endDT - startDT) / 3600000) * 100) / 100);
                    }
                } catch (e) {
                    timeStr = sched.start_time.slice(11, 16);
                }

                // Relative date text
                const todayStr = now.toISOString().slice(0, 10);
                const yesterday = new Date(now.getTime() - 86400000);
                const yesterdayStr = yesterday.toISOString().slice(0, 10);

                let dateLabel = '';
                if (dateISO === todayStr) {
                    dateLabel = 'Today';
                } else if (dateISO === yesterdayStr) {
                    dateLabel = 'Yesterday';
                } else {
                    dateLabel = startDT.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                }

                sessions.push({
                    scheduleId: sched.id,
                    subjectId: matchedSubj.id,
                    subjectName: matchedSubj.name,
                    subjectColor: matchedSubj.color || '#8b5cf6',
                    dateISO,
                    dateLabel,
                    timeStr,
                    durationHrs,
                    location: sched.location || '',
                    rawStartTime: startDT.getTime()
                });
            }
        });

        // Sort descending (most recent first)
        sessions.sort((a, b) => b.rawStartTime - a.rawStartTime);
        this.unmarkedSessions = sessions;
    },

    updateFilterPillBadge() {
        const btn = document.getElementById('att-unmarked-filter-btn');
        if (!btn) return;
        const count = this.unmarkedSessions.length;
        if (count > 0) {
            btn.style.display = 'inline-flex';
            btn.textContent = `⚡ Unmarked (${count})`;
        } else {
            btn.style.display = 'none';
            if (this.filter === 'unmarked') {
                this.filter = 'all';
                document.querySelectorAll('.att-filter-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.color = 'var(--text-secondary)';
                    b.style.borderColor = 'var(--border-color)';
                });
                const allBtn = document.querySelector('.att-filter-btn[data-filter="all"]');
                if (allBtn) {
                    allBtn.classList.add('active');
                    allBtn.style.background = 'var(--primary)';
                    allBtn.style.color = '#ffffff';
                    allBtn.style.borderColor = 'var(--primary)';
                }
            }
        }
    },

    // ── Stats helpers with Exact Contact Hours Weighting ────────────────────
    getStats(subjectId) {
        const recs = this.records.filter(r => r.subject_id === subjectId);
        const total = recs.length;
        if (total === 0) return { total: 0, attended: 0, absent: 0, pct: null };

        let earnedUnits = 0;
        let attendedCount = 0;
        let absentCount = 0;

        recs.forEach(r => {
            if (r.status === 'present') {
                earnedUnits += 1.0;
                attendedCount++;
            } else if (r.status === 'late') {
                attendedCount++;
                // Check if note has exact hours (e.g. Attended 1.50/2.00 hrs)
                const match = (r.note || '').match(/Attended\s+([\d.]+)\/([\d.]+)\s*hrs/i);
                if (match) {
                    const attendedHrs = parseFloat(match[1]);
                    const totalHrs = parseFloat(match[2]);
                    if (totalHrs > 0) {
                        earnedUnits += Math.min(1.0, attendedHrs / totalHrs);
                    } else {
                        earnedUnits += 0.75;
                    }
                } else {
                    earnedUnits += 0.75; // Standard 75% for late
                }
            } else if (r.status === 'absent') {
                absentCount++;
            }
        });

        const pct = Math.round((earnedUnits / total) * 100);
        return { total, attended: attendedCount, absent: absentCount, pct };
    },

    // ── Overall summary ────────────────────────────────────────────────────
    renderSummary() {
        const ring    = document.getElementById('att-overall-ring');
        const pctEl   = document.getElementById('att-overall-pct');
        const statEl  = document.getElementById('att-overall-status');
        const countEl = document.getElementById('att-overall-counts');
        if (!ring || !pctEl) return;

        if (this.subjects.length === 0) {
            pctEl.textContent   = '--%';
            statEl.textContent  = 'No subjects added yet.';
            countEl.textContent = '';
            ring.setAttribute('stroke-dasharray', '0 100');
            return;
        }

        const allTotal = this.records.length;
        let allEarned = 0;
        let allAttended = 0;

        this.records.forEach(r => {
            if (r.status === 'present') {
                allEarned += 1.0;
                allAttended++;
            } else if (r.status === 'late') {
                allAttended++;
                const match = (r.note || '').match(/Attended\s+([\d.]+)\/([\d.]+)\s*hrs/i);
                if (match) {
                    const attendedHrs = parseFloat(match[1]);
                    const totalHrs = parseFloat(match[2]);
                    if (totalHrs > 0) {
                        allEarned += Math.min(1.0, attendedHrs / totalHrs);
                    } else {
                        allEarned += 0.75;
                    }
                } else {
                    allEarned += 0.75;
                }
            }
        });

        const overallPct = allTotal > 0 ? Math.round((allEarned / allTotal) * 100) : null;

        if (overallPct === null) {
            pctEl.textContent   = '--%';
            statEl.innerHTML    = '<span style="color:var(--text-tertiary);">No records yet — start marking!</span>';
            countEl.textContent = '';
            ring.setAttribute('stroke-dasharray', '0 100');
            return;
        }

        const isAtRisk = overallPct < this.MIN_PCT;
        pctEl.textContent   = overallPct + '%';
        ring.setAttribute('stroke', isAtRisk ? '#f59f00' : '#8b5cf6');
        ring.setAttribute('stroke-dasharray', `${overallPct} 100`);

        statEl.innerHTML = isAtRisk
            ? `<span style="color:#f59f00;font-weight:700;">⚠️ Below ${this.MIN_PCT}% — attendance at risk!</span>`
            : `<span style="color:#10b981;font-weight:700;">✅ Good standing</span>`;

        countEl.textContent = `${allAttended} attended · ${allTotal - allAttended} absent · ${allTotal} total classes`;
    },

    // ── Render Subjects & Views ─────────────────────────────────────────────
    renderSubjects() {
        const list = document.getElementById('att-subject-list');
        if (!list) return;

        let html = '';

        // If Unmarked filter is selected: Render Unmarked Queue View
        if (this.filter === 'unmarked') {
            if (this.unmarkedSessions.length === 0) {
                list.innerHTML = `
                    <div class="empty-state" style="padding:50px 16px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:48px;height:48px;opacity:0.5;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        <h5>All Classes Marked! 🎉</h5>
                        <p>You have no pending unmarked class sessions.</p>
                    </div>
                `;
                return;
            }
            list.innerHTML = this._unmarkedSessionsHTML();
            return;
        }

        let filtered = this.subjects;
        if (this.filter === 'at-risk') {
            filtered = this.subjects.filter(s => {
                const { pct } = this.getStats(s.id);
                return pct !== null && pct < this.MIN_PCT;
            });
        } else if (this.filter === 'good') {
            filtered = this.subjects.filter(s => {
                const { pct } = this.getStats(s.id);
                return pct !== null && pct >= this.MIN_PCT;
            });
        }

        if (filtered.length === 0) {
            html += `
                <div class="empty-state" style="padding:50px 16px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:48px;height:48px;opacity:0.5;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    <h5>${this.subjects.length === 0 ? 'No subjects yet' : 'No subjects in this category'}</h5>
                    <p>${this.subjects.length === 0 ? 'Tap Manage to add your subjects.' : 'Try a different filter.'}</p>
                </div>
            `;
        } else {
            html += filtered.map(s => this._subjectCardHTML(s)).join('');
        }

        list.innerHTML = html;

        // Bind card taps for history
        list.querySelectorAll('.att-subject-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id);
                const subj = this.subjects.find(s => s.id === id);
                if (subj) this.showSubjectHistory(subj);
            });
        });
    },

    // ── Unmarked Sessions Page HTML ────────────────────────────────────────
    _unmarkedSessionsHTML() {
        const count = this.unmarkedSessions.length;
        const sessionRows = this.unmarkedSessions.map((s, idx) => `
            <div style="padding:12px 14px; background:var(--surface-color); border-radius:var(--radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:10px; box-shadow:var(--shadow-sm);">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                        <div style="width:12px; height:12px; border-radius:50%; background:${s.subjectColor}; flex-shrink:0;"></div>
                        <span style="font-size:14px; font-weight:800; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.subjectName}</span>
                    </div>
                    <span style="font-size:11px; font-weight:700; color:var(--primary); background:rgba(var(--primary-rgb),0.1); padding:3px 10px; border-radius:12px; flex-shrink:0;">${s.dateLabel}</span>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                    <div style="font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:4px;">
                        <span>⏰ ${s.timeStr} (${s.durationHrs.toFixed(2)} hrs)</span>
                        ${s.location ? `<span style="color:var(--text-tertiary);">• 📍 ${s.location}</span>` : ''}
                    </div>
                    <div style="display:flex; gap:6px; margin-left:auto;">
                        <button onclick="AttendancePage.quickMark(${s.subjectId}, '${s.dateISO}', 'present', '${s.timeStr}', '${s.location}')"
                            style="background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;">
                            ✅ Present
                        </button>
                        <button onclick="AttendancePage.showLateHoursModal(${s.subjectId}, '${s.subjectName.replace(/'/g, "\\'")}', '${s.subjectColor}', '${s.dateISO}', '${s.dateLabel}', '${s.timeStr}', '${s.location || ''}', ${s.durationHrs})"
                            style="background:rgba(245,159,0,0.12); color:#f59f00; border:1px solid rgba(245,159,0,0.3); border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;">
                            🕐 Late
                        </button>
                        <button onclick="AttendancePage.quickMark(${s.subjectId}, '${s.dateISO}', 'absent', '${s.timeStr}', '${s.location}')"
                            style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;">
                            ❌ Absent
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 2px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:16px;">⚡</span>
                        <span style="font-size:14px; font-weight:800; color:var(--text-primary);">Pending Classes (${count})</span>
                    </div>
                    <button onclick="AttendancePage.markAllPendingPresent()"
                        style="background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:#fff; border:none; border-radius:8px; padding:7px 14px; font-size:12px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(139,92,246,0.3);">
                        ✅ Mark All as Present
                    </button>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${sessionRows}
                </div>
            </div>
        `;
    },

    // ── Quick Mark Single Session ───────────────────────────────────────────
    async quickMark(subjectId, dateISO, status, timeStr = '', location = '') {
        try {
            const note = timeStr ? `${timeStr}${location ? ' • ' + location : ''}` : null;
            await API.execute(
                'INSERT INTO attendance_records (subject_id, date, status, note) VALUES (?, ?, ?, ?)',
                [subjectId, dateISO, status, note]
            );
            await this.loadData();
        } catch (err) {
            alert('Failed to save record: ' + err.message);
        }
    },

    // ── Batch Mark All Pending Sessions as Present ──────────────────────────
    async markAllPendingPresent() {
        if (!this.unmarkedSessions || this.unmarkedSessions.length === 0) return;
        try {
            for (const s of this.unmarkedSessions) {
                const note = s.timeStr ? `${s.timeStr}${s.location ? ' • ' + s.location : ''}` : null;
                await API.execute(
                    'INSERT INTO attendance_records (subject_id, date, status, note) VALUES (?, ?, ?, ?)',
                    [s.subjectId, s.dateISO, 'present', note]
                );
            }
            await this.loadData();
        } catch (err) {
            alert('Failed to mark all sessions: ' + err.message);
        }
    },

    // ── TnG-Style 0.00 Keypad Modal for Late / Hours Attended ────────────────
    showLateHoursModal(subjectId, subjectName, subjectColor, dateISO, dateLabel, timeStr, location = '', maxHours = 2.0, isTransition = false) {
        let cents = Math.round(maxHours * 75); // Default to 75% of class
        const maxCents = Math.round(maxHours * 100);

        const html = `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <!-- Header Info -->
                <div style="text-align:center;">
                    <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(var(--primary-rgb),0.1); padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; color:var(--primary);">
                        <span style="width:8px; height:8px; border-radius:50%; background:${subjectColor};"></span>
                        ${subjectName}
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                        ${dateLabel} • ⏰ ${timeStr} (Duration: ${maxHours.toFixed(2)} hrs)
                    </div>
                </div>

                <!-- Big Interactive TnG Hours Display (Triggers Native Mobile Number Keyboard) -->
                <div id="tng-screen-box"
                    style="background:var(--surface-variant); border:1.5px solid var(--border-color); border-radius:var(--radius-md); padding:16px 14px; text-align:center; cursor:text; transition:border-color 0.2s ease;">
                    <div style="font-size:11px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">HOURS ATTENDED</div>
                    <div style="display:flex; align-items:baseline; justify-content:center; gap:6px; margin:4px 0;">
                        <input type="text" inputmode="numeric" id="tng-native-input" value="1.50" autocomplete="off"
                            style="width:140px; text-align:center; font-size:36px; font-weight:900; font-family:var(--font-heading); color:var(--primary); background:transparent; border:none; outline:none; letter-spacing:-1px; padding:0; margin:0;">
                        <span style="font-size:15px; font-weight:700; color:var(--text-secondary);">HRS</span>
                    </div>
                    <div id="tng-pct-info" style="font-size:12px; font-weight:700; color:#f59f00; margin-top:2px;">
                        75% of ${maxHours.toFixed(2)} hrs class
                    </div>
                </div>

                <!-- Note / Reason Input (Opens Normal Alphabetic Keyboard) -->
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:12px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Reason / Note (Optional)</label>
                    <input type="text" id="tng-reason-input" placeholder="e.g. Late 30 mins (Meeting / Traffic)..." autocomplete="off"
                        style="font-size:13px; padding:11px 12px; width:100%; box-sizing:border-box; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--surface-color); color:var(--text-primary);">
                </div>

                <!-- Action Buttons -->
                <div style="display:flex; gap:10px; margin-top:6px;">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()" style="flex:1; padding:12px 0;">Cancel</button>
                    <button type="button" id="tng-confirm-btn" class="btn btn-primary"
                        style="flex:2; padding:12px 0; font-size:13.5px; font-weight:800; background:linear-gradient(135deg,#f59f00,#e67700); border:none; box-shadow:0 4px 12px rgba(245,159,0,0.3);">
                        🕐 Confirm Late (1.50 hrs)
                    </button>
                </div>
            </div>
        `;

        const bindHandler = (container) => {
            const screenBox   = container.querySelector('#tng-screen-box');
            const nativeInput = container.querySelector('#tng-native-input');
            const pctInfoEl   = container.querySelector('#tng-pct-info');
            const confirmBtn  = container.querySelector('#tng-confirm-btn');
            const reasonInput = container.querySelector('#tng-reason-input');

            const updateUI = () => {
                const hoursStr = (cents / 100).toFixed(2);
                nativeInput.value = hoursStr;
                const pct = maxCents > 0 ? Math.round((cents / maxCents) * 100) : 0;
                pctInfoEl.textContent = `${pct}% of ${maxHours.toFixed(2)} hrs class (${hoursStr} / ${maxHours.toFixed(2)} hrs)`;
                confirmBtn.textContent = `🕐 Confirm Late (${hoursStr} hrs)`;
            };

            updateUI();

            // Focus on screen box click
            screenBox.addEventListener('click', () => {
                nativeInput.focus();
            });

            nativeInput.addEventListener('focus', () => {
                screenBox.style.borderColor = 'var(--primary)';
                screenBox.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb),0.15)';
            });

            nativeInput.addEventListener('blur', () => {
                screenBox.style.borderColor = 'var(--border-color)';
                screenBox.style.boxShadow = 'none';
            });

            // Handle typing on mobile number keyboard (TnG stacking from right)
            nativeInput.addEventListener('input', (e) => {
                const rawDigits = nativeInput.value.replace(/\D/g, '');
                let num = parseInt(rawDigits, 10);
                if (isNaN(num)) num = 0;
                cents = Math.min(num, maxCents);
                updateUI();
            });

            nativeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    e.preventDefault();
                    cents = Math.floor(cents / 10);
                    updateUI();
                }
            });

            // Confirm submit
            confirmBtn.addEventListener('click', async () => {
                const hours = (cents / 100).toFixed(2);
                const reason = reasonInput.value.trim();
                const note = `Attended ${hours}/${maxHours.toFixed(2)} hrs${reason ? ' • ' + reason : ''}${timeStr ? ' • ' + timeStr : ''}${location ? ' • ' + location : ''}`;

                try {
                    await API.execute(
                        'INSERT INTO attendance_records (subject_id, date, status, note) VALUES (?, ?, ?, ?)',
                        [subjectId, dateISO, 'late', note]
                    );
                    Modal.close();
                    await this.loadData();
                } catch (err) {
                    alert('Save failed: ' + err.message);
                }
            });
        };

        if (isTransition) {
            Modal.transitionTo('Late Attendance Hours', html, bindHandler);
        } else {
            Modal.open('Late Attendance Hours', html, bindHandler);
        }
    },

    _subjectCardHTML(subj) {
        const { total, attended, absent, pct } = this.getStats(subj.id);
        const color  = subj.color || '#8b5cf6';
        const isGood = pct !== null && pct >= this.MIN_PCT;
        const isRisk = pct !== null && pct < this.MIN_PCT;
        const ringPct  = pct !== null ? pct : 0;
        const ringColor = isRisk ? '#f59f00' : isGood ? '#10b981' : '#8b5cf6';
        const badge = pct === null ? '' : isGood
            ? `<span style="position:absolute;top:8px;right:8px;background:rgba(16,185,129,0.15);color:#10b981;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">✓</span>`
            : `<span style="position:absolute;top:8px;right:8px;background:rgba(245,159,0,0.15);color:#f59f00;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">!</span>`;

        const pctLabel = pct !== null ? pct + '%' : '--';
        const sub = total > 0 ? `${attended} / ${total} classes attended` : 'No records yet';

        return `
            <div class="card att-subject-card ripple-container" data-id="${subj.id}"
                style="padding:14px 16px 12px 16px; cursor:pointer; position:relative; overflow:hidden; border-left:4px solid ${color}; flex-shrink:0; min-height:84px; box-sizing:border-box; width:100%;">
                ${badge}
                <div style="display:flex; align-items:center; gap:14px;">
                    <!-- Mini ring -->
                    <div style="position:relative; width:54px; height:54px; flex-shrink:0;">
                        <svg viewBox="0 0 36 36" style="width:54px; height:54px; transform:rotate(-90deg); display:block;">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-color)" stroke-width="3.2"/>
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="${ringColor}" stroke-width="3.2"
                                stroke-dasharray="${ringPct} 100" stroke-linecap="round"/>
                        </svg>
                        <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                            <span style="font-size:11px; font-weight:800; color:var(--text-primary);">${pctLabel}</span>
                        </div>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:700; font-size:14px; color:var(--text-primary); margin-bottom:2px; word-break:break-word;">${subj.name}</div>
                        <div style="font-size:12px; color:var(--text-secondary);">${sub}</div>
                        ${pct !== null && pct < this.MIN_PCT ? `<div style="font-size:11px; color:#f59f00; margin-top:2px; font-weight:600;">Need ${Math.ceil((this.MIN_PCT / 100 * total - attended) / (1 - this.MIN_PCT / 100))} more classes for ${this.MIN_PCT}%</div>` : ''}
                    </div>
                </div>
                <!-- Progress bar -->
                <div style="margin-top:10px; height:4px; background:var(--border-color); border-radius:2px; overflow:hidden;">
                    <div style="height:100%; width:${ringPct}%; background:${ringColor}; border-radius:2px; transition:width 0.5s ease;"></div>
                </div>
            </div>
        `;
    },

    // ── Subject History Modal ──────────────────────────────────────────────
    showSubjectHistory(subj) {
        const recs = this.records.filter(r => r.subject_id === subj.id);
        const { total, attended, absent, pct } = this.getStats(subj.id);

        const statusIcon  = { present: '✅', late: '🕐', absent: '❌' };
        const statusColor = { present: '#10b981', late: '#f59f00', absent: '#ef4444' };
        const statusLabel = { present: 'Present', late: 'Late', absent: 'Absent' };

        // Pending unmarked sessions for this specific subject
        const pendingForSubj = this.unmarkedSessions.filter(s => s.subjectId === subj.id);
        let pendingHTML = '';
        if (pendingForSubj.length > 0) {
            pendingHTML = `
                <div style="background:rgba(139,92,246,0.08); border:1px dashed var(--primary); border-radius:var(--radius-sm); padding:10px; display:flex; flex-direction:column; gap:8px;">
                    <div style="font-size:11.5px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">⚡ Pending Unmarked Sessions (${pendingForSubj.length})</div>
                    ${pendingForSubj.map(s => `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; background:var(--surface-color); padding:8px 10px; border-radius:var(--radius-xs); border:1px solid var(--border-color);">
                            <div style="min-width:0;">
                                <div style="font-size:12px; font-weight:700; color:var(--text-primary);">${s.dateLabel} • ${s.timeStr}</div>
                                ${s.location ? `<div style="font-size:11px; color:var(--text-tertiary);">📍 ${s.location}</div>` : ''}
                            </div>
                            <div style="display:flex; gap:4px; flex-shrink:0;">
                                <button onclick="AttendancePage.quickMark(${s.subjectId}, '${s.dateISO}', 'present', '${s.timeStr}', '${s.location}'); Modal.close();"
                                    style="background:rgba(16,185,129,0.15); color:#10b981; border:none; border-radius:4px; padding:3px 7px; font-size:10.5px; font-weight:700; cursor:pointer;">✅</button>
                                <button onclick="AttendancePage.showLateHoursModal(${s.subjectId}, '${s.subjectName.replace(/'/g, "\\'")}', '${s.subjectColor}', '${s.dateISO}', '${s.dateLabel}', '${s.timeStr}', '${s.location || ''}', ${s.durationHrs}, true);"
                                    style="background:rgba(245,159,0,0.15); color:#f59f00; border:none; border-radius:4px; padding:3px 7px; font-size:10.5px; font-weight:700; cursor:pointer;">🕐</button>
                                <button onclick="AttendancePage.quickMark(${s.subjectId}, '${s.dateISO}', 'absent', '${s.timeStr}', '${s.location}'); Modal.close();"
                                    style="background:rgba(239,68,68,0.15); color:#ef4444; border:none; border-radius:4px; padding:3px 7px; font-size:10.5px; font-weight:700; cursor:pointer;">❌</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const histHTML = recs.length === 0
            ? '<div style="text-align:center;padding:24px 0;color:var(--text-tertiary);font-size:13px;">No records yet for this subject.</div>'
            : recs.map(r => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${r.date}</div>
                        ${r.note ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">${r.note}</div>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:12px;font-weight:700;color:${statusColor[r.status]};">
                            ${statusIcon[r.status]} ${statusLabel[r.status]}
                        </span>
                        <button onclick="AttendancePage.deleteRecord(${r.id})"
                            style="background:rgba(239,68,68,0.1);border:none;border-radius:6px;padding:4px 7px;cursor:pointer;color:#ef4444;font-size:11px;">🗑</button>
                    </div>
                </div>
            `).join('');

        const ringPct  = pct !== null ? pct : 0;
        const isRisk   = pct !== null && pct < this.MIN_PCT;
        const ringColor = isRisk ? '#f59f00' : '#10b981';

        const html = `
            <div style="display:flex;flex-direction:column;gap:14px;">
                <!-- Stats row -->
                <div style="display:flex;gap:10px;">
                    <div style="flex:1;background:rgba(16,185,129,0.1);border-radius:var(--radius-sm);padding:12px;text-align:center;border:1px solid rgba(16,185,129,0.25);">
                        <div style="font-size:20px;font-weight:800;color:#10b981;">${attended}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">Attended</div>
                    </div>
                    <div style="flex:1;background:rgba(239,68,68,0.1);border-radius:var(--radius-sm);padding:12px;text-align:center;border:1px solid rgba(239,68,68,0.25);">
                        <div style="font-size:20px;font-weight:800;color:#ef4444;">${absent}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">Absent</div>
                    </div>
                    <div style="flex:1;background:rgba(139,92,246,0.1);border-radius:var(--radius-sm);padding:12px;text-align:center;border:1px solid rgba(139,92,246,0.25);">
                        <div style="font-size:20px;font-weight:800;color:#8b5cf6;">${pct !== null ? pct + '%' : '--%'}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">Rate</div>
                    </div>
                </div>

                <!-- Progress bar -->
                <div style="height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">
                    <div style="height:100%;width:${ringPct}%;background:${ringColor};border-radius:3px;"></div>
                </div>

                ${pendingHTML}

                <!-- History list -->
                <div style="max-height:35vh;overflow-y:auto;">
                    <div style="font-size:11px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Past Records</div>
                    ${histHTML}
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-danger" onclick="AttendancePage.confirmDeleteSubject(${subj.id})"
                        style="flex:1;padding:11px 16px;font-size:13px;">
                        🗑 Delete Subject
                    </button>
                    <button class="btn btn-secondary" onclick="Modal.close()" style="flex:1;padding:11px 0;font-size:13px;">Close</button>
                </div>
            </div>
        `;

        Modal.open(subj.name, html);
    },

    // ── Manage Subjects Modal ──────────────────────────────────────────────
    showManageModal() {
        const COLORS = ['#8b5cf6','#10b981','#f59f00','#ef4444','#3b5bdb','#e91e8c','#06b6d4','#84cc16'];

        const subjectRows = this.subjects.length > 0 ? this.subjects.map((s, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;${idx < this.subjects.length - 1 ? 'border-bottom:1px solid var(--border-color);' : ''}">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <div style="width:12px;height:12px;border-radius:50%;background:${s.color};flex-shrink:0;"></div>
                    <span style="font-size:13px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</span>
                </div>
                <button onclick="AttendancePage.confirmDeleteSubject(${s.id}, true)"
                    style="background:rgba(239,68,68,0.12);border:none;border-radius:6px;padding:5px 9px;cursor:pointer;color:#ef4444;font-size:12px;flex-shrink:0;margin-left:8px;">🗑</button>
            </div>
        `).join('') : '<div style="padding:16px 0;text-align:center;color:var(--text-tertiary);font-size:13px;">No subjects yet. Add one below!</div>';

        const colorPickers = COLORS.map((c, i) =>
            `<div class="att-color-pick" data-color="${c}"
                style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${i === 0 ? '#fff' : 'transparent'};transition:border 0.2s;"></div>`
        ).join('');

        const html = `
            <div style="display:flex;flex-direction:column;gap:14px;">
                <!-- Existing subjects (Scrollable List) -->
                <div>
                    <div style="font-size:12px;font-weight:700;color:var(--text-tertiary);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Your Subjects (${this.subjects.length})</div>
                    <div id="manage-subj-list" style="max-height:180px;overflow-y:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0 12px;background:transparent;">
                        ${subjectRows}
                    </div>
                </div>

                <!-- Add new (Static Pinned Form) -->
                <div style="background:var(--surface-variant);border-radius:var(--radius-md);padding:14px;border:1px solid var(--border-color);flex-shrink:0;">
                    <div style="font-size:12px;font-weight:700;color:var(--text-tertiary);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Add Subject</div>
                    <form id="form-add-subj" style="display:flex;flex-direction:column;gap:10px;">
                        <input type="text" id="new-subj-name" placeholder="e.g. Mathematics, Physics..."
                            style="padding:11px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--surface-color);color:var(--text-primary);font-size:14px;width:100%;box-sizing:border-box;" required>
                        <div>
                            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Pick a colour</div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="att-color-row">${colorPickers}</div>
                            <input type="hidden" id="new-subj-color" value="${COLORS[0]}">
                        </div>
                        <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:11px;font-size:13px;">+ Add Subject</button>
                    </form>
                </div>

                <!-- Start New Semester Reset Section -->
                <div style="border-top:1px dashed var(--border-color); padding-top:12px; margin-top:2px;">
                    <button type="button" id="btn-start-new-semester"
                        style="width:100%; padding:11px 0; font-size:13px; font-weight:700; border-radius:var(--radius-sm); background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.25); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <span>🎓</span> Start New Semester / Reset All
                    </button>
                    <div style="font-size:11px; color:var(--text-tertiary); text-align:center; margin-top:6px;">
                        Clears all subjects, attendance records & past class timetables for a fresh semester.
                    </div>
                </div>

                <button class="btn btn-secondary" onclick="Modal.close()" style="padding:11px 0;font-size:13px;flex-shrink:0;">Done</button>
            </div>
        `;

        Modal.open('Manage Subjects', html, (container) => {
            // Color picker
            container.querySelectorAll('.att-color-pick').forEach(dot => {
                dot.addEventListener('click', () => {
                    container.querySelectorAll('.att-color-pick').forEach(d => d.style.borderColor = 'transparent');
                    dot.style.borderColor = '#fff';
                    container.querySelector('#new-subj-color').value = dot.dataset.color;
                });
            });

            // Add subject form
            container.querySelector('#form-add-subj')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name  = container.querySelector('#new-subj-name').value.trim();
                const color = container.querySelector('#new-subj-color').value;
                if (!name) return;

                try {
                    await API.execute(
                        'INSERT INTO attendance_subjects (name, color) VALUES (?, ?)',
                        [name, color]
                    );
                    await this.loadData();
                    this.showManageModal();
                } catch (err) {
                    alert('Failed to add subject: ' + err.message);
                }
            });

            // Start New Semester Button listener
            container.querySelector('#btn-start-new-semester')?.addEventListener('click', () => {
                this.startNewSemester();
            });
        });
    },

    // ── Start New Semester (Clear all subjects, records & class schedules) ────
    async startNewSemester() {
        const confirmMsg = "🎓 Start New Semester?\n\nThis will permanently delete:\n• All attendance subjects\n• All attendance records\n• All class timetable schedules from Planner\n\n(Exams, Meetings, and Assignments will remain untouched).\n\nAre you sure you want to start a fresh semester?";
        if (!confirm(confirmMsg)) return;

        try {
            // 1. Delete all attendance records
            await API.execute("DELETE FROM attendance_records");
            // 2. Delete all attendance subjects
            await API.execute("DELETE FROM attendance_subjects");
            // 3. Delete all schedule entries of type 'class'
            await API.execute("DELETE FROM schedule WHERE type = 'class'");
            // 4. Delete pending notifications for classes (if table exists)
            try { await API.execute("DELETE FROM notifications WHERE type = 'schedule' AND title LIKE 'Upcoming Class%'"); } catch (_) {}

            // Slide modal down first, then show success after animation completes
            Modal.close();
            await this.loadData();
            setTimeout(() => {
                alert("🎉 New semester started! All old subjects and class schedules have been cleared.");
            }, 320);
        } catch (err) {
            alert("Failed to reset semester: " + err.message);
        }
    },

    // ── Delete record ──────────────────────────────────────────────────────
    async deleteRecord(recordId) {
        if (!confirm('Delete this attendance record?')) return;
        try {
            await API.execute('DELETE FROM attendance_records WHERE id = ?', [recordId]);
            Modal.close();
            await this.loadData();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    },

    // ── Delete subject ─────────────────────────────────────────────────────
    async confirmDeleteSubject(subjectId, fromManageModal = false) {
        const subj = this.subjects.find(s => s.id === subjectId);
        if (!subj) return;
        if (!confirm(`Delete subject "${subj.name}"?\n\nThis will delete all attendance records and calendar class schedules for this subject.`)) return;
        try {
            await API.execute('DELETE FROM attendance_records WHERE subject_id = ?', [subjectId]);
            await API.execute('DELETE FROM attendance_subjects WHERE id = ?', [subjectId]);
            // Also clean matching schedule class entries for this subject
            await API.execute("DELETE FROM schedule WHERE type = 'class' AND (title = ? OR title LIKE ?)", [subj.name, `%${subj.name}%`]);
            await API.execute("DELETE FROM notifications WHERE type = 'schedule' AND title LIKE ?", [`%${subj.name}%`]);

            await this.loadData();
            if (fromManageModal) {
                this.showManageModal();
            } else {
                Modal.close();
            }
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    },

    // ── Bind top events ────────────────────────────────────────────────────
    bindEvents() {
        document.getElementById('att-manage-btn')?.addEventListener('click', () => {
            this.showManageModal();
        });

        document.querySelectorAll('.att-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.att-filter-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background  = 'transparent';
                    b.style.color       = 'var(--text-secondary)';
                    b.style.borderColor = 'var(--border-color)';
                });
                btn.classList.add('active');
                btn.style.background  = 'var(--primary)';
                btn.style.color       = '#ffffff';
                btn.style.borderColor = 'var(--primary)';
                this.filter = btn.dataset.filter;
                this.renderSubjects();
            });
        });
    }
};

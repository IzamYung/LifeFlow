/* UniFlow */

const AttendancePage = {
    subjects: [],
    records: [],
    filter: 'all', // 'all' | 'at-risk' | 'good'
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
                            <button class="btn btn-secondary" id="att-manage-btn" style="padding:8px 12px; font-size:13px; display:flex; align-items:center; gap:6px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                                Manage
                            </button>
                            <button class="btn btn-primary" id="att-mark-btn" style="padding:8px 14px; font-size:13px; display:flex; align-items:center; gap:6px; background:linear-gradient(135deg,#8b5cf6,#7c3aed);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                                Mark
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

                    <!-- Filter Tabs -->
                    <div style="display:flex; gap:8px; margin-bottom:12px; overflow-x:auto; padding-bottom:2px;">
                        <button class="att-filter-btn active" data-filter="all"
                            style="padding:7px 15px;border-radius:20px;border:1px solid var(--primary);background:var(--primary);color:#fff;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;">
                            All Subjects
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

                <!-- Scrollable Subject List -->
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
            this.records  = await API.query('SELECT * FROM attendance_records ORDER BY date DESC');
        } catch (err) {
            console.error('Attendance load failed:', err);
            this.subjects = [];
            this.records  = [];
        }
        this.renderSummary();
        this.renderSubjects();
    },

    // ── Stats helpers ──────────────────────────────────────────────────────
    getStats(subjectId) {
        const recs     = this.records.filter(r => r.subject_id === subjectId);
        const total    = recs.length;
        const attended = recs.filter(r => r.status === 'present' || r.status === 'late').length;
        const absent   = recs.filter(r => r.status === 'absent').length;
        const pct      = total > 0 ? Math.round((attended / total) * 100) : null;
        return { total, attended, absent, pct };
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

        const allTotal    = this.records.length;
        const allAttended = this.records.filter(r => r.status === 'present' || r.status === 'late').length;
        const overallPct  = allTotal > 0 ? Math.round((allAttended / allTotal) * 100) : null;

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

    // ── Subject cards ──────────────────────────────────────────────────────
    renderSubjects() {
        const list = document.getElementById('att-subject-list');
        if (!list) return;

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
            list.innerHTML = `
                <div class="empty-state" style="padding:50px 16px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:48px;height:48px;opacity:0.5;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    <h5>${this.subjects.length === 0 ? 'No subjects yet' : 'No subjects in this category'}</h5>
                    <p>${this.subjects.length === 0 ? 'Tap Manage to add your subjects.' : 'Try a different filter.'}</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(s => this._subjectCardHTML(s)).join('');

        // Bind card taps for history
        list.querySelectorAll('.att-subject-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id);
                const subj = this.subjects.find(s => s.id === id);
                if (subj) this.showSubjectHistory(subj);
            });
        });
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

    // ── Mark Attendance Modal ──────────────────────────────────────────────
    showMarkModal(preselectedSubjectId = null, isTransition = false) {
        if (this.subjects.length === 0) {
            alert('Please add subjects first via the Manage button.');
            return;
        }

        const today = new Date().toISOString().slice(0, 10);

        const subjectOptions = this.subjects.map(s =>
            `<option value="${s.id}" ${preselectedSubjectId === s.id ? 'selected' : ''}>${s.name}</option>`
        ).join('');

        const html = `
            <form id="form-mark-att" class="settings-form" style="display:flex;flex-direction:column;gap:14px;">
                <div class="form-group">
                    <label for="att-subj-sel">Subject</label>
                    <select id="att-subj-sel" style="padding:12px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--surface-variant);color:var(--text-primary);font-size:14px;width:100%;">
                        ${subjectOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="att-date-inp">Date</label>
                    <input type="date" id="att-date-inp" value="${today}"
                        style="padding:12px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--surface-variant);color:var(--text-primary);font-size:14px;width:100%;box-sizing:border-box;">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <div style="display:flex;gap:10px;">
                        <label style="flex:1;cursor:pointer;">
                            <input type="radio" name="att-status" value="present" checked style="display:none;">
                            <div class="att-status-opt" data-val="present"
                                style="padding:12px 8px;border-radius:var(--radius-sm);border:2px solid #10b981;background:rgba(16,185,129,0.1);text-align:center;font-weight:700;font-size:13px;color:#10b981;transition:all 0.2s;">
                                ✅ Present
                            </div>
                        </label>
                        <label style="flex:1;cursor:pointer;">
                            <input type="radio" name="att-status" value="late" style="display:none;">
                            <div class="att-status-opt" data-val="late"
                                style="padding:12px 8px;border-radius:var(--radius-sm);border:2px solid var(--border-color);background:transparent;text-align:center;font-weight:700;font-size:13px;color:var(--text-secondary);transition:all 0.2s;">
                                🕐 Late
                            </div>
                        </label>
                        <label style="flex:1;cursor:pointer;">
                            <input type="radio" name="att-status" value="absent" style="display:none;">
                            <div class="att-status-opt" data-val="absent"
                                style="padding:12px 8px;border-radius:var(--radius-sm);border:2px solid var(--border-color);background:transparent;text-align:center;font-weight:700;font-size:13px;color:var(--text-secondary);transition:all 0.2s;">
                                ❌ Absent
                            </div>
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="att-note-inp">Note (optional)</label>
                    <input type="text" id="att-note-inp" placeholder="e.g. Medical reason, test day..."
                        style="padding:12px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--surface-variant);color:var(--text-primary);font-size:14px;width:100%;box-sizing:border-box;">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);">Save</button>
                </div>
            </form>
        `;

        const bindHandler = (container) => {
            // Status pill toggle
            container.querySelectorAll('.att-status-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    // Reset all
                    container.querySelectorAll('.att-status-opt').forEach(o => {
                        o.style.borderColor = 'var(--border-color)';
                        o.style.background  = 'transparent';
                        o.style.color       = 'var(--text-secondary)';
                    });
                    // Highlight selected
                    const colors = { present: '#10b981', late: '#f59f00', absent: '#ef4444' };
                    const val    = opt.dataset.val;
                    const c      = colors[val];
                    opt.style.borderColor = c;
                    opt.style.background  = c + '20';
                    opt.style.color       = c;
                    const radio = opt.parentElement.querySelector('input[name="att-status"]');
                    if (radio) radio.checked = true;
                });
            });

            // Form submit
            container.querySelector('#form-mark-att')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const subjId  = parseInt(container.querySelector('#att-subj-sel').value);
                const date    = container.querySelector('#att-date-inp').value;
                const status  = container.querySelector('input[name="att-status"]:checked')?.value || 'present';
                const note    = container.querySelector('#att-note-inp').value.trim();

                if (!date) return;

                try {
                    await API.execute(
                        'INSERT INTO attendance_records (subject_id, date, status, note) VALUES (?, ?, ?, ?)',
                        [subjId, date, status, note || null]
                    );
                    Modal.close();
                    await this.loadData();
                } catch (err) {
                    alert('Failed to save: ' + err.message);
                }
            });
        };

        if (isTransition) {
            Modal.transitionTo('Mark Attendance', html, bindHandler);
        } else {
            Modal.open('Mark Attendance', html, bindHandler);
        }
    },

    // ── Subject History Modal ──────────────────────────────────────────────
    showSubjectHistory(subj) {
        const recs   = this.records.filter(r => r.subject_id === subj.id);
        const { total, attended, absent, pct } = this.getStats(subj.id);

        const statusIcon  = { present: '✅', late: '🕐', absent: '❌' };
        const statusColor = { present: '#10b981', late: '#f59f00', absent: '#ef4444' };
        const statusLabel = { present: 'Present', late: 'Late', absent: 'Absent' };

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

                <!-- History list -->
                <div style="max-height:40vh;overflow-y:auto;">
                    ${histHTML}
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-primary" onclick="AttendancePage.showMarkModal(${subj.id}, true);"
                        style="flex:1;padding:11px 0;font-size:13px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);">
                        ➕ Mark
                    </button>
                    <button class="btn btn-danger" onclick="AttendancePage.confirmDeleteSubject(${subj.id})"
                        style="padding:11px 16px;font-size:13px;">
                        🗑 Delete Subject
                    </button>
                </div>
                <button class="btn btn-secondary" onclick="Modal.close()" style="padding:11px 0;font-size:13px;">Close</button>
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
        });
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
        if (!confirm(`Delete subject "${subj.name}"? All attendance records for this subject will also be deleted.`)) return;
        try {
            await API.execute('DELETE FROM attendance_subjects WHERE id = ?', [subjectId]);
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

    // ── Events ────────────────────────────────────────────────────────────
    bindEvents() {
        document.getElementById('att-mark-btn')?.addEventListener('click', () => this.showMarkModal());
        document.getElementById('att-manage-btn')?.addEventListener('click', () => this.showManageModal());

        document.querySelectorAll('.att-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filter = btn.dataset.filter;
                document.querySelectorAll('.att-filter-btn').forEach(b => {
                    const isActive = b === btn;
                    b.style.background   = isActive ? 'var(--primary)' : 'transparent';
                    b.style.color        = isActive ? '#fff' : 'var(--text-secondary)';
                    b.style.borderColor  = isActive ? 'var(--primary)' : 'var(--border-color)';
                });
                this.renderSubjects();
            });
        });
    }
};


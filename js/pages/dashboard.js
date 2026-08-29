/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\pages\dashboard.js */

const DashboardPage = {
    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="dashboard-page">
                <!-- Header -->
                <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 12px;">
                    <div class="welcome-section">
                        <h2 id="greeting-title">Hello, ...</h2>
                        <p id="greeting-sub">Let's check your agenda for today.</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="date-badge" id="dashboard-date" style="margin-bottom:0;">July 1, 2026</div>
                        <div style="position: relative; cursor: pointer;" onclick="location.hash='#/settings'">
                            <div class="profile-avatar ripple-container" id="dashboard-header-avatar" 
                                 style="width: 40px; height: 40px; border-radius: 50%; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #ffffff; border: 2px solid var(--border-color); box-shadow: var(--card-shadow);">
                                 AM
                            </div>
                            <div style="position: absolute; bottom: -2px; right: -2px; width: 16px; height: 16px; border-radius: 50%; background: var(--surface-color); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; box-shadow: var(--card-shadow);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="3" style="width:10px; height:10px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Action grid -->
                <div class="actions-grid">
                    <div class="action-btn ripple-container" id="dash-action-trans">
                        <div class="icon-box" style="background:var(--primary);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; height:20px;"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
                        <span>Add Expense</span>
                    </div>
                    <div class="action-btn ripple-container" id="dash-action-event">
                        <div class="icon-box" style="background:var(--secondary);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; height:20px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                        <span>Add Class</span>
                    </div>
                    <div class="action-btn ripple-container" id="dash-action-assign">
                        <div class="icon-box" style="background:var(--warning);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; height:20px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>
                        <span>Add Task</span>
                    </div>
                    <div class="action-btn ripple-container" id="dash-action-settings">
                        <div class="icon-box" style="background:var(--success);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; height:20px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
                        <span>Settings</span>
                    </div>
                </div>

                <!-- Main dashboard summary layouts -->
                <div class="dashboard-grid">
                    <!-- Finance Card -->
                    <div class="card bg-cream ripple-container" onclick="location.hash='#/finance'">
                        <div class="card-title">Total Balance</div>
                        <div class="stat-value" id="dash-balance">$0.00</div>
                        <div class="stat-trend trend-up" id="dash-budget-info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                            <span id="dash-budget-percent">0% of budget spent</span>
                        </div>
                    </div>

                    <!-- Next Prayer Card -->
                    <div class="card bg-lavender ripple-container" onclick="location.hash='#/prayer'" id="dash-prayer-card">
                        <div class="card-title">Next Prayer</div>
                        <div class="stat-value" id="dash-prayer-name" style="color:var(--primary); font-size:1.8rem;">--</div>
                        <div class="stat-trend" style="color:var(--text-secondary); margin-top:6px; display:flex; align-items:center; gap:4px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span id="dash-prayer-time">--:--</span>
                        </div>
                    </div>

                    <!-- Classes schedule Card -->
                    <div class="card bg-mint">
                        <div class="card-title">Today's Agenda</div>
                        <div class="agenda-list" id="dash-agenda-list">
                            <!-- Loaded dynamically -->
                        </div>
                    </div>

                    <!-- Tasks Card -->
                    <div class="card bg-cream">
                        <div class="card-title">Upcoming Tasks</div>
                        <div class="assignments-stack" id="dash-assignments-list">
                            <!-- Loaded dynamically -->
                        </div>
                    </div>

                    <!-- Weekly statistics -->
                    <div class="card bg-lavender" style="grid-column: span 1;">
                        <div class="card-title">Weekly Productivity</div>
                        <div class="chart-container" id="productivity-chart-area">
                            <!-- SVG progress chart -->
                        </div>
                    </div>

                    <!-- Monthly cash flow -->
                    <div class="card bg-mint" style="grid-column: span 1;">
                        <div class="card-title">Monthly Cash Flow</div>
                        <div class="chart-container" id="cashflow-chart-area">
                            <!-- SVG comparison chart -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('dashboard-page');
            if (page) page.classList.add('active');
        }, 50);

        await this.loadDashboardData();
        this.bindQuickActions();
    },

    async loadDashboardData() {
        try {
            // 1. Fetch User Settings
            const settingsList = await API.query("SELECT key_name, value_val FROM settings");
            const settings = {};
            settingsList.forEach(s => settings[s.key_name] = s.value_val);

            // 2. Fetch Total Financial Balance
            const walletsBal = await API.query("SELECT SUM(balance) as total_balance FROM wallets");
            const totalBalance = walletsBal[0] ? walletsBal[0].total_balance : 0.00;

            // 3. Fetch Today's Schedule Events
            const todayEvents = await API.query("SELECT id, title, type, location, start_time, end_time, description, color FROM schedule WHERE date(start_time) = date('now', 'localtime') ORDER BY start_time ASC");

            // 4. Fetch Upcoming Pending Assignments
            const upcomingAssignments = await API.query("SELECT id, title, subject, priority, due_date, status, progress, notes, (strftime('%s', due_date) - strftime('%s', 'now')) as seconds_left FROM assignments WHERE status != 'submitted' AND datetime(due_date) >= datetime('now', 'localtime') ORDER BY due_date ASC LIMIT 4");

            // 5. Fetch Monthly Cash Flow
            const cashFlow = await API.query("SELECT type, SUM(amount) as total FROM transactions WHERE strftime('%m', transaction_date) = strftime('%m', 'now') AND strftime('%Y', transaction_date) = strftime('%Y', 'now') GROUP BY type");
            let monthlyIncome = 0.00;
            let monthlyExpense = 0.00;
            cashFlow.forEach(row => {
                if (row.type === 'income') monthlyIncome = parseFloat(row.total);
                else if (row.type === 'expense') monthlyExpense = parseFloat(row.total);
            });

            // 6. Assignment Statistics
            const assignStatsRaw = await API.query("SELECT status, COUNT(*) as count FROM assignments GROUP BY status");
            const assignmentStats = { pending: 0, in_progress: 0, submitted: 0 };
            assignStatsRaw.forEach(row => {
                if (row.status === 'pending') assignmentStats.pending = row.count;
                else if (row.status === 'in_progress') assignmentStats.in_progress = row.count;
                else if (row.status === 'submitted') assignmentStats.submitted = row.count;
            });

            // 7. Fetch Today's Prayer times (defaults to selected zone in settings database)
            const prayerZone = settings.prayer_zone || 'WLY01';
            const today = new Date();
            const pYear = today.getFullYear();
            const pMonth = today.getMonth() + 1;
            const pDayStr = `${String(today.getDate()).padStart(2, '0')}-${String(pMonth).padStart(2, '0')}-${pYear}`;

            try {
                const pResponse = await fetch(`https://api.waktusolat.app/v2/solat/${prayerZone}?year=${pYear}&month=${pMonth}`);
                if (pResponse.ok) {
                    const pData = await pResponse.json();
                    if (pData && pData.prayers) {
                        const todayDay = today.getDate();
                        const todayPrayers = pData.prayers.find(t => t.day === todayDay);
                        if (todayPrayers) {
                            this.updateNextPrayerWidget(todayPrayers, pData.prayers);
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch next prayer for dashboard:", e);
                const nameEl = document.getElementById('dash-prayer-name');
                const timeEl = document.getElementById('dash-prayer-time');
                if (nameEl) nameEl.textContent = "Offline";
                if (timeEl) timeEl.textContent = "Check connection";
            }

            // Update user details safely
            const name = settings.user_name || 'Alex Mercer';
            const univ = settings.user_university || 'Pacific Tech University';
            
            const sidebarName = document.getElementById('sidebar-profile-name');
            if (sidebarName) sidebarName.textContent = name;
            
            const sidebarUniv = document.getElementById('sidebar-profile-univ');
            if (sidebarUniv) sidebarUniv.textContent = univ;

            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const avatarLetters = document.getElementById('profile-avatar-letters');
            if (avatarLetters) avatarLetters.textContent = initials;
            
            const logoFallback = document.getElementById('sidebar-logo-fallback');
            if (logoFallback) logoFallback.textContent = initials;

            const dashAvatar = document.getElementById('dashboard-header-avatar');
            if (dashAvatar) dashAvatar.textContent = initials;

            // Greeting title
            const hour = new Date().getHours();
            let greeting = 'Good evening';
            if (hour < 12) greeting = 'Good morning';
            else if (hour < 18) greeting = 'Good afternoon';
            document.getElementById('greeting-title').textContent = `${greeting}, ${name.split(' ')[0]}`;

            // Current date
            const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
            document.getElementById('dashboard-date').textContent = new Date().toLocaleDateString('en-US', options);

            // Animate counter balance
            this.animateCounter(document.getElementById('dash-balance'), totalBalance, '$');

            // Budget percent
            const monthlyBudget = parseFloat(settings.monthly_budget || 500);
            const budgetPercent = monthlyBudget > 0 ? Math.round((monthlyExpense / monthlyBudget) * 100) : 0;
            const budgetInfo = document.getElementById('dash-budget-info');
            const budgetPercentText = document.getElementById('dash-budget-percent');
            budgetPercentText.textContent = `${budgetPercent}% of monthly budget spent`;
            
            if (budgetPercent > 90) {
                budgetInfo.className = 'stat-trend trend-down';
            } else {
                budgetInfo.className = 'stat-trend trend-up';
            }

            // Render agenda items
            const agendaContainer = document.getElementById('dash-agenda-list');
            if (todayEvents.length === 0) {
                agendaContainer.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <h5>No lectures today!</h5>
                        <p>Your calendar is completely clear for today.</p>
                    </div>
                `;
            } else {
                agendaContainer.innerHTML = todayEvents.map(ev => {
                    const timeStr = new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="agenda-item ripple-container" style="border-left-color: ${ev.color};" onclick="Forms.showEventDetail(${JSON.stringify(ev).replace(/"/g, '&quot;')}, () => DashboardPage.loadDashboardData())">
                            <div class="agenda-time">${timeStr}</div>
                            <div class="agenda-details">
                                <div class="agenda-title">${ev.title}</div>
                                ${ev.location ? `
                                <div class="agenda-location">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    <span>${ev.location}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Render upcoming assignments
            const assignContainer = document.getElementById('dash-assignments-list');
            if (upcomingAssignments.length === 0) {
                assignContainer.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <h5>All caught up!</h5>
                        <p>No upcoming assignments or tests due soon.</p>
                    </div>
                `;
            } else {
                assignContainer.innerHTML = upcomingAssignments.map(as => {
                    const daysLeft = Math.ceil(as.seconds_left / 86400);
                    const daysText = daysLeft <= 0 ? 'Due today' : `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
                    const warningClass = daysLeft <= 2 ? 'due-soon' : '';

                    return `
                        <div class="assignment-mini-card ripple-container" onclick="Forms.showAssignmentDetail(${JSON.stringify(as).replace(/"/g, '&quot;')}, () => DashboardPage.loadDashboardData())">
                            <div class="assign-info">
                                <div class="assign-title">${as.title}</div>
                                <div class="assign-sub">${as.subject} • <span class="${warningClass}" style="font-weight:600;">${daysText}</span></div>
                            </div>
                            <span class="assign-badge priority-badge ${as.priority}">${as.priority}</span>
                        </div>
                    `;
                }).join('');
            }

            this.drawProductivityChart(assignmentStats);
            this.drawCashFlowChart(monthlyIncome, monthlyExpense);

        } catch (err) {
            console.error('Failed to load dashboard metrics: ' + err.message);
        }
    },

    updateNextPrayerWidget(dayData, allMonthPrayers) {
        const prayers = [
            { key: 'fajr', label: 'Fajr' },
            { key: 'syuruk', label: 'Sunrise' },
            { key: 'dhuhr', label: 'Dhuhr' },
            { key: 'asr', label: 'Asr' },
            { key: 'maghrib', label: 'Maghrib' },
            { key: 'isha', label: 'Isha' }
        ];

        const now = new Date();
        let nextPrayer = null;

        for (const p of prayers) {
            const timestamp = dayData[p.key];
            if (!timestamp) continue;

            const pDate = new Date(timestamp * 1000);
            if (pDate > now) {
                nextPrayer = { label: p.label, date: pDate };
                break;
            }
        }

        // Roll over to Fajr of tomorrow if all prayers of today are done
        if (!nextPrayer && allMonthPrayers) {
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1);
            const tomorrowDay = tomorrow.getDate();
            const tomorrowData = allMonthPrayers.find(t => t.day === tomorrowDay);
            
            if (tomorrowData && tomorrowData.fajr) {
                nextPrayer = { label: 'Fajr (Tomorrow)', date: new Date(tomorrowData.fajr * 1000) };
            }
        }

        // Default fallback if tomorrow's data not available
        if (!nextPrayer) {
            nextPrayer = { label: 'Fajr (Tomorrow)', date: new Date(dayData['fajr'] * 1000 + 24 * 60 * 60 * 1000) };
        }

        const nameEl = document.getElementById('dash-prayer-name');
        const timeEl = document.getElementById('dash-prayer-time');

        if (nameEl && timeEl) {
            nameEl.textContent = nextPrayer.label;
            const timeStr = nextPrayer.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            timeEl.textContent = `at ${timeStr}`;
        }
    },

    animateCounter(element, targetValue, prefix = '') {
        const start = 0;
        const duration = 1200;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const val = start + (targetValue - start) * ease;

            element.textContent = `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    },

    drawProductivityChart(stats) {
        const chartArea = document.getElementById('productivity-chart-area');
        if (!chartArea) return;

        const total = stats.pending + stats.in_progress + stats.submitted;
        const completedPct = total > 0 ? Math.round((stats.submitted / total) * 100) : 0;
        
        chartArea.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-around; width:100%; height:100%;">
                <svg width="120" height="120" viewBox="0 0 36 36">
                    <path class="chart-track" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-color)" stroke-width="3"></path>
                    <path class="chart-progress" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary)" stroke-width="3" stroke-dasharray="${completedPct}, 100" stroke-linecap="round" style="transition: stroke-dasharray 1s ease-in-out;"></path>
                </svg>
                <div class="donut-center-text" style="position:static;">
                    <div class="donut-center-val" style="font-size:1.8rem; color:var(--primary);">${completedPct}%</div>
                    <div class="donut-center-lbl" style="font-size:11px;">TASKS COMPLETED</div>
                </div>
                <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
                    <div><span style="background:var(--success); width:10px; height:10px; display:inline-block; border-radius:50%; margin-right:6px;"></span>Completed: <b>${stats.submitted}</b></div>
                    <div><span style="background:var(--primary); width:10px; height:10px; display:inline-block; border-radius:50%; margin-right:6px;"></span>In Progress: <b>${stats.in_progress}</b></div>
                    <div><span style="background:var(--text-tertiary); width:10px; height:10px; display:inline-block; border-radius:50%; margin-right:6px;"></span>Pending: <b>${stats.pending}</b></div>
                </div>
            </div>
        `;
    },

    drawCashFlowChart(income, expense) {
        const chartArea = document.getElementById('cashflow-chart-area');
        if (!chartArea) return;

        const max = Math.max(income, expense, 100);
        const incHeight = (income / max) * 110;
        const expHeight = (expense / max) * 110;

        chartArea.innerHTML = `
            <div style="display:flex; justify-content:space-around; align-items:flex-end; width:100%; height:130px; padding-bottom:10px; border-bottom:1px solid var(--border-color);">
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <div style="font-size:11px; font-weight:700; color:var(--success);">$${income.toFixed(0)}</div>
                    <div style="width:36px; height:${incHeight}px; background:linear-gradient(to top, rgba(16,185,129,0.3), var(--success)); border-radius:6px 6px 0 0; transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    <div style="font-size:11px; font-weight:600;">Income</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <div style="font-size:11px; font-weight:700; color:var(--error);">$${expense.toFixed(0)}</div>
                    <div style="width:36px; height:${expHeight}px; background:linear-gradient(to top, rgba(239,68,68,0.3), var(--error)); border-radius:6px 6px 0 0; transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    <div style="font-size:11px; font-weight:600;">Expenses</div>
                </div>
            </div>
        `;
    },

    bindQuickActions() {
        const getFinanceAndOpen = async () => {
            try {
                const wallets = await API.query("SELECT id, name, type, balance, color FROM wallets ORDER BY id ASC");
                const categories = await API.query("SELECT id, name, type, icon, color FROM transaction_categories ORDER BY type DESC, name ASC");
                Forms.showAddTransaction(wallets, categories, () => this.loadDashboardData());
            } catch (err) {
                alert('Could not fetch finance options: ' + err.message);
            }
        };

        const transBtn = document.getElementById('dash-action-trans');
        if (transBtn) transBtn.addEventListener('click', getFinanceAndOpen);

        const eventBtn = document.getElementById('dash-action-event');
        if (eventBtn) {
            eventBtn.addEventListener('click', () => {
                Forms.showAddEvent(() => this.loadDashboardData());
            });
        }

        const assignBtn = document.getElementById('dash-action-assign');
        if (assignBtn) {
            assignBtn.addEventListener('click', () => {
                Forms.showAddAssignment(() => this.loadDashboardData());
            });
        }

        const settingsBtn = document.getElementById('dash-action-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                location.hash = '#/settings';
            });
        }
    }
};

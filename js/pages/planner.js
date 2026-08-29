/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\pages\planner.js */

const PlannerPage = {
    activeTab: 'schedule', // Default tab: 'schedule' or 'tasks'
    
    // -------------------------------------------------------------------------
    // STATE: SCHEDULE
    // -------------------------------------------------------------------------
    schedCurrentDate: new Date(),
    schedSelectedDate: new Date(),
    schedEvents: [],
    schedFilters: {
        type: '',
        q: ''
    },

    // -------------------------------------------------------------------------
    // STATE: ASSIGNMENTS
    // -------------------------------------------------------------------------
    assignList: [],
    assignFilters: {
        q: '',
        priority: '',
        status: '',
        sort: 'due_date_asc'
    },

    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="planner-page">
                <!-- Header -->
                <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center; padding-bottom: 12px;">
                    <div class="welcome-section">
                        <h2>My Planner</h2>
                        <p id="planner-subtitle">Plan courses, exam calendars, and study groups.</p>
                    </div>
                </div>

                <!-- Centered Segments Tab Selector (iOS style, compact) -->
                <div style="display: flex; justify-content: center; margin: 4px 0 20px 0; width: 100%;">
                    <div style="background: var(--surface-variant); padding: 4px; border-radius: var(--radius-lg); display: inline-flex; gap: 4px; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.15);">
                        <div class="planner-tab-btn active" id="tab-btn-schedule" 
                             style="padding: 8px 24px; border-radius: var(--radius-md); font-size: 13px; font-weight: 700; cursor: pointer; transition: all var(--transition-fast); background: var(--primary); color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" 
                             onclick="PlannerPage.setTab('schedule')">
                             Schedule
                        </div>
                        <div class="planner-tab-btn" id="tab-btn-tasks" 
                             style="padding: 8px 24px; border-radius: var(--radius-md); font-size: 13px; font-weight: 700; cursor: pointer; transition: all var(--transition-fast); color: var(--text-secondary); background: transparent;" 
                             onclick="PlannerPage.setTab('tasks')">
                             Tasks & Assignments
                        </div>
                    </div>
                </div>

                <!-- Sub Page viewport -->
                <div id="planner-sub-viewport" style="min-height: 300px;">
                    <!-- Rendered dynamically -->
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('planner-page');
            if (page) page.classList.add('active');
        }, 50);

        // Render default active tab
        await this.renderActiveTab();
    },

    async setTab(tab) {
        this.activeTab = tab;
        const btnSched = document.getElementById('tab-btn-schedule');
        const btnTasks = document.getElementById('tab-btn-tasks');

        if (btnSched && btnTasks) {
            if (tab === 'schedule') {
                btnSched.style.background = 'var(--primary)';
                btnSched.style.color = '#ffffff';
                btnSched.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                
                btnTasks.style.background = 'transparent';
                btnTasks.style.color = 'var(--text-secondary)';
                btnTasks.style.boxShadow = 'none';
            } else {
                btnTasks.style.background = 'var(--primary)';
                btnTasks.style.color = '#ffffff';
                btnTasks.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                
                btnSched.style.background = 'transparent';
                btnSched.style.color = 'var(--text-secondary)';
                btnSched.style.boxShadow = 'none';
            }
        }

        await this.renderActiveTab();
    },

    async renderActiveTab() {
        const subViewport = document.getElementById('planner-sub-viewport');
        const subtitle = document.getElementById('planner-subtitle');
        if (!subViewport) return;

        if (this.activeTab === 'schedule') {
            if (subtitle) subtitle.textContent = "Plan courses, exam calendars, and study groups.";
            
            // Redirect global FAB click listener to local page reload
            const fabBtn = document.getElementById('fab-action-schedule');
            if (fabBtn) fabBtn.onclick = () => Forms.showAddEvent(() => this.renderActiveTab());

            await this.loadScheduleTab(subViewport);
        } else {
            if (subtitle) subtitle.textContent = "Track academic deadlines, homework, and tasks.";

            const fabBtn = document.getElementById('fab-action-assignment');
            if (fabBtn) fabBtn.onclick = () => Forms.showAddAssignment(() => this.renderActiveTab());

            await this.loadAssignmentTab(subViewport);
        }
    },

    // -------------------------------------------------------------------------
    // 1. SUB-PAGE: SCHEDULE VIEW
    // -------------------------------------------------------------------------
    async loadScheduleTab(container) {
        container.innerHTML = `
            <!-- Calendar widget container -->
            <div class="calendar-widget">
                <div class="calendar-header">
                    <div class="calendar-title" id="cal-month-title">Month Year</div>
                    <div class="calendar-nav-btns">
                        <button class="calendar-nav-btn" id="cal-prev-month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                        <button class="calendar-nav-btn" id="cal-next-month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
                    </div>
                </div>

                <div class="calendar-weekdays">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>

                <div class="calendar-grid" id="cal-days-grid">
                    <!-- Loaded dynamically -->
                </div>
            </div>

            <!-- Schedule filtering controls -->
            <div class="finance-controls">
                <div class="search-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" id="sched-search-input" placeholder="Search classes, exams..." value="${this.schedFilters.q}">
                </div>

                <div class="filter-pills-bar" id="sched-type-pills">
                    <div class="filter-pill ${this.schedFilters.type === '' ? 'active' : ''}" data-type="">All Events</div>
                    <div class="filter-pill ${this.schedFilters.type === 'class' ? 'active' : ''}" data-type="class">Classes</div>
                    <div class="filter-pill ${this.schedFilters.type === 'exam' ? 'active' : ''}" data-type="exam">Exams</div>
                    <div class="filter-pill ${this.schedFilters.type === 'meeting' ? 'active' : ''}" data-type="meeting">Meetings</div>
                </div>
            </div>

            <!-- Timeline Agenda -->
            <div style="margin-top:20px;">
                <h4 style="font-family:var(--font-heading); margin-bottom:14px;" id="agenda-date-header">Agenda</h4>
                <div class="timeline-container" id="agenda-timeline-list">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;

        await this.loadEventsData();
        this.bindScheduleEvents();
    },

    async loadEventsData() {
        const year = this.schedCurrentDate.getFullYear();
        const month = this.schedCurrentDate.getMonth();
        const startDay = new Date(year, month - 1, 20).toISOString().split('T')[0] + " 00:00:00";
        const endDay = new Date(year, month + 2, 10).toISOString().split('T')[0] + " 23:59:59";

        try {
            let sql = "SELECT id, title, type, location, start_time, end_time, description, recurrence, color FROM schedule WHERE start_time >= ? AND end_time <= ?";
            const params = [startDay, endDay];

            if (this.schedFilters.q) {
                sql += " AND (title LIKE ? OR description LIKE ? OR location LIKE ?)";
                params.push(`%${this.schedFilters.q}%`, `%${this.schedFilters.q}%`, `%${this.schedFilters.q}%`);
            }

            if (this.schedFilters.type) {
                sql += " AND type = ?";
                params.push(this.schedFilters.type);
            }

            sql += " ORDER BY start_time ASC";

            this.schedEvents = await API.query(sql, params);
            this.renderCalendar();
            this.renderTimeline();
        } catch (err) {
            console.error('Failed to load schedule calendar: ' + err.message);
        }
    },

    renderCalendar() {
        const grid = document.getElementById('cal-days-grid');
        const monthTitle = document.getElementById('cal-month-title');
        if (!grid || !monthTitle) return;

        const year = this.schedCurrentDate.getFullYear();
        const month = this.schedCurrentDate.getMonth();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        monthTitle.textContent = `${monthNames[month]} ${year}`;

        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        let gridHTML = '';

        for (let i = 0; i < firstDayIndex; i++) {
            gridHTML += `<div class="calendar-day empty"></div>`;
        }

        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const tempDate = new Date(year, month, day);
            const dateStr = tempDate.toISOString().split('T')[0];
            
            const isToday = today.toDateString() === tempDate.toDateString() ? 'today' : '';
            const isSelected = this.schedSelectedDate.toDateString() === tempDate.toDateString() ? 'selected' : '';

            const dayEvents = this.schedEvents.filter(e => e.start_time.split(' ')[0] === dateStr);
            let dotsHTML = '';
            if (dayEvents.length > 0) {
                const dotEvents = dayEvents.slice(0, 3);
                dotsHTML = `<div class="calendar-day-dots">` + 
                    dotEvents.map(e => `<span class="calendar-dot" style="background:${e.color};"></span>`).join('') + 
                    `</div>`;
            }

            gridHTML += `
                <div class="calendar-day ${isToday} ${isSelected}" data-day="${day}">
                    <span>${day}</span>
                    ${dotsHTML}
                </div>
            `;
        }

        grid.innerHTML = gridHTML;
    },

    renderTimeline() {
        const timelineList = document.getElementById('agenda-timeline-list');
        const header = document.getElementById('agenda-date-header');
        if (!timelineList || !header) return;

        const dateStr = this.schedSelectedDate.toISOString().split('T')[0];
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        header.textContent = `Agenda for ${this.schedSelectedDate.toLocaleDateString('en-US', options)}`;

        const filteredEvents = this.schedEvents.filter(e => e.start_time.split(' ')[0] === dateStr);

        if (filteredEvents.length === 0) {
            timelineList.innerHTML = `
                <div class="empty-state" style="padding: 20px 0;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <h5>No classes or events today</h5>
                    <p>Tap another day or use the FAB button to add new courses.</p>
                </div>
            `;
            return;
        }

        timelineList.innerHTML = filteredEvents.map(e => {
            const startHour = new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endHour = new Date(e.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const typeLabels = { class: 'Class/Lecture', exam: 'Academic Exam', meeting: 'Study Meeting', event: 'Event/Social' };

            return `
                <div class="timeline-event-card ripple-container" onclick="Forms.showEventDetail(${JSON.stringify(e).replace(/"/g, '&quot;')}, () => PlannerPage.renderActiveTab())">
                    <span class="timeline-time-badge">${startHour} - ${endHour}</span>
                    <h5 class="timeline-title">${e.title}</h5>
                    <div class="timeline-meta">
                        <span class="type-badge ${e.type}">${typeLabels[e.type]}</span>
                        ${e.location ? `
                        <div class="timeline-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>${e.location}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${e.description ? `<div class="timeline-desc">${e.description}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    bindScheduleEvents() {
        const prevMonth = document.getElementById('cal-prev-month');
        if (prevMonth) {
            prevMonth.addEventListener('click', () => {
                this.schedCurrentDate.setMonth(this.schedCurrentDate.getMonth() - 1);
                this.loadEventsData();
            });
        }

        const nextMonth = document.getElementById('cal-next-month');
        if (nextMonth) {
            nextMonth.addEventListener('click', () => {
                this.schedCurrentDate.setMonth(this.schedCurrentDate.getMonth() + 1);
                this.loadEventsData();
            });
        }

        const grid = document.getElementById('cal-days-grid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const dayEl = e.target.closest('.calendar-day');
                if (!dayEl || dayEl.classList.contains('empty')) return;

                const day = parseInt(dayEl.dataset.day);
                this.schedSelectedDate = new Date(this.schedCurrentDate.getFullYear(), this.schedCurrentDate.getMonth(), day);
                
                const dayEls = grid.querySelectorAll('.calendar-day');
                dayEls.forEach(d => d.classList.remove('selected'));
                dayEl.classList.add('selected');

                this.renderTimeline();
            });
        }

        const searchInput = document.getElementById('sched-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.schedFilters.q = e.target.value;
                if (this.schedTimeout) clearTimeout(this.schedTimeout);
                this.schedTimeout = setTimeout(() => this.loadEventsData(), 400);
            });
        }

        const typePills = document.querySelectorAll('#sched-type-pills .filter-pill');
        typePills.forEach(pill => {
            pill.addEventListener('click', () => {
                typePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                this.schedFilters.type = pill.dataset.type;
                this.loadEventsData();
            });
        });
    },

    // -------------------------------------------------------------------------
    // 2. SUB-PAGE: ASSIGNMENT VIEW
    // -------------------------------------------------------------------------
    async loadAssignmentTab(container) {
        container.innerHTML = `
            <!-- Search, Filter, Sort Controls -->
            <div class="assignments-header-controls">
                <div class="search-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" id="as-search-input" placeholder="Search assignments..." value="${this.assignFilters.q}">
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:space-between; align-items:center;">
                    <div class="filter-pills-bar" id="as-status-pills" style="padding-bottom:0;">
                        <div class="filter-pill ${this.assignFilters.status === '' ? 'active' : ''}" data-status="">All</div>
                        <div class="filter-pill ${this.assignFilters.status === 'pending' ? 'active' : ''}" data-status="pending">To Do</div>
                        <div class="filter-pill ${this.assignFilters.status === 'in_progress' ? 'active' : ''}" data-status="in_progress">In Progress</div>
                        <div class="filter-pill ${this.assignFilters.status === 'submitted' ? 'active' : ''}" data-status="submitted">Submitted</div>
                    </div>

                    <div style="display:flex; gap:8px; align-items:center;">
                        <select id="as-priority-select" style="padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background-color:var(--surface-color); font-size:12px; font-weight:600; color:var(--text-secondary);">
                            <option value="">All Priorities</option>
                            <option value="high" ${this.assignFilters.priority === 'high' ? 'selected' : ''}>High</option>
                            <option value="medium" ${this.assignFilters.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="low" ${this.assignFilters.priority === 'low' ? 'selected' : ''}>Low</option>
                        </select>

                        <select id="as-sort-select" style="padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background-color:var(--surface-color); font-size:12px; font-weight:600; color:var(--text-secondary);">
                            <option value="due_date_asc" ${this.assignFilters.sort === 'due_date_asc' ? 'selected' : ''}>Due Soonest</option>
                            <option value="due_date_desc" ${this.assignFilters.sort === 'due_date_desc' ? 'selected' : ''}>Due Latest</option>
                            <option value="priority_desc" ${this.assignFilters.sort === 'priority_desc' ? 'selected' : ''}>Priority Rank</option>
                            <option value="progress_desc" ${this.assignFilters.sort === 'progress_desc' ? 'selected' : ''}>Highest Progress</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Assignments Cards Grid -->
            <div class="assignments-grid" id="as-cards-grid">
                <!-- Loaded dynamically -->
            </div>
        `;

        await this.loadAssignmentsData();
        this.bindAssignmentEvents();
    },

    async loadAssignmentsData() {
        try {
            let sql = "SELECT id, title, subject, priority, due_date, status, notes, progress, (strftime('%s', due_date) - strftime('%s', 'now')) as seconds_left FROM assignments WHERE 1=1";
            const params = [];

            if (this.assignFilters.q) {
                sql += " AND (title LIKE ? OR subject LIKE ? OR notes LIKE ?)";
                params.push(`%${this.assignFilters.q}%`, `%${this.assignFilters.q}%`, `%${this.assignFilters.q}%`);
            }

            if (this.assignFilters.priority) {
                sql += " AND priority = ?";
                params.push(this.assignFilters.priority);
            }

            if (this.assignFilters.status) {
                sql += " AND status = ?";
                params.push(this.assignFilters.status);
            }

            switch (this.assignFilters.sort) {
                case 'due_date_desc':
                    sql += " ORDER BY due_date DESC";
                    break;
                case 'priority_desc':
                    sql += " ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC, due_date ASC";
                    break;
                case 'progress_desc':
                    sql += " ORDER BY progress DESC, due_date ASC";
                    break;
                case 'due_date_asc':
                default:
                    sql += " ORDER BY due_date ASC";
                    break;
            }

            this.assignList = await API.query(sql, params);
            this.renderAssignments();
        } catch (err) {
            console.error('Failed to load assignments: ' + err.message);
        }
    },

    renderAssignments() {
        const grid = document.getElementById('as-cards-grid');
        if (!grid) return;

        if (this.assignList.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: span 2; padding: 48px 16px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    <h5>No tasks found</h5>
                    <p>Change your search parameters or log a new assignment.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.assignList.map(as => {
            const daysLeft = Math.ceil(as.seconds_left / 86400);
            let countdownText = '';
            let countdownClass = '';

            if (as.status === 'submitted') {
                countdownText = 'Completed';
                countdownClass = '';
            } else if (as.seconds_left < 0) {
                countdownText = 'Overdue';
                countdownClass = 'due-soon';
            } else if (daysLeft === 0) {
                countdownText = 'Due today';
                countdownClass = 'due-soon';
            } else {
                countdownText = `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`;
                countdownClass = daysLeft <= 2 ? 'due-soon' : '';
            }

            return `
                <div class="assignment-card ripple-container" onclick="Forms.showAssignmentDetail(${JSON.stringify(as).replace(/"/g, '&quot;')}, () => PlannerPage.renderActiveTab())">
                    <div class="assignment-card-header">
                        <div style="flex:1; overflow:hidden;">
                            <span class="assignment-subject">${as.subject}</span>
                            <h4 class="assignment-card-title" style="margin-top:6px;">${as.title}</h4>
                        </div>
                        <span class="priority-badge ${as.priority}">${as.priority}</span>
                    </div>

                    ${as.notes ? `<div class="assignment-notes">${as.notes}</div>` : ''}

                    <div class="assignment-progress-section">
                        <div class="progress-header">
                            <span class="assignment-countdown ${countdownClass}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>${countdownText}</span>
                            </span>
                            <span class="progress-percent">${as.progress}%</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill" style="width: ${as.progress}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    bindAssignmentEvents() {
        const searchInput = document.getElementById('as-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.assignFilters.q = e.target.value;
                if (this.assignTimeout) clearTimeout(this.assignTimeout);
                this.assignTimeout = setTimeout(() => this.loadAssignmentsData(), 400);
            });
        }

        const statusPills = document.querySelectorAll('#as-status-pills .filter-pill');
        statusPills.forEach(pill => {
            pill.addEventListener('click', () => {
                statusPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                this.assignFilters.status = pill.dataset.status;
                this.loadAssignmentsData();
            });
        });

        const prioritySel = document.getElementById('as-priority-select');
        if (prioritySel) {
            prioritySel.addEventListener('change', (e) => {
                this.assignFilters.priority = e.target.value;
                this.loadAssignmentsData();
            });
        }

        const sortSel = document.getElementById('as-sort-select');
        if (sortSel) {
            sortSel.addEventListener('change', (e) => {
                this.assignFilters.sort = e.target.value;
                this.loadAssignmentsData();
            });
        }
    }
};

/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\pages\schedule.js */

const SchedulePage = {
    currentDate: new Date(),
    selectedDate: new Date(),
    events: [],
    filters: {
        type: '',
        q: ''
    },

    async render(container) {
        container.innerHTML = `
            <div class="page-container" id="schedule-page">
                <!-- Header -->
                <div class="dashboard-header">
                    <div class="welcome-section">
                        <h2>My Schedule</h2>
                        <p>Plan courses, exam calendars, and study groups.</p>
                    </div>
                </div>

                <!-- Calendar widget container -->
                <div class="calendar-widget">
                    <div class="calendar-header">
                        <div class="calendar-title" id="cal-month-title">July 2026</div>
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
                        <input type="text" id="sched-search-input" placeholder="Search classes, exams..." value="${this.filters.q}">
                    </div>

                    <div class="filter-pills-bar" id="sched-type-pills">
                        <div class="filter-pill ${this.filters.type === '' ? 'active' : ''}" data-type="">All Events</div>
                        <div class="filter-pill ${this.filters.type === 'class' ? 'active' : ''}" data-type="class">Classes</div>
                        <div class="filter-pill ${this.filters.type === 'exam' ? 'active' : ''}" data-type="exam">Exams</div>
                        <div class="filter-pill ${this.filters.type === 'meeting' ? 'active' : ''}" data-type="meeting">Meetings</div>
                    </div>
                </div>

                <!-- Timeline Agenda -->
                <div style="margin-top:20px;">
                    <h4 style="font-family:var(--font-heading); margin-bottom:14px;" id="agenda-date-header">Agenda for July 1, 2026</h4>
                    <div class="timeline-container" id="agenda-timeline-list">
                        <!-- Loaded dynamically -->
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const page = document.getElementById('schedule-page');
            if (page) page.classList.add('active');
        }, 50);

        const fabBtn = document.getElementById('fab-action-schedule');
        if (fabBtn) {
            fabBtn.onclick = () => Forms.showAddEvent(() => this.refreshData());
        }

        await this.loadEventsData();
        this.bindEvents();
    },

    async loadEventsData() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        // SQLite compliant date limits
        const startDay = new Date(year, month - 1, 20).toISOString().split('T')[0] + " 00:00:00";
        const endDay = new Date(year, month + 2, 10).toISOString().split('T')[0] + " 23:59:59";

        try {
            let sql = "SELECT id, title, type, location, start_time, end_time, description, recurrence, color FROM schedule WHERE start_time >= ? AND end_time <= ?";
            const params = [startDay, endDay];

            if (this.filters.q) {
                sql += " AND (title LIKE ? OR description LIKE ? OR location LIKE ?)";
                params.push(`%${this.filters.q}%`, `%${this.filters.q}%`, `%${this.filters.q}%`);
            }

            if (this.filters.type) {
                sql += " AND type = ?";
                params.push(this.filters.type);
            }

            sql += " ORDER BY start_time ASC";

            this.events = await API.query(sql, params);
            this.renderCalendar();
            this.renderTimeline();
        } catch (err) {
            console.error('Failed to load schedule calendar: ' + err.message);
        }
    },

    async refreshData() {
        await this.loadEventsData();
    },

    renderCalendar() {
        const grid = document.getElementById('cal-days-grid');
        const monthTitle = document.getElementById('cal-month-title');
        if (!grid || !monthTitle) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
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
            const isSelected = this.selectedDate.toDateString() === tempDate.toDateString() ? 'selected' : '';

            // Check events matching date string
            const dayEvents = this.events.filter(e => e.start_time.split(' ')[0] === dateStr);
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

        const dateStr = this.selectedDate.toISOString().split('T')[0];
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        header.textContent = `Agenda for ${this.selectedDate.toLocaleDateString('en-US', options)}`;

        const filteredEvents = this.events.filter(e => e.start_time.split(' ')[0] === dateStr);

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
                <div class="timeline-event-card ripple-container" onclick="Forms.showEventDetail(${JSON.stringify(e).replace(/"/g, '&quot;')}, () => SchedulePage.refreshData())">
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

    bindEvents() {
        document.getElementById('cal-prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.loadEventsData();
        });

        document.getElementById('cal-next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.loadEventsData();
        });

        const grid = document.getElementById('cal-days-grid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const dayEl = e.target.closest('.calendar-day');
                if (!dayEl || dayEl.classList.contains('empty')) return;

                const day = parseInt(dayEl.dataset.day);
                this.selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
                
                const dayEls = grid.querySelectorAll('.calendar-day');
                dayEls.forEach(d => d.classList.remove('selected'));
                dayEl.classList.add('selected');

                this.renderTimeline();
            });
        }

        const searchInput = document.getElementById('sched-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.q = e.target.value;
                if (this.searchTimeout) clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => this.loadEventsData(), 400);
            });
        }

        const typePills = document.querySelectorAll('#sched-type-pills .filter-pill');
        typePills.forEach(pill => {
            pill.addEventListener('click', () => {
                typePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                this.filters.type = pill.dataset.type;
                this.loadEventsData();
            });
        });
    }
};

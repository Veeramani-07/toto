// State Management
let habits = [];
let completions = [];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let chartInstance = null;
let currentUser = null;

// API Endpoints
const API_URL = '/api/habits';
const AUTH_URL = '/api/auth';

// Read CSRF token from cookie set by Spring Security
function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function csrfHeaders(extra = {}) {
    return { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrfToken(), ...extra };
}

// DOM Elements - Auth Panels
const authOverlay = document.getElementById('auth-overlay');
const appContainer = document.getElementById('app-container');
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');
const logoutBtn = document.getElementById('logout-btn');
const displayUsername = document.getElementById('display-username');

// DOM Elements - Dashboard
const currentMonthLabel = document.getElementById('current-month-label');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const habitsStartDateEl = document.getElementById('habits-start-date');
const bestHabitEl = document.getElementById('best-habit-name');
const worstHabitEl = document.getElementById('worst-habit-name');

const days100PercentEl = document.getElementById('days-100-percent');
const days50PercentEl = document.getElementById('days-50-percent');
const days0PercentEl = document.getElementById('days-0-percent');

const habitTable = document.getElementById('habit-table');
const habitModal = document.getElementById('habit-modal');
const habitForm = document.getElementById('habit-form');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default date in modal to local today
    const localToday = new Date();
    const y = localToday.getFullYear();
    const m = String(localToday.getMonth() + 1).padStart(2, '0');
    const d = String(localToday.getDate()).padStart(2, '0');
    document.getElementById('habit-start-date').value = `${y}-${m}-${d}`;
    
    setupAuthListeners();
    setupEventListeners();
    checkAuthStatus();
});

// Setup Auth Page Event Listeners
function setupAuthListeners() {
    goToRegister.addEventListener('click', () => {
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'block';
    });

    goToLogin.addEventListener('click', () => {
        registerFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
    });

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
}

// Check Authentication Status
async function checkAuthStatus() {
    try {
        const response = await fetch(`${AUTH_URL}/me`);
        if (response.ok) {
            const user = await response.json();
            loginUserSuccess(user);
        } else {
            showAuthScreen();
        }
    } catch (error) {
        showAuthScreen();
    }
}

// Transitions to Dashboard on Login Success
function loginUserSuccess(user) {
    currentUser = user;
    displayUsername.textContent = user.username;
    authOverlay.style.display = 'none';
    appContainer.style.display = 'flex';
    loadDashboard();
}

// Transitions to login page
function showAuthScreen() {
    currentUser = null;
    appContainer.style.display = 'none';
    authOverlay.style.display = 'flex';
    destroyChart();
}

// Handle Login submit
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Welcome back, ' + data.username + '!', 'success');
            loginForm.reset();
            loginUserSuccess(data);
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Handle Signup submit
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Account created successfully! Please log in.', 'success');
            registerForm.reset();
            // Toggle back to login panel
            registerFormContainer.style.display = 'none';
            loginFormContainer.style.display = 'block';
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').focus();
        } else {
            throw new Error(data.error || 'Registration failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Handle Log out
async function handleLogout() {
    try {
        await fetch(`${AUTH_URL}/logout`, { method: 'POST', headers: csrfHeaders() });
        showToast('Logged out successfully.', 'info');
    } catch (error) {
        // Continue transition even if API fails
    }
    showAuthScreen();
}

// Setup Dashboard Event Listeners
function setupEventListeners() {
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    // Modal Events
    openModalBtn.addEventListener('click', () => {
        habitModal.classList.add('active');
        document.getElementById('habit-name').focus();
    });

    const closeActions = [closeModalBtn, cancelModalBtn];
    closeActions.forEach(btn => {
        btn.addEventListener('click', () => {
            habitModal.classList.remove('active');
            habitForm.reset();
        });
    });

    // Form Submit
    habitForm.addEventListener('submit', handleAddHabit);
}

// Change Active Month
function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    loadDashboard();
}

// Load Dashboard Data
async function loadDashboard() {
    updateMonthLabel();
    const success = await fetchHabits();
    if (success) {
        await fetchCompletions();
        renderGridTable();
        updateStatsAndChart();
    }
}

// Update Header Label
function updateMonthLabel() {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    currentMonthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
}

// Fetch Habits
async function fetchHabits() {
    try {
        const response = await fetch(API_URL);
        if (response.status === 401) {
            showAuthScreen();
            return false;
        }
        if (!response.ok) throw new Error('Failed to fetch habits');
        habits = await response.json();
        
        // Update habits start date in sidebar
        if (habits.length > 0) {
            const startDates = habits.map(h => parseLocalDate(h.startDate));
            const earliestDate = new Date(Math.min(...startDates));
            
            const options = { month: '2-digit', day: '2-digit', year: 'numeric' };
            habitsStartDateEl.textContent = earliestDate.toLocaleDateString('en-US', options);
        } else {
            habitsStartDateEl.textContent = 'N/A';
        }
        return true;
    } catch (error) {
        showToast(error.message, 'error');
        return false;
    }
}

// Fetch completions for the selected month
async function fetchCompletions() {
    if (habits.length === 0) {
        completions = [];
        return;
    }

    const totalDays = getDaysInMonth(currentYear, currentMonth);
    const startDateStr = formatDateString(currentYear, currentMonth, 1);
    const endDateStr = formatDateString(currentYear, currentMonth, totalDays);

    try {
        const response = await fetch(`${API_URL}/completions?start=${startDateStr}&end=${endDateStr}`);
        if (response.status === 401) {
            showAuthScreen();
            return;
        }
        if (!response.ok) throw new Error('Failed to fetch completions');
        completions = await response.json();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Render dynamic Habit grid table
function renderGridTable() {
    const totalDays = getDaysInMonth(currentYear, currentMonth);
    
    if (habits.length === 0) {
        habitTable.innerHTML = `
            <tbody>
                <tr>
                    <td style="text-align: center; padding: 40px; color: var(--color-text-muted);">
                        <i class="fa-solid fa-clipboard-question" style="font-size: 2.5rem; display: block; margin-bottom: 12px; color: var(--color-primary);"></i>
                        No habits registered. Click "Add New Habit" to begin tracking.
                    </td>
                </tr>
            </tbody>
        `;
        return;
    }

    // 1. Generate Table Header
    let headerHTML = '<thead>';
    headerHTML += '<tr>';
    headerHTML += '<th class="habit-name-col" rowspan="2">Habit Names</th>';
    
    let daysLeft = totalDays;
    let weekIndex = 1;
    while (daysLeft > 0) {
        const weekColspan = Math.min(7, daysLeft);
        headerHTML += `<th class="week-header" colspan="${weekColspan}">Week ${weekIndex}</th>`;
        daysLeft -= weekColspan;
        weekIndex++;
    }
    
    headerHTML += '<th class="progress-col" rowspan="2">Total Completed</th>';
    headerHTML += '</tr>';

    headerHTML += '<tr>';
    for (let day = 1; day <= totalDays; day++) {
        const dateObj = new Date(currentYear, currentMonth, day);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        headerHTML += `
            <th>
                <div class="day-label-day">${dayName}</div>
                <div class="day-label-num">${day}</div>
            </th>
        `;
    }
    headerHTML += '</tr>';
    headerHTML += '</thead>';

    // 2. Generate Table Body Rows
    let bodyHTML = '<tbody>';
    
    habits.forEach(habit => {
        const habitId = habit.id;
        let completedInMonth = 0;
        let trackedDaysCount = 0;

        const habitStartDate = parseLocalDate(habit.startDate);

        let rowCellsHTML = '';

        for (let day = 1; day <= totalDays; day++) {
            const dateObj = new Date(currentYear, currentMonth, day);
            dateObj.setHours(0,0,0,0);
            
            const dateStr = formatDateString(currentYear, currentMonth, day);
            const isBeforeStart = dateObj < habitStartDate;

            const completion = completions.find(c => c.habitId === habitId && c.date === dateStr);
            const isCompleted = completion ? completion.completed : false;

            if (isCompleted) completedInMonth++;
            if (!isBeforeStart) trackedDaysCount++;

            if (isBeforeStart) {
                rowCellsHTML += `
                    <td class="day-cell" style="background: rgba(0, 0, 0, 0.2); opacity: 0.3;" title="Habit not started yet">
                        <i class="fa-solid fa-lock" style="font-size: 0.65rem; color: var(--color-text-muted);"></i>
                    </td>
                `;
            } else {
                rowCellsHTML += `
                    <td class="day-cell">
                        <label class="grid-checkbox-wrapper">
                            <input type="checkbox" class="grid-checkbox" 
                                   data-habit-id="${habitId}" 
                                   data-date="${dateStr}" 
                                   ${isCompleted ? 'checked' : ''}
                                   onchange="handleCheckboxToggle(this)">
                            <i class="fa-solid fa-check grid-check-icon"></i>
                        </label>
                    </td>
                `;
            }
        }

        const percent = trackedDaysCount > 0 ? Math.round((completedInMonth / trackedDaysCount) * 100) : 0;

        bodyHTML += '<tr>';
        bodyHTML += `
            <td class="habit-name-col">
                <div class="habit-name-wrapper">
                    <span class="habit-name-text" title="${escapeHTML(habit.name)}">${escapeHTML(habit.name)}</span>
                    <button class="btn-habit-delete" onclick="handleDeleteHabit(${habitId})" title="Delete Habit">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        bodyHTML += rowCellsHTML;
        bodyHTML += `
            <td class="progress-col">
                <div class="progress-bar-wrapper" title="${completedInMonth} of ${trackedDaysCount} completed">
                    <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                    <div class="progress-text-label">${percent}%</div>
                </div>
            </td>
        `;
        bodyHTML += '</tr>';
    });

    bodyHTML += '</tbody>';
    habitTable.innerHTML = headerHTML + bodyHTML;
}

// Toggle Checkbox event handler
window.handleCheckboxToggle = async function(checkbox) {
    const habitId = parseInt(checkbox.dataset.habitId);
    const dateStr = checkbox.dataset.date;
    const completed = checkbox.checked;

    let completion = completions.find(c => c.habitId === habitId && c.date === dateStr);
    if (completion) {
        completion.completed = completed;
    } else {
        completions.push({ habitId, date: dateStr, completed });
    }

    recalculateProgressColumn(habitId);
    updateStatsAndChart();

    try {
        const response = await fetch(`${API_URL}/toggle`, {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ habitId, date: dateStr, completed })
        });
        if (response.status === 401) {
            showAuthScreen();
            return;
        }
        if (!response.ok) throw new Error('Sync error');
    } catch (error) {
        showToast('Failed to sync completion log: ' + error.message, 'error');
        if (completion) {
            completion.completed = !completed;
        } else {
            completions = completions.filter(c => !(c.habitId === habitId && c.date === dateStr));
        }
        checkbox.checked = !completed;
        recalculateProgressColumn(habitId);
        updateStatsAndChart();
    }
};

// Recalculate horizontal progress bar for a single habit row
function recalculateProgressColumn(habitId) {
    const totalDays = getDaysInMonth(currentYear, currentMonth);
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const habitStartDate = parseLocalDate(habit.startDate);

    let completedInMonth = 0;
    let trackedDaysCount = 0;

    for (let day = 1; day <= totalDays; day++) {
        const dateObj = new Date(currentYear, currentMonth, day);
        dateObj.setHours(0,0,0,0);
        const dateStr = formatDateString(currentYear, currentMonth, day);

        const isBeforeStart = dateObj < habitStartDate;
        const completion = completions.find(c => c.habitId === habitId && c.date === dateStr);
        const isCompleted = completion ? completion.completed : false;

        if (isCompleted) completedInMonth++;
        if (!isBeforeStart) trackedDaysCount++;
    }

    const percent = trackedDaysCount > 0 ? Math.round((completedInMonth / trackedDaysCount) * 100) : 0;
    
    const checkboxEl = document.querySelector(`.grid-checkbox[data-habit-id="${habitId}"]`);
    if (checkboxEl) {
        const tr = checkboxEl.closest('tr');
        if (tr) {
            const fill = tr.querySelector('.progress-bar-fill');
            const label = tr.querySelector('.progress-text-label');
            const wrapper = tr.querySelector('.progress-bar-wrapper');
            if (fill && label) {
                fill.style.width = `${percent}%`;
                label.textContent = `${percent}%`;
                wrapper.title = `${completedInMonth} of ${trackedDaysCount} completed`;
            }
        }
    }
}

// Calculate Dashboard stats and refresh the top Line Chart
function updateStatsAndChart() {
    if (habits.length === 0) {
        bestHabitEl.textContent = 'N/A';
        worstHabitEl.textContent = 'N/A';
        days100PercentEl.textContent = '0 Days';
        days50PercentEl.textContent = '0 Days';
        days0PercentEl.textContent = '0 Days';
        destroyChart();
        return;
    }

    const totalDays = getDaysInMonth(currentYear, currentMonth);
    const today = new Date();
    today.setHours(0,0,0,0);

    let bestHabitName = 'N/A';
    let worstHabitName = 'N/A';
    let maxPercent = -1;
    let minPercent = 101;

    habits.forEach(habit => {
        const habitStartDate = parseLocalDate(habit.startDate);

        let completed = 0;
        let activeDays = 0;

        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(currentYear, currentMonth, d);
            dateObj.setHours(0,0,0,0);
            
            const dateStr = formatDateString(currentYear, currentMonth, d);
            if (dateObj >= habitStartDate) {
                activeDays++;
                const comp = completions.find(c => c.habitId === habit.id && c.date === dateStr);
                if (comp && comp.completed) completed++;
            }
        }

        const percent = activeDays > 0 ? (completed / activeDays) * 100 : 0;
        
        if (activeDays > 0) {
            if (percent > maxPercent) {
                maxPercent = percent;
                bestHabitName = habit.name;
            }
            if (percent < minPercent) {
                minPercent = percent;
                worstHabitName = habit.name;
            }
        }
    });

    if (maxPercent > 0 && bestHabitName !== 'N/A') {
        bestHabitEl.textContent = bestHabitName;
    } else {
        bestHabitEl.textContent = 'N/A';
    }

    if (minPercent < 100 && minPercent < maxPercent && worstHabitName !== 'N/A') {
        worstHabitEl.textContent = worstHabitName;
    } else {
        worstHabitEl.textContent = 'N/A';
    }

    let days100 = 0;
    let days50 = 0;
    let days0 = 0;

    const chartLabels = [];
    const chartData = [];

    for (let day = 1; day <= totalDays; day++) {
        const dateObj = new Date(currentYear, currentMonth, day);
        dateObj.setHours(0,0,0,0);
        
        const dateStr = formatDateString(currentYear, currentMonth, day);

        let activeHabitsCount = 0;
        let completedHabitsCount = 0;

        habits.forEach(habit => {
            const hStart = parseLocalDate(habit.startDate);
            if (dateObj >= hStart) {
                activeHabitsCount++;
                const comp = completions.find(c => c.habitId === habit.id && c.date === dateStr);
                if (comp && comp.completed) completedHabitsCount++;
            }
        });

        let dailyCompletionRate = 0;
        if (activeHabitsCount > 0) {
            dailyCompletionRate = (completedHabitsCount / activeHabitsCount) * 100;
        }

        const isFuture = dateObj > today;
        
        if (!isFuture && activeHabitsCount > 0) {
            if (dailyCompletionRate === 100) days100++;
            if (dailyCompletionRate >= 50) days50++;
            if (dailyCompletionRate === 0) days0++;
        }

        chartLabels.push(day.toString());
        
        if (isFuture) {
            chartData.push(null);
        } else {
            chartData.push(Math.round(dailyCompletionRate));
        }
    }

    days100PercentEl.textContent = `${days100} ${days100 === 1 ? 'Day' : 'Days'}`;
    days50PercentEl.textContent = `${days50} ${days50 === 1 ? 'Day' : 'Days'}`;
    days0PercentEl.textContent = `${days0} ${days0 === 1 ? 'Day' : 'Days'}`;

    renderLineChart(chartLabels, chartData);
}

// Render dynamic Chart.js curve
function renderLineChart(labels, data) {
    const ctx = document.getElementById('completion-chart').getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.update();
    } else {
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Completion rate',
                    data: data,
                    borderColor: '#10b981',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: 'rgba(255, 255, 255, 0.8)',
                    pointBorderWidth: 1.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Completion: ${context.parsed.y}%`;
                            }
                        },
                        backgroundColor: '#0d1324',
                        titleColor: '#8e9aae',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
                        ticks: { color: '#8e9aae', font: { size: 10 } }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
                        ticks: {
                            color: '#8e9aae',
                            stepSize: 20,
                            font: { size: 10 },
                            callback: function(value) { return value + '%'; }
                        }
                    }
                }
            }
        });
    }
}

// Destroy Chart helper
function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

// Handle Add Habit form submit
async function handleAddHabit(e) {
    e.preventDefault();

    const name = document.getElementById('habit-name').value.trim();
    const category = document.getElementById('habit-category').value;
    const startDate = document.getElementById('habit-start-date').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: csrfHeaders(),
            body: JSON.stringify({ name, category, startDate })
        });

        if (response.status === 401) {
            showAuthScreen();
            return;
        }
        if (!response.ok) throw new Error('Failed to create habit');

        const newHabit = await response.json();
        habits.push(newHabit);
        
        habitModal.classList.remove('active');
        habitForm.reset();

        showToast('Habit successfully added!', 'success');
        loadDashboard();

    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Handle delete habit
window.handleDeleteHabit = async function(id) {
    if (!window._confirmDelete) return;
    window._confirmDelete(id);
};

function confirmDeleteHabit(id) {
    showConfirmDialog('Delete this habit and all its history?', async () => {

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: csrfHeaders()
        });

        if (response.status === 401) {
            showAuthScreen();
            return;
        }
        if (!response.ok) throw new Error('Failed to delete habit');

        habits = habits.filter(h => h.id !== id);
        completions = completions.filter(c => c.habitId !== id);

        showToast('Habit deleted successfully', 'info');
        renderGridTable();
        updateStatsAndChart();

    } catch (error) {
        showToast(error.message, 'error');
    }
    });
}

// Date Helpers
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Format date to YYYY-MM-DD
function formatDateString(year, month, day) {
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Helper to parse 'YYYY-MM-DD' as a local Date object timezone-safely
function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
}

// Escape HTML helper
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Toast Notifications helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = document.createElement('i');
    icon.className = 'toast-icon fa-solid ' +
        (type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Custom confirm dialog (replaces browser confirm())
function showConfirmDialog(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,13,0.8);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#0d1324;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:28px 32px;display:flex;flex-direction:column;gap:20px;max-width:360px;width:90%;';

    const msg = document.createElement('p');
    msg.textContent = message;
    msg.style.cssText = 'color:#f3f4f6;font-size:0.95rem;text-align:center;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.onclick = () => overlay.remove();

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Delete';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.style.background = '#f43f5e';
    confirmBtn.onclick = () => { overlay.remove(); onConfirm(); };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    box.appendChild(msg);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

window._confirmDelete = confirmDeleteHabit;

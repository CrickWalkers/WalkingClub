// --- Supabase Initialization ---
const supabaseUrl = 'https://ukkyukgbcrnxkzszlkwy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVra3l1a2diY3JueGt6c3psa3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMDEwMzEsImV4cCI6MjA2NTY3NzAzMX0.ExT2ucsBZW7ZslXRfPtlcgY-nSX7RF15KB2iIdvJWvs';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- DOM Elements ---
const yearSelect = document.getElementById('year');
const monthSelect = document.getElementById('month');
const calendar = document.getElementById('calendar');
const modalDate = document.getElementById('modalDate');
const plannedWalksList = document.getElementById('plannedWalksList');

let selectedDate = null;
let plannedWalks = [];

// --- Utility Functions ---
function pad(n) {
    return n < 10 ? '0' + n : n;
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// --- Populate year dropdown ---
function populateYears() {
    for (let year = 2025; year <= 2050; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    yearSelect.value = new Date().getFullYear();
}

// --- Generate calendar UI ---
function generateCalendar() {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const firstDay = new Date(year, month, 1).getDay();

    let table = '<tr>';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        table += `<th>${day}</th>`;
    });
    table += '</tr><tr>';

    for (let i = 0; i < firstDay; i++) {
        table += '<td></td>';
    }

    for (let day = 1; day <= daysInMonth[month]; day++) {
        if ((day + firstDay - 1) % 7 === 0 && day !== 1) {
            table += '</tr><tr>';
        }
        table += `<td onclick="openModal(${day})">${day}</td>`;
    }

    table += '</tr>';
    calendar.innerHTML = table;
}

// --- Modal open ---
window.openModal = function(day) {
    const year = yearSelect.value;
    const month = parseInt(monthSelect.value) + 1;
    selectedDate = `${pad(day)}-${pad(month)}-${year}`;
    modalDate.textContent = selectedDate;

    // Clear inputs
    document.getElementById('walkType').value = 'local';
    document.getElementById('startTime').value = '';
    document.getElementById('walkInfo').value = '';

    document.getElementById('walkModal').style.display = 'block';
};

// --- Close modal ---
window.closeModal = function() {
    document.getElementById('walkModal').style.display = 'none';
};

// --- Load planned walks from Supabase ---
async function loadPlannedWalks() {
    const { data, error } = await supabase
        .from('planned_walks')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        console.error('🔴 Error loading walks from Supabase:', error);
        return;
    }

    console.log('✅ Loaded walks:', data);
    plannedWalks = data || [];
    displayPlannedWalks();
}

// --- Save walk details to Supabase ---
window.saveWalkDetails = async function () {
    const walkType = document.getElementById('walkType').value.trim();
    const startTime = document.getElementById('startTime').value.trim();
    const walkInfo = document.getElementById('walkInfo').value.trim();

    if (!selectedDate) {
        alert("❗ Select a date first");
        return;
    }

    if (!startTime || !walkInfo) {
        alert("❗ Please fill out all fields.");
        return;
    }

    const newWalk = {
        date: selectedDate,
        type: walkType,
        time: startTime,
        info: walkInfo
    };

    console.log("📤 Attempting to insert:", newWalk);

    const { data, error } = await supabase
        .from('planned_walks')
        .insert([newWalk]);

    if (error) {
        console.error('🔴 Supabase insert failed:', error);
        alert('⚠️ Failed to save walk. Check console for details.');
        return;
    }

    console.log('✅ Walk inserted:', data);
    plannedWalks.push(data[0]);
    displayPlannedWalks();
    closeModal();
};

// --- Display walks on UI ---
function displayPlannedWalks() {
    plannedWalksList.innerHTML = '';
    plannedWalks.forEach((walk) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${walk.date}</span><br>
            Type: ${walk.type}<br>
            Time: ${walk.time}<br>
            Info: ${walk.info}
            <button class="delete-btn" onclick="deleteWalk('${walk.id}')">Delete</button>
        `;
        plannedWalksList.appendChild(li);
    });
}

// --- Delete walk from Supabase ---
window.deleteWalk = async function(id) {
    const { error } = await supabase
        .from('planned_walks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('🔴 Error deleting walk:', error);
        alert('Failed to delete walk');
        return;
    }

    plannedWalks = plannedWalks.filter(walk => walk.id !== id);
    displayPlannedWalks();
};

// --- Map initialization ---
function initializeMap() {
    const map = L.map('map').setView([51.8523, -3.1447], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([51.8523, -3.1447]).addTo(map);
    marker.bindPopup('<b>Walking Club Start</b><br>Meet up here!').openPopup();
}

// --- On page load ---
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    populateYears();
    generateCalendar();
    loadPlannedWalks();

    yearSelect.addEventListener('change', generateCalendar);
    monthSelect.addEventListener('change', generateCalendar);
});

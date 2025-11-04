const tips = [
  'Drink plenty of water throughout the day.',
  'Take the stairs instead of the elevator.',
  'Aim for at least 30 minutes of physical activity daily.',
  'Stretch your body after waking up.',
  'Prioritize consistency over intensity for long-term progress.',
  'Include both cardio and strength training in your routine.',
  'Get enough sleep to help your muscles recover.',
  'Don’t skip your warm-up or cool-down.',
  'Listen to your body and rest when needed.',
  'Plan your workouts in advance to stay on track.'
];

function showRandomTip() {
  const randomIndex = Math.floor(Math.random() * tips.length);
  document.getElementById('tip').innerText = tips[randomIndex];
}

document.getElementById('newTipBtn').addEventListener('click', showRandomTip);

function getTodayKey() {
  const today = new Date();
  // Format: yyyy-mm-dd
  return `water_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getTodayIntake() {
  const key = getTodayKey();
  return parseFloat(localStorage.getItem(key)) || 0;
}

function setTodayIntake(liters) {
  const key = getTodayKey();
  localStorage.setItem(key, liters);
}

function updateWaterMessage() {
  const intake = getTodayIntake();
  document.getElementById('waterMessage').innerText = intake
    ? `Today's water intake: ${intake.toFixed(2)} liters`
    : `No water intake recorded for today yet.`;
}

const waterForm = document.getElementById('waterForm');
// ---- Dynamic 7-Day Water Intake Storage and Chart Logic ----
// Storage format: key = 'water_YYYY-MM-DD', value = float (liters)

/**
 * Helper to get string for YYYY-MM-DD N days ago
 */
function getDateKeyNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `water_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Retrieve last 7 days of water data from localStorage
 * Returns array of {date: 'MM-DD', intake: float}
 */
function getLast7DaysWaterData() {
  let arr = [];
  for (let i = 6; i >= 0; i--) {
    const key = getDateKeyNDaysAgo(i);
    const dt = key.split('_')[1]; // in yyyy-mm-dd
    // format to MM-DD for X axis
    const dateLabel = dt.slice(5);
    const value = parseFloat(localStorage.getItem(key)) || 0;
    arr.push({date: dateLabel, intake: value});
  }
  return arr;
}

/**
 * Keep only the latest 7 days of data in localStorage (removes older ones)
 */
function pruneOldWaterData() {
  const keepKeys = new Set(Array.from({length: 7}, (_, i) => getDateKeyNDaysAgo(i)));
  Object.keys(localStorage)
    .filter(k => k.startsWith('water_') && !keepKeys.has(k))
    .forEach(oldKey => localStorage.removeItem(oldKey));
}

let waterChart;

// --- Chart.js plugin for bar value labels on top ---
const barLabelPlugin = {
  id: 'barLabelPlugin',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    chart.data.datasets.forEach(function(dataset, i) {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach(function(bar, index) {
        const val = dataset.data[index];
        ctx.save();
        ctx.font = '500 1.03rem Segoe UI, Arial, sans-serif';
        ctx.fillStyle = '#144379';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.globalAlpha = 0.95;
        ctx.fillText(val > 0 ? val.toFixed(2) : '', bar.x, bar.y - 7);
        ctx.restore();
      });
    });
  },
};

/**
 * Helper to create a vertical gradient for chart bars
 */
function getBlueGradient(ctx, chartArea) {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, '#57b8fa');
  gradient.addColorStop(1, '#2967ad');
  return gradient;
}

/**
 * Render/update the Chart.js chart with the last 7 days real data
 */
function renderChartFromHistory() {
  const dataArr = getLast7DaysWaterData();
  const canvas = document.getElementById('waterChart');
  const ctx = canvas.getContext('2d');
  if (waterChart) waterChart.destroy();
  // Chart will re-compute width/height from container for responsiveness
  let chartCfg = {
    type: 'bar',
    data: {
      labels: dataArr.map(entry => entry.date),
      datasets: [{
        label: 'Liters of Water',
        data: dataArr.map(entry => entry.intake),
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return '#298DCE';
          return getBlueGradient(ctx, chartArea);
        },
        borderRadius: 15,
        maxBarThickness: 44,
        categoryPercentage: 0.6,
        barPercentage: 0.88,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#e8f5fd',
          titleColor: '#2967ad',
          bodyColor: '#0277bd',
          borderColor: '#90caf9',
          borderWidth: 1.2,
          callbacks: {
            label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y} L  `
          }
        },
      },
      animation: {
        duration: 950,
        easing: 'easeOutQuart',
      },
      layout: { padding: {top: 5, bottom: 5} },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#366798', font: { weight: 700 } }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 3.3,
          ticks: {
            stepSize: 0.5,
            color: '#4e91c7',
            font: { weight: 500 }
          },
          grid: {
            color: 'rgba(110,198,255,0.14)',
            borderDash: [4],
            tickColor: 'rgba(110,198,255,0.13)'
          }
        }
      }
    },
    plugins: [barLabelPlugin]
  };
  // Make parent div same aspect as chart for responsiveness
  canvas.parentNode.style.height = '220px';
  waterChart = new Chart(ctx, chartCfg);
}

// --- Success message UI ---
function showSuccessMsg(msg) {
  const node = document.getElementById('successMessage');
  node.innerText = msg;
  node.classList.add('show');
  node.style.display = 'block';
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => { node.style.display = 'none'; }, 650);
  }, 1650);
}

// ========== Hydration Daily Goal & Circular Progress ===========

const DEFAULT_GOAL = 2.0;
const GOAL_KEY = 'dailyGoal';

/** Load user goal or fallback to default (2.0 L) */
function getGoal() {
  return parseFloat(localStorage.getItem(GOAL_KEY)) || DEFAULT_GOAL;
}
/** Save goal to localStorage, must be > 0.3L and < 10L */
function setGoal(goal) {
  if (goal < 0.3) goal = 0.3;
  if (goal > 10) goal = 10;
  localStorage.setItem(GOAL_KEY, goal);
}

// --- DOM refs ---
const goalInput = document.getElementById('goalInput');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const hydrationSummaryNode = document.getElementById('hydrationSummary');
const celebrationNode = document.getElementById('celebration');
const progressCircle = document.getElementById('progressCircle');
const progressPercentNode = document.getElementById('progressPercent');

// --- State/utility ---
function getTodayIntake() {
  const key = getDateKeyNDaysAgo(0);
  return parseFloat(localStorage.getItem(key)) || 0;
}

/** Update hydration summary text and aria-live */
function updateHydrationSummary() {
  const goal = getGoal();
  const intake = getTodayIntake();
  const pct = Math.min(100, ((intake / goal) * 100) || 0);
  hydrationSummaryNode.innerText = `You have consumed ${intake.toFixed(2)} L of ${goal.toFixed(2)} L (${pct.toFixed(0)}%).`;
}

/** Animate circular progress indicator based on today's intake vs. goal */
function updateCircularProgress(animate=true) {
  const goal = getGoal();
  const intake = getTodayIntake();
  let pct = Math.min(1, intake / goal || 0);
  // SVG math
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct);
  // Animate stroke-dashoffset for smooth update
  progressCircle.setAttribute('stroke-dasharray', circ);
  if (animate) {
    progressCircle.style.transition = 'stroke-dashoffset 0.95s cubic-bezier(.57,.81,.29,1.01)';
  } else {
    progressCircle.style.transition = 'none';
  }
  progressCircle.setAttribute('stroke-dashoffset', offset);
  progressPercentNode.innerText = `${Math.round(pct * 100)}%`;
}

// --- Celebrate/confetti ---
let didCelebrate = false;
function showCelebrationIfGoal() {
  const goal = getGoal();
  const intake = getTodayIntake();
  celebrationNode.innerHTML = '';
  if (intake >= goal && goal > 0.1) {
    celebrationNode.innerHTML = 'Goal achieved 🎉';
    celebrationNode.style.display = 'block';
    celebrationNode.classList.add('show');
    confettiAnim();
    didCelebrate = true;
  } else {
    celebrationNode.classList.remove('show');
    setTimeout(() => { celebrationNode.style.display = 'none'; }, 600);
    didCelebrate = false;
  }
}

// Simple colored dot/circle confetti (vanilla CSS/JS)
function confettiAnim() {
  if (document.getElementById('confetti-box')) return; // No stacking
  const box = document.createElement('div'); box.id = 'confetti-box';
  box.style.position = 'fixed'; box.style.left = 0; box.style.top = 0; box.style.width = '100vw'; box.style.height = '100vh';
  box.style.pointerEvents = 'none'; box.style.zIndex = 30;
  for (let i = 0; i < 26; ++i) {
    let d = document.createElement('div');
    d.className = 'confetti-dot';
    d.style.background = `hsl(${180+Math.random()*110},90%,${63+Math.random()*20}%)`;
    d.style.position = 'absolute';
    d.style.left = `${4 + Math.random() * 92}vw`;
    d.style.top = `-${Math.random()*6}vh`;
    d.style.width = d.style.height = `${0.61+Math.random()*0.36}rem`;
    d.style.borderRadius = '50%';
    d.style.opacity = 0.86+0.12*Math.random();
    d.style.transform = `scale(${0.9+Math.random()*0.5})`;
    d.style.transition = 'transform 0.6s';
    box.appendChild(d);
    setTimeout(()=>{
      d.style.top = `${64+Math.random()*27}vh`; d.style.opacity = 0.18+Math.random()*0.36; d.style.transform += ' scale(0.91)';
    }, Math.random()*380)
  }
  document.body.appendChild(box);
  setTimeout(()=>{ box.remove(); }, 2100);
}

/** Set initial goal UI state */
function setGoalInputDisplay() {
  const g = getGoal();
  goalInput.value = g.toFixed(2);
}

// On Save Goal
saveGoalBtn.addEventListener('click', () => {
  let val = parseFloat(goalInput.value);
  if (!val || val < 0.3) val = DEFAULT_GOAL;
  setGoal(val);
  setGoalInputDisplay();
  updateHydrationSummary();
  updateCircularProgress();
  showCelebrationIfGoal();
  showSuccessMsg('Goal saved!');
});

goalInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveGoalBtn.click(); }
});

// Update all progress on new water entry
function updateGoalUI(animate=true) {
  setGoalInputDisplay();
  updateHydrationSummary();
  updateCircularProgress(animate);
  showCelebrationIfGoal();
}
// --- END GOAL + CIRCLE ---

// ========= EXISTING LOGIC - do not remove  ========= //

// On load
pruneOldWaterData();
renderChartFromHistory();
updateGoalUI(false);

// Intake form logic
waterForm.addEventListener('submit', function(event) {
  event.preventDefault();
  const input = document.getElementById('waterInput');
  let value = parseFloat(input.value);
  if (!value || value <= 0) {
    document.getElementById('waterMessage').innerText = 'Please enter a valid amount.';
    return;
  }
  // For current day, always set/overwrite the value
  const todayKey = getDateKeyNDaysAgo(0);
  localStorage.setItem(todayKey, value);
  pruneOldWaterData();
  updateWaterMessage();
  input.value = '';
  renderChartFromHistory();
  updateGoalUI();
  showSuccessMsg('Water intake updated!');
});

updateWaterMessage();
showRandomTip();

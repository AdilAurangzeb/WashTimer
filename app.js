let cycleMinutes = null;
let programmeId = null;
let chosenStartTime = null;
let chosenEndTime = null;
let chosenDelay = null;

let baseFinishTime = null; // 👈 NEW: baseline finish time

let notifTimers = { start: null, end: null, wet: null };

/* ------------------------
   Theme
------------------------- */

if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
}

document.getElementById('themeToggle').onclick = () => {
  document.body.classList.toggle('light');
  localStorage.setItem(
    'theme',
    document.body.classList.contains('light') ? 'light' : 'dark'
  );
};

/* ------------------------
   Helpers
------------------------- */

function formatDuration(mins) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function showProgrammeInfo(minutes, warning) {
  document.getElementById('programmeInfo').innerHTML =
    `<div class="duration">⏱ ${formatDuration(minutes)}</div>` +
    (warning ? `<div class="warning">⚠ ${warning}</div>` : '');
}

function setImmediateRun(minutes) {
  chosenStartTime = dayjs();
  baseFinishTime = chosenStartTime.add(minutes, 'minute'); // 👈 baseline
  chosenEndTime = baseFinishTime;
  chosenDelay = 0;

  document.getElementById('finishTime').value =
    baseFinishTime.format('HH:mm');
}

/* ------------------------
   Notification rendering
------------------------- */

function renderNotifStatus() {
  const box = document.getElementById('notifStatus');
  box.innerHTML = '';

  ['start', 'end', 'wet'].forEach(type => {
    const saved = localStorage.getItem(`notif_${type}`);
    if (!saved) return;

    const { time, label, level } = JSON.parse(saved);
    const div = document.createElement('div');
    div.textContent = `🔔 ${label} set for ${time}`;
    div.className = level;
    box.appendChild(div);
  });
}

/* ------------------------
   Programme selection
------------------------- */

document.querySelectorAll('.programmes button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.programmes button')
      .forEach(b => b.classList.remove('active'));

    btn.classList.add('active');

    cycleMinutes = Number(btn.dataset.minutes);
    programmeId = btn.dataset.id;

    showProgrammeInfo(cycleMinutes, btn.dataset.warning || null);
    setImmediateRun(cycleMinutes);
  };
});

/* ------------------------
   Quick delay buttons (FIXED)
------------------------- */

document.querySelectorAll('.quick-delays button').forEach(btn => {
  btn.onclick = () => {
    if (!baseFinishTime) return;

    const hours = Number(btn.dataset.add);
    const newFinish = baseFinishTime.add(hours, 'hour');

    document.getElementById('finishTime').value =
      newFinish.format('HH:mm');
  };
});

/* ------------------------
   Calculate (commit delay)
------------------------- */

document.getElementById('calculate').onclick = () => {
  if (!cycleMinutes) return alert('Select a programme');

  const now = dayjs();
  const [h, m] = document.getElementById('finishTime').value.split(':');

  let targetFinish = now.hour(h).minute(m).second(0);
  if (targetFinish.isBefore(now)) targetFinish = targetFinish.add(1, 'day');

  const delays = [3, 6, 9];
  let best = null;

  delays.forEach(d => {
    const finish = targetFinish.clone();
    const start = finish.clone()
      .subtract(cycleMinutes, 'minute')
      .subtract(d, 'hour');

    if (start.isAfter(now) && (!best || start.isBefore(best.start))) {
      best = { delay: d, start, finish };
    }
  });

  if (!best) {
    document.getElementById('result').textContent =
      'No valid delay fits that finish time.';
    return;
  }

  chosenDelay = best.delay;
  chosenStartTime = best.start;
  chosenEndTime = best.finish;

  document.getElementById('result').textContent =
    `Use ${chosenDelay}h delay\nPress at ${chosenStartTime.format('HH:mm')}\n→ finishes ${chosenEndTime.format('HH:mm')}`;
};

/* ------------------------
   Notifications
------------------------- */

async function askPerm() {
  if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
  }
}

function toggleNotif(type, when, title, body, label, level) {
  if (!when) return;

  if (notifTimers[type]) {
    clearTimeout(notifTimers[type]);
    notifTimers[type] = null;
    localStorage.removeItem(`notif_${type}`);
    renderNotifStatus();
    return;
  }

  notifTimers[type] = setTimeout(() => {
    navigator.serviceWorker.ready.then(reg =>
      reg.showNotification(title, { body })
    );
  }, when.diff(dayjs()));

  localStorage.setItem(`notif_${type}`, JSON.stringify({
    time: when.format('HH:mm'),
    label,
    level
  }));

  renderNotifStatus();
}

document.getElementById('notifyStart').onclick = async () => {
  if (!chosenStartTime) return alert('Select programme first');
  await askPerm();
  toggleNotif(
    'start',
    chosenStartTime,
    '🧺 Start washing',
    chosenDelay === 0 ? 'Start now' : `Press ${chosenDelay}h delay`,
    'Start notification',
    'success'
  );
};

document.getElementById('notifyEnd').onclick = async () => {
  if (!chosenEndTime) return alert('Select programme first');
  await askPerm();
  toggleNotif(
    'end',
    chosenEndTime,
    '🧺 Washing finished',
    'Unload soon',
    'Finish notification',
    'success'
  );
};

document.getElementById('notifyWet').onclick = async () => {
  if (!chosenEndTime) return alert('Select programme first');
  await askPerm();
  toggleNotif(
    'wet',
    chosenEndTime.add(30, 'minute'),
    '⚠ Wet clothes',
    'Laundry has been sitting for 30 minutes',
    'Wet clothes reminder',
    'warning'
  );
};

/* ------------------------
   Cancel ALL
------------------------- */

document.getElementById('cancelAll').onclick = () => {
  Object.keys(notifTimers).forEach(type => {
    if (notifTimers[type]) clearTimeout(notifTimers[type]);
    notifTimers[type] = null;
    localStorage.removeItem(`notif_${type}`);
  });
  renderNotifStatus();
};

renderNotifStatus();

let cycleMinutes = null;
let programmeBtn = null;
let immediateFinish = null;

/* Format duration */
function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/* When programme selected, compute immediate finish */
document.querySelectorAll('.programmes button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.programmes button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    cycleMinutes = Number(btn.dataset.minutes);
    programmeBtn = btn;

    const now = dayjs();
    immediateFinish = now.add(cycleMinutes, 'minute');

    /* Update UI immediately */
    document.getElementById('programmeInfo').innerHTML = `
      <div class="duration">⏱ Duration: ${formatDuration(cycleMinutes)}</div>
      <div class="immediate">🕒 Immediate finish: ${immediateFinish.format('HH:mm')}</div>
      ${btn.dataset.warning ? `<div class="warning">⚠ ${btn.dataset.warning}</div>` : ''}
    `;

    document.getElementById('finishTime').value = immediateFinish.format('HH:mm');
  };
});

/* Quick delay buttons now set absolute offsets */
document.querySelectorAll('.quick-delays button').forEach(btn => {
  btn.onclick = () => {
    if (!cycleMinutes || !immediateFinish) return alert('Select a programme first');
    const hours = Number(btn.dataset.add);

    const finish = immediateFinish.add(hours, 'hour');
    document.getElementById('finishTime').value = finish.format('HH:mm');
  };
});

/* Calculate still works */
document.getElementById('calculate').onclick = () => {
  if (!cycleMinutes) return alert('Select a programme first');

  const now = dayjs();
  const [h, m] = document.getElementById('finishTime').value.split(':');
  let target = now.hour(h).minute(m).second(0);

  if (target.isBefore(now)) target = target.add(1, 'day');

  const bestDelay = [3,6,9].find(d => 
    target.subtract(cycleMinutes, 'minute').subtract(d, 'hour').isAfter(now)
  );

  if (!bestDelay) {
    document.getElementById('result').innerText = 'No valid delay fits.';
    return;
  }

  const start = target.subtract(cycleMinutes, 'minute').subtract(bestDelay, 'hour');

  document.getElementById('result').innerText = `
    Use ${bestDelay}h delay
    Press at: ${start.format('HH:mm')}
    Finish at: ${target.format('HH:mm')}
  `;
};

/* ---------- Browser Notifications (restored) ---------- */

async function ensurePerm() {
  if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
  }
}

function fireBrowserNotification(title, body) {
  if (!("serviceWorker" in navigator)) return alert("No service worker support");
  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification(title, { body });
  });
}

/* Notify start */
document.getElementById('notifyStart').onclick = async () => {
  await ensurePerm();
  if (!cycleMinutes || !immediateFinish) return alert('Select programme first');
  fireBrowserNotification('🧺 Start washing', `Cycle takes ${formatDuration(cycleMinutes)}`);
  document.getElementById('notifStatus').innerText = 'Start notification fired';
};

/* Notify finish */
document.getElementById('notifyEnd').onclick = async () => {
  await ensurePerm();
  if (!cycleMinutes || !immediateFinish) return alert('Select programme first');
  fireBrowserNotification('🧺 Washing finished', `Finished at ${immediateFinish.format('HH:mm')}`);
  document.getElementById('notifStatus').innerText = 'Finish notification fired';
};

/* Wet clothes */
document.getElementById('notifyWet').onclick = async () => {
  await ensurePerm();
  if (!cycleMinutes || !immediateFinish) return alert('Select programme first');
  const wet = immediateFinish.add(30, 'minute');
  fireBrowserNotification('⚠ Wet clothes', `Laundry sitting for 30m — original finish ${wet.format('HH:mm')}`);
  document.getElementById('notifStatus').innerText = 'Wet clothes notification fired';
};

/* Cancel all */
document.getElementById('cancelAll').onclick = () => {
  localStorage.clear();
  document.getElementById('notifStatus').innerText = 'All notification state cleared';
};

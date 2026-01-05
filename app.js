let cycleMinutes = null;
let programmeId = null;
let baseFinishTime = null;

let scheduled = { start: null, end: null, wet: null };

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function setImmediate(mins) {
  const now = dayjs();
  baseFinishTime = now.add(mins, 'minute');
  scheduled.end = baseFinishTime;
  scheduled.start = now;
  scheduled.wet = baseFinishTime.add(30, 'minute');
  renderTimes();
}

function renderTimes() {
  document.getElementById('finishTime').value = baseFinishTime.format('HH:mm');
  document.getElementById('programmeInfo').innerHTML = `
    <div>⏱ Duration: ${formatDuration(cycleMinutes)}</div>
    <div>🕒 Immediate finish: ${baseFinishTime.format('HH:mm')}</div>
  `;
}

document.querySelectorAll('.programmes button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.programmes button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    cycleMinutes = Number(btn.dataset.minutes);
    programmeId = btn.dataset.id;
    setImmediate(cycleMinutes);
  };
});

document.querySelectorAll('.quick-delays button').forEach(btn => {
  btn.onclick = () => {
    if (!baseFinishTime) return;
    const hours = Number(btn.dataset.add);
    scheduled.end = baseFinishTime.add(hours, 'hour');
    renderTimesWithDelay(hours);
  };
});

function renderTimesWithDelay(hours) {
  const finish = baseFinishTime.add(hours, 'hour');
  document.getElementById('finishTime').value = finish.format('HH:mm');
}

document.getElementById('calculate').onclick = () => {
  const now = dayjs();
  const [h, m] = document.getElementById('finishTime').value.split(':');
  let target = now.hour(h).minute(m);
  if (target.isBefore(now)) target = target.add(1, 'day');

  const delay = [3,6,9].find(d => target.subtract(cycleMinutes, 'minute').subtract(d,'hour').isAfter(now));

  if (!delay) return alert('No valid delay');

  const start = target.subtract(cycleMinutes, 'minute').subtract(delay, 'hour');

  scheduled.start = start;
  scheduled.end = target;

  document.getElementById('result').innerText = `
    Use ${delay}h delay
    Press at: ${start.format('HH:mm')}
    Finish at: ${target.format('HH:mm')}
  `;
};

function notifyNow(type, title, body) {
  if (window.Android) {
    window.Android.scheduleAlarm(type, dayjs().valueOf(), title, body);
  }
}

document.getElementById('notifyStart').onclick = () =>
  notifyNow('start', '🧺 Start washing', 'Press delay on machine');

document.getElementById('notifyEnd').onclick = () =>
  notifyNow('end', '🧺 Washing finished', 'Unload soon');

document.getElementById('notifyWet').onclick = () =>
  notifyNow('wet', '⚠ Wet clothes', 'Laundry sitting 30 minutes');

document.getElementById('cancelAll').onclick = () => {
  ['start','end','wet'].forEach(type => {
    if (window.Android) window.Android.cancelAlarm(type);
    localStorage.removeItem(`notif_${type}`);
  });
  document.getElementById('notifStatus').innerText = 'All notifications cleared';
};

let cycleMinutes = null;
let baseFinish = null;
let startTime = null;
let endTime = null;
let delayHours = 0;

function setImmediateRun(mins) {
  startTime = dayjs();
  baseFinish = startTime.add(mins, 'minute');
  endTime = baseFinish;
  delayHours = 0;
  document.getElementById('finishTime').value = baseFinish.format('HH:mm');
}

document.querySelectorAll('.programmes button').forEach(btn => {
  btn.onclick = () => {
    cycleMinutes = Number(btn.dataset.minutes);
    setImmediateRun(cycleMinutes);
    document.getElementById('programmeInfo').innerText =
      `Duration: ${Math.floor(cycleMinutes / 60)}h ${cycleMinutes % 60}m` +
      (btn.dataset.warning ? `\n⚠ ${btn.dataset.warning}` : '');
  };
});

document.querySelectorAll('.quick-delays button').forEach(btn => {
  btn.onclick = () => {
    if (!baseFinish) return;
    const hours = Number(btn.dataset.add);
    endTime = baseFinish.add(hours, 'hour');
    document.getElementById('finishTime').value = endTime.format('HH:mm');
  };
});

document.getElementById('calculate').onclick = () => {
  const now = dayjs();
  const [h, m] = document.getElementById('finishTime').value.split(':');
  const targetFinish = now.hour(h).minute(m);

  [3,6,9].some(d => {
    const start = targetFinish.subtract(cycleMinutes, 'minute').subtract(d,'hour');
    if (start.isAfter(now)) {
      delayHours = d;
      startTime = start;
      endTime = targetFinish;
      document.getElementById('result').innerText =
        `Use ${d}h delay\nPress at ${start.format('HH:mm')}\nFinish ${targetFinish.format('HH:mm')}`;
      return true;
    }
  });
};

/* ---------- ANDROID NATIVE BRIDGE ---------- */

function schedule(id, time, title, body) {
  if (window.Android) {
    window.Android.scheduleAlarm(id, time.valueOf(), title, body);
  }
}

function cancel(id) {
  if (window.Android) {
    window.Android.cancelAlarm(id);
  }
}

/* ---------- NOTIFY BUTTONS ---------- */

document.getElementById('notifyStart').onclick = () =>
  schedule('start', startTime, '🧺 Start washing', delayHours ? `Press ${delayHours}h delay` : 'Start now');

document.getElementById('notifyEnd').onclick = () =>
  schedule('end', endTime, '🧺 Washing finished', 'Unload soon');

document.getElementById('notifyWet').onclick = () =>
  schedule('wet', endTime.add(30,'minute'), '⚠ Wet clothes', 'Laundry sitting for 30 minutes');

document.getElementById('cancelAll').onclick = () =>
  ['start','end','wet'].forEach(cancel);

let ctx: AudioContext | null = null;
let interval: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function beep() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}

/** Must be called from a user gesture to unlock audio. */
export function enableAlarmAudio() {
  getCtx();
}

export function startAlarm() {
  if (interval) return;
  beep();
  interval = setInterval(beep, 700);
}

export function stopAlarm() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

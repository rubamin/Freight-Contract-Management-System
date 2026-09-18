// Plays a short attention beep for warnings (e.g. duplicate master entries)
// using the Web Audio API, so this doesn't depend on a bundled audio file.
export const playAlertSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, context.currentTime);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.25);
  } catch (err) {
    // Audio is a UX nicety for the duplicate-detection flow, not a
    // requirement - browsers that block audio before a user gesture
    // shouldn't break the rest of the warning (highlight + popup still
    // show).
  }
};
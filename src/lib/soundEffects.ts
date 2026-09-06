"use client";

// ─── Sound Effects Utility (Web Audio API) ───────────────────
// Zero-latency, zero-bandwidth browser audio synthesis (WhatsApp & Slack style)

const SOUND_PREF_KEY = "taskflow-chat-sounds-enabled";

/**
 * Check if chat audio sound effects are enabled (default: true)
 */
export function isChatSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(SOUND_PREF_KEY);
  return saved === null ? true : saved === "true";
}

/**
 * Toggle chat audio sound effects
 */
export function setChatSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent("taskflow:sound-setting-change", { detail: { enabled } }));
}

/**
 * Get or create a shared AudioContext safely
 */
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * WhatsApp-style "Message Sent" Pop / Swoosh
 * A crisp, satisfying rising pitch pop (620Hz -> 960Hz) with smooth exponential decay
 */
export function playMessageSentSound(): void {
  if (!isChatSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Main oscillator (rising pop)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.07);

    // Harmonic sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1240, now);
    osc2.frequency.exponentialRampToValueAtTime(1960, now + 0.05);

    // Envelopes
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    // Connect
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.09);
    osc2.stop(now + 0.07);
  } catch {
    // Silent fail if browser audio blocked
  }
}

/**
 * WhatsApp-style "Message Received" Gentle Two-Tone Chime (G5 -> C6)
 */
export function playMessageReceivedSound(): void {
  if (!isChatSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Tone 1: 784Hz (G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.14, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Tone 2: 1046.5Hz (C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.08);
    gain2.gain.setValueAtTime(0.18, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.13);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);
  } catch {
    // Silent fail
  }
}

/**
 * Soft delete / trash pop
 */
export function playDeleteSound(): void {
  if (!isChatSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.075);
  } catch {
    // Silent fail
  }
}

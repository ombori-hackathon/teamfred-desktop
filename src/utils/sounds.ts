/**
 * Sound manager using Web Audio API to generate various UI sounds
 */

class SoundManager {
  private context: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Load preference from localStorage
    const savedPref = localStorage.getItem("soundEnabled");
    if (savedPref !== null) {
      this.enabled = savedPref === "true";
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  enable() {
    this.enabled = true;
    localStorage.setItem("soundEnabled", "true");
  }

  disable() {
    this.enabled = false;
    localStorage.setItem("soundEnabled", "false");
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem("soundEnabled", this.enabled.toString());
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async playTone(
    frequency: number,
    duration: number,
    volume: number = 0.3,
    type: OscillatorType = "sine"
  ): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();

    // Resume audio context if it was suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const now = ctx.currentTime;
    const attackTime = 0.05;
    const releaseTime = 0.05;

    // Envelope for smooth attack/release
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(0, now + duration - releaseTime);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  // Pop sound - high frequency, short (for creating ideas)
  async playCreate(): Promise<void> {
    await this.playTone(800, 0.1, 0.2, "sine");
  }

  // Whoosh - descending frequency (for deleting ideas)
  async playDelete(): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    const now = ctx.currentTime;

    // Descending frequency
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  // Ding - bell tone (for voting)
  async playVote(): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // Bell sound using multiple harmonics
    const frequencies = [1000, 2000, 3000];
    const volumes = [0.2, 0.1, 0.05];

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = freq;

      gainNode.gain.setValueAtTime(volumes[i], now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    });
  }

  // Alarm - repeating beeps (for timer)
  async playTimer(): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const frequencies = [800, 1000, 1200];

    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = freq;

      const startTime = now + index * 0.3;
      const endTime = startTime + 0.2;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, endTime);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }

  // Fanfare - ascending notes (for celebration)
  async playCelebration(): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 523, time: 0 }, // C5
      { freq: 659, time: 0.15 }, // E5
      { freq: 784, time: 0.3 }, // G5
      { freq: 1047, time: 0.45 }, // C6
    ];

    notes.forEach((note) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "triangle";
      oscillator.frequency.value = note.freq;

      const startTime = now + note.time;
      const endTime = startTime + 0.25;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, endTime);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }

  // Shuffle sound - whoosh
  async playShuffle(): Promise<void> {
    await this.playTone(400, 0.3, 0.15, "sawtooth");
  }
}

export const sounds = new SoundManager();

// Keep legacy exports for backward compatibility
export const playAlarm = () => sounds.playTimer();
export const playClick = () => sounds.playCreate();

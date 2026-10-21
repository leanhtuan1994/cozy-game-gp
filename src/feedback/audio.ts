import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import type { Sfx } from "./plan";

// Bundled sounds, all CC0 (sources in assets/audio/CREDITS.txt). A sound missing here is not played.
const SFX_SOURCES: Partial<Record<Sfx, number>> = {
  tap: require("../../assets/audio/tap.wav"),
  blocked: require("../../assets/audio/blocked.wav"),
  clear: require("../../assets/audio/clear.wav"),
  booster: require("../../assets/audio/booster.wav"),
  reward: require("../../assets/audio/reward.wav"),
  win: require("../../assets/audio/win.wav"),
  lose: require("../../assets/audio/lose.wav"),
  button: require("../../assets/audio/button.wav"),
};
const MUSIC_SOURCE: number | null = require("../../assets/audio/music.m4a");

let started = false;
let ready = false;
const sfxPlayers = new Map<Sfx, AudioPlayer>();
let music: AudioPlayer | null = null;
// The music state asked for before the players exist; applied once they do.
let wanted = { playing: false, volume: 0 };

// Once, at startup. The game stays quiet when the iPhone's silent switch is on, mixes with the
// player's own audio, and stops in the background. Players are created only after the mode is
// set, so the first sound cannot start the audio session in the default (interrupting) mode.
export function initAudio(): void {
  if (started) return;
  started = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers", shouldPlayInBackground: false })
    .catch((error: unknown) => console.warn("setAudioModeAsync failed", error))
    .then(() => {
      for (const [kind, source] of Object.entries(SFX_SOURCES) as [Sfx, number][]) {
        sfxPlayers.set(kind, createAudioPlayer(source, { keepAudioSessionActive: true }));
      }
      if (MUSIC_SOURCE !== null) {
        music = createAudioPlayer(MUSIC_SOURCE, { keepAudioSessionActive: true });
        music.loop = true;
      }
      ready = true;
      setMusic(wanted.playing, wanted.volume);
    });
}

export function playSfx(kind: Sfx, volume: number): void {
  const player = sfxPlayers.get(kind);
  if (!ready || !player || volume <= 0) return;
  player.volume = volume;
  player
    .seekTo(0)
    .then(() => player.play())
    .catch(() => undefined);
}

// Starts, stops or re-levels the music. Called when the app comes and goes and when the setting changes.
export function setMusic(playing: boolean, volume: number): void {
  wanted = { playing, volume };
  if (!ready || !music) return;
  music.volume = volume;
  if (playing && volume > 0) music.play();
  else music.pause();
}

// Stops every sound effect, so none resumes mid-jingle when the app comes back.
export function stopSfx(): void {
  for (const player of sfxPlayers.values()) player.pause();
}

export const HAS_MUSIC = MUSIC_SOURCE !== null;

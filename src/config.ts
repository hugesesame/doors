export const APP_NAME = 'BGM Mixer';
export const APP_VERSION = __APP_VERSION__;

/** Every track is brought to this integrated loudness (LUFS). */
export const TARGET_LUFS = -16;
/** A quiet track is raised by at most this much (dB), so its noise is not lifted with it. */
export const MAX_GAIN_DB = 10;
/** The limiter's ceiling on sample peaks (dB); the margin keeps true peaks under -1 dBTP after encoding. */
export const LIMIT_DB = -2;
/** Quieter than this (dB) for at least SILENCE_MIN_SEC counts as silence at a track's head or tail. */
export const SILENCE_DB = -50;
export const SILENCE_MIN_SEC = 0.5;
/** A crossfade shorter than this (seconds) is joined end to end instead. */
export const MIN_CROSSFADE_SEC = 0.1;
export const SAMPLE_RATE = 44100;

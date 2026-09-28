"""Generate the game's original, quiet 32-second adventure theme.

Requires numpy and ffmpeg. The generated MP3 is already bundled in www/assets.
Run from the project root: python tools/make_music.py
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import wave

import numpy as np

RATE = 22050
SECONDS = 32
N = RATE * SECONDS
track = np.zeros(N, dtype=np.float32)
rng = np.random.default_rng(27)


def frequency(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def add_note(start, duration, note, volume, instrument="harp"):
    count = min(int(duration * RATE), N - int(start * RATE))
    if count <= 0:
        return
    t = np.arange(count, dtype=np.float32) / RATE
    f = frequency(note)
    if instrument == "flute":
        attack = np.minimum(1, t / .075)
        release = np.minimum(1, (duration - t) / .20)
        envelope = attack * np.maximum(0, release)
        wave_data = np.sin(2 * np.pi * f * t) + .13 * np.sin(4 * np.pi * f * t)
    elif instrument == "pad":
        envelope = np.minimum(1, t / .4) * np.minimum(1, (duration - t) / .7)
        wave_data = .7 * np.sin(2 * np.pi * f * t) + .18 * np.sin(2 * np.pi * f * 1.003 * t)
    elif instrument == "bass":
        envelope = np.minimum(1, t / .03) * np.exp(-t / .9)
        wave_data = np.sin(2 * np.pi * f * t) + .12 * np.sin(4 * np.pi * f * t)
    else:
        envelope = np.minimum(1, t / .012) * np.exp(-t / .43)
        wave_data = np.sin(2 * np.pi * f * t) + .24 * np.sin(4 * np.pi * f * t) + .08 * np.sin(6 * np.pi * f * t)
    begin = int(start * RATE)
    track[begin:begin + count] += (wave_data * envelope * volume).astype(np.float32)


# D major, A major, B minor, G major. Every bar is two seconds.
chords = [(50, 62, 66, 69), (45, 61, 64, 69), (47, 59, 62, 66), (43, 59, 62, 67)]
melodies = [
    [(74, 0, .5), (76, .5, .5), (78, 1, .5), (76, 1.5, .5)],
    [(73, 0, .75), (71, .75, .25), (69, 1, .5), (73, 1.5, .5)],
    [(71, 0, .5), (74, .5, .5), (78, 1, .5), (76, 1.5, .5)],
    [(74, 0, .75), (71, .75, .25), (69, 1, 1)],
]
for bar in range(16):
    start = bar * 2
    root, *tones = chords[bar % 4]
    add_note(start, 1.85, root - 12, .058, "pad")
    for tone in tones:
        add_note(start, 1.85, tone - 12, .022, "pad")
    add_note(start, 1.6, root - 12, .105, "bass")
    for step in range(8):
        tone = [tones[0], tones[1], tones[2], tones[1], tones[0], tones[1], tones[2], tones[1]][step]
        add_note(start + step * .25, .56, tone + 12, .055 if step % 4 else .072)
    for note, offset, length in melodies[bar % 4]:
        add_note(start + offset, length * .88, note + (12 if bar in (7, 15) else 0), .055, "flute")
    if bar % 4 == 3:
        add_note(start + 1.5, .8, 86, .026)

# A quiet brushed pulse gives movement without turning the diary into a timer.
for beat in range(64):
    begin = int((beat * .5 + .25) * RATE)
    count = min(int(.07 * RATE), N - begin)
    if count > 0:
        noise = rng.normal(0, 1, count).astype(np.float32)
        noise = np.concatenate(([0], np.diff(noise))).astype(np.float32)
        track[begin:begin + count] += noise * np.exp(-np.arange(count) / (RATE * .015)) * .0025

track += .12 * np.roll(track, int(.21 * RATE)) + .07 * np.roll(track, int(.39 * RATE))
edge = int(.12 * RATE)
track[:edge] *= np.linspace(0, 1, edge)
track[-edge:] *= np.linspace(1, 0, edge)
track = np.tanh(track * 1.25)
track *= .72 / max(1, np.max(np.abs(track)))

output = Path(__file__).resolve().parents[1] / "www/assets/adventure-loop.mp3"
with TemporaryDirectory() as temp:
    wav_path = Path(temp) / "theme.wav"
    with wave.open(str(wav_path), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes((track * 32767).astype("<i2").tobytes())
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-q:a", "5", str(output)], check=True)
print(f"Wrote {output} ({output.stat().st_size} bytes)")

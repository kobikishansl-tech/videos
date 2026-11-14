import json, subprocess, os
import numpy as np

SR = 44100
meta = json.load(open("tts/durs.json"))
GAP = 0.55
scene_of = {"s1":["s1"],"s2":["s2","s3"],"s4":["s4"],"s5":["s5"],"s6":["s6"],"s7":["s7"],"s8":["s8"],"s9":["s9"],"s10":["s10"],"s11":["s11"],"s12":["s12"],"s13":["s13"],"s14":["s14"]}
t = 0.0; line_times = {}; scene_starts = []
for sid in ["s1","s2","s4","s5","s6","s7","s8","s9","s10","s11","s12","s13","s14"]:
    scene_starts.append(t)
    d = 0.0
    for lid in scene_of[sid]:
        line_times[lid] = (t + d + 0.15, meta[lid]["dur"])
        d += meta[lid]["dur"] + 0.35
    t += max(d + GAP, 3.2)
TOTAL = t + 2.0
N = int(TOTAL*SR)
print("audio total", round(TOTAL,2), flush=True)

mix = np.zeros(N, np.float32)

def add(sig, at):
    i0 = int(at*SR)
    i1 = min(N, i0+len(sig))
    if i1 > i0: mix[i0:i1] += sig[:i1-i0]

for lid,(st,du) in line_times.items():
    raw = subprocess.run(["ffmpeg","-v","error","-i",f"tts/{lid}.mp3","-f","f32le","-ac","1","-ar",str(SR),"-"],
                         capture_output=True).stdout
    sig = np.frombuffer(raw, np.float32).copy()
    peak = np.abs(sig).max()+1e-6
    sig = 0.95*np.tanh(sig*2.2/peak)
    n = len(sig); na = int(0.015*SR); nr = int(0.05*SR)
    if n > na+nr:
        sig[:na] *= np.linspace(0,1,na); sig[-nr:] *= np.linspace(1,0,nr)
    add(sig, st)

tt = np.arange(N)/SR
drone = (0.32*np.sin(2*np.pi*55*tt) + 0.22*np.sin(2*np.pi*110.3*tt) + 0.12*np.sin(2*np.pi*164.8*tt))
drone *= 0.16*(0.6 + 0.4*np.sin(2*np.pi*0.05*tt))
mix += drone

pt = 0.0
while pt < TOTAL:
    n = int(0.30*SR)
    i0 = int(pt*SR); i1 = min(N, i0+n)
    if i1 > i0:
        seg = np.arange(i1-i0)/SR
        mix[i0:i1] += 0.20*np.sin(2*np.pi*52*seg)*np.exp(-seg*14)
    pt += 2.0

rng = np.random.default_rng(11)
for ss in scene_starts[1:]:
    n = int(0.4*SR)
    i0 = int(ss*SR); i1 = min(N, i0+n)
    if i1 <= i0: continue
    seg = np.arange(i1-i0)/SR
    noise = rng.standard_normal(i1-i0).astype(np.float32)
    for _ in range(3):
        noise = np.convolve(noise, np.ones(24)/24, mode="same").astype(np.float32)
    add(noise*0.35*np.exp(-seg*9), ss)

ris_start = scene_starts[9]; ris_dur = scene_starts[10]-scene_starts[9] + 1.5
i0 = int(ris_start*SR); i1 = min(N, int((ris_start+ris_dur)*SR))
seg = (tt[i0:i1]-ris_start)/ris_dur
mix[i0:i1] += (0.10*seg**2)*np.sin(2*np.pi*(180+900*seg**2)*tt[i0:i1])

nf = int(2.2*SR)
mix[-nf:] *= np.linspace(1,0,nf)
peak = np.abs(mix).max()
if peak > 0.95: mix *= 0.95/peak
data = (np.clip(mix,-1,1)*32767).astype(np.int16)
import wave
with wave.open("build/audio.wav","wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())
print("AUDIO_DONE")

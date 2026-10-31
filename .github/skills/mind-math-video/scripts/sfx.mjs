// boom (brown-noise rumble), sub (110 -> 35 Hz drop) and crash (cymbal wash) layer into an explosion.
// freq only applies to "ting" (bell pitch in Hz, default 1568 = G6); raise it step by step for an escalating climb.
export function soundEffect(type, duration, freq = 1568) {
  const defaults = {
    thud: { duration: .7, volume: 2.2 },
    tick: { duration: .06, volume: .45 },
    pop: { duration: .12, volume: .65 },
    chime: { duration: .65, volume: .6 },
    ting: { duration: .9, volume: .5 },
    footsteps: { duration: 2, volume: .15 },
    riser: { duration: 1.2, volume: .12 },
    whoosh: { duration: .5, volume: .5 },
    boom: { duration: 3, volume: 1.2 },
    sub: { duration: 2.5, volume: 1.2 },
    crash: { duration: 2.5, volume: .35 },
  };
  const preset = defaults[type];
  if (!preset) throw new Error(`Unknown sound effect: ${type}`);
  duration ??= preset.duration;
  if (!Number.isFinite(duration) || duration <= 0 || duration > 30) throw new Error('SFX duration must be in (0, 30].');
  if (!Number.isFinite(freq) || freq < 100 || freq > 8000) throw new Error('SFX freq must be in [100, 8000] Hz.');
  const fade = Math.min(.25, duration / 2);
  const sources = {
    thud: `sine=f=55:d=${duration},afade=t=out:st=${Math.min(.05, duration / 2)}:d=${duration - Math.min(.05, duration / 2)}`,
    tick: `sine=f=1800:d=${duration},afade=t=out:d=${duration}`,
    pop: `sine=f=500:d=${duration},afade=t=out:d=${duration}`,
    chime: `aevalsrc=0.07*(sin(2*PI*880*t)+sin(2*PI*1320*t))*exp(-5*t):d=${duration}`,
    ting: `aevalsrc=0.16*(sin(2*PI*${freq}*t)+0.45*sin(2*PI*${(freq * 2.76).toFixed(1)}*t)*exp(-6*t)+0.25*sin(2*PI*${(freq * 5.4).toFixed(1)}*t)*exp(-12*t))*exp(-4.5*t)*min(1\\,t*400):d=${duration}`,
    footsteps: `anoisesrc=d=${duration}:c=brown:a=0.25:seed=42,lowpass=f=650,volume='if(lt(mod(t,0.28),0.065),1,0)':eval=frame,afade=t=out:st=${duration - fade}:d=${fade}`,
    riser: `anoisesrc=d=${duration}:c=pink:a=0.35:seed=42,highpass=f=900,lowpass=f=5000,afade=t=in:d=${duration - fade},afade=t=out:st=${duration - fade}:d=${fade}`,
    boom: `anoisesrc=d=${duration}:c=brown:a=1:seed=7,lowpass=f=380,volume=3,afade=t=out:d=${duration}:curve=exp`,
    sub: `aevalsrc=0.9*sin(2*PI*(35*t+9.375*(1-exp(-8*t))))*exp(-1.6*t)*min(1\\,t*200):d=${duration}`,
    crash: `anoisesrc=d=${duration}:c=white:a=0.5:seed=9,highpass=f=3500,afade=t=out:d=${duration}:curve=exp`,
    whoosh: `anoisesrc=d=${duration}:c=pink:a=0.6:seed=42,highpass=f=500,lowpass=f=6000,afade=t=in:d=${fade},afade=t=out:st=${duration - fade}:d=${fade}`,
  };
  return { source: sources[type], duration, volume: preset.volume };
}
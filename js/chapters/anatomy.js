// Chapter 1: take a desk fan apart.
import { THREE, M, exploder, approach } from '../kit.js';
import { makeDeskFan, DESK } from '../fan.js';

const RPM = [0, 900, 1100, 1300];            // a typical 400 mm desk fan's three speeds
const R_M = 0.2;                             // blade radius in metres (400 mm across)

export default {
  id: 'anatomy',
  short: 'Inside a fan',
  title: 'Inside a desk fan',
  subtitle: 'A motor, a few tilted blades, a wire guard and a switch.',
  view: { pos: [7.0, 4.3, 5.0], target: [0, 2.4, 0.5] },
  learn: `<p>An electric fan has surprisingly few parts. The heart is an <b>electric motor</b>: a ring of copper <b>coils</b> (the <b>stator</b>) that stays still, and a <b>rotor</b> inside it that spins. The rotor's <b>shaft</b> pokes out of the front.</p>
    <p>On the shaft sits the <b>hub</b> with three or more <b>blades</b>, each one tilted like a propeller. A wire <b>guard</b> keeps fingers out and lets air through. A little <b>capacitor</b> helps the motor start.</p>
    <p>The <b>speed switch</b> in the base picks how fast the motor turns. Behind the motor, a small <b>gearbox</b> can swing the head from side to side. Pull the knob on top and the head stays still.</p>
    <p class="tip"><b>Try it:</b> take the fan apart, then change the speed and watch how fast the blade tips move.</p>`,
  terms: [
    { t: 'Stator', d: 'The part of a motor that stays still: a ring of iron wrapped in copper coils.' },
    { t: 'Rotor', d: 'The part of a motor that spins, with the shaft through its middle.' },
    { t: 'Hub', d: 'The centre piece that holds the blades and fixes them to the shaft.' },
    { t: 'Guard', d: 'The wire cage around the blades. It lets air through but not fingers.' },
    { t: 'Capacitor', d: 'A small electrical part that helps the motor start turning the right way.' },
  ],
  defaults: { explode: 0, speed: 3, xray: false },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'speed', type: 'seg', label: 'Speed switch', options: [{ v: 0, label: 'Off' }, { v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }], fmt: (v) => RPM[v] + ' rpm' },
    { key: 'xray', type: 'toggle', label: 'See-through motor' },
  ],
  quiz: [
    { q: 'Which part of the motor spins?', options: ['The stator', 'The rotor', 'The capacitor', 'The guard'], answer: 1, why: 'The rotor spins inside the still ring of coils, the stator, and turns the shaft.' },
    { q: 'What is the guard for?', options: ['It makes the air colder', 'It keeps fingers away from the blades while letting air through', 'It holds the motor together', 'It makes the fan quieter'], answer: 1, why: 'The wire cage is open enough for air but too tight for fingers.' },
    { q: 'At 1,300 rpm, roughly how fast do the tips of 400 mm blades move?', options: ['About 3 km/h', 'About 10 km/h', 'About 100 km/h', 'About 1,000 km/h'], answer: 2, why: 'Each turn the tip goes π × 0.4 m ≈ 1.26 m. 1,300 turns a minute is about 27 m/s, close to 100 km/h.' },
  ],
  reel: [
    { ms: 5600, caption: 'A fan is a motor, a few tilted blades, a wire guard and a switch.', set: { speed: 2, xray: false }, anim: { explode: [0, 1] }, view: { pos: [8.2, 4.4, 6.2], target: [0, 2.5, 0.4] }, spin: 0.6 },
  ],

  build({ stage }) {
    const f = makeDeskFan();
    stage.root.add(f.group);
    // Labels on rotating parts need anchors that explode with them but don't spin.
    const tag = (parent, pos) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
    const bladeTag = tag(f.mount, [0, 0, 0]);
    const rotorTag = tag(f.motor, [0, 0, 0]);
    const setExplode = exploder([
      { obj: f.guard.front, off: [0, -2.3, 0] },
      { obj: f.guard.rim, off: [0, -2.3, 0] },
      { obj: f.spinner, off: [0, -1.45, 0] },
      { obj: bladeTag, off: [0, -1.45, 0] },
      { obj: f.guard.back, off: [0, -0.55, 0] },
      { obj: f.housing, off: [0, 1.75, 0] },
      { obj: f.rotor, off: [0, 0, 0.9] },
      { obj: rotorTag, off: [0, 0, 0.9] },
      { obj: f.cap, off: [0.9, -0.5, 0.2] },
      { obj: f.gb, off: [0, 1.0, -1.0] },
    ]);
    const L = (text, obj, pos, cls) => stage.label(text, pos, obj, cls);
    L('Wire guard', f.guard.front, [0, -0.45, 1.85]);
    L('Blades and hub', bladeTag, [0.95, -0.55, -0.95], 'hot');
    L('Gearbox and knob', f.gb, [0.2, 1.45, -1.25]);
    L('Speed switch', f.base, [0.95, 0.5, 0.9]);
    // Inner parts are only labelled once they come out.
    const inner = [
      L('Stator: copper coils', f.stator, [-0.3, -0.7, -0.2]),
      L('Rotor and shaft', rotorTag, [0, 0.45, 0.55]),
      L('Motor housing', f.housing, [0, 0.8, -0.3]),
      L('Capacitor', f.cap, [0.35, -0.25, -0.3]),
      L('Crank and link', f.base, [-0.95, 2.35, -1.45]),
    ];

    let spin = 0, rpm = 0;
    return {
      update(dt, s) {
        setExplode(s.explode);
        inner.forEach((l) => { l.visible = s.explode > 0.35; });
        rpm = approach(rpm, RPM[s.speed] || 0, 1.6, dt);
        spin += (rpm / 60) * 0.1 * Math.PI * 2 * dt;       // shown slowed down about 10 times
        f.setSpin(spin);
        f.setKeys(s.speed);
        f.setCrank(0, 0);
        const see = s.xray || s.explode > 0.05;
        f.housingMat.opacity = see ? 0.25 : 1; f.housingMat.depthWrite = !see;
      },
      readout: (s) => {
        const r = RPM[s.speed] || 0, tip = (2 * Math.PI * R_M * r) / 60;
        if (!r) return '<div class="big">Switched off</div>Pick a speed on the switch to start the motor.';
        return `<div class="big">Blade tips: ${Math.round(tip * 3.6)} km/h</div>
          <div class="row"><span>Motor speed</span><b>${r.toLocaleString('en')} rpm</b></div>
          <div class="row"><span>Tip speed</span><b>${tip.toFixed(1)} m/s</b></div>
          <div class="row"><span>Fan size</span><b>400 mm, three blades</b></div>`;
      },
    };
  },
};

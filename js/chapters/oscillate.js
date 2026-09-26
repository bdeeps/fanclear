// Chapter 6: how the head swings. A worm gear slows the motor down, and a crank and
// link turn the slow rotation into a to-and-fro swing (a four-bar linkage).
import { THREE, M, approach } from '../kit.js';
import { makeDeskFan, swingAngle, THROWS, DESK } from '../fan.js';

const RPM = [0, 900, 1100, 1300];
const WORM = 60, GEAR = 4, RATIO = WORM * GEAR;     // single-start worm into a 60-tooth wheel, then a 10-tooth pinion into a 40-tooth gear
const LAPSE = 4;                                    // time-lapse factor when switched on

export default {
  id: 'oscillate',
  short: 'The swing',
  title: 'How the head swings',
  subtitle: 'A worm gear slows the motor 240 times; a crank and a link do the rest.',
  view: { pos: [-4.4, 3.9, -3.3], target: [0, 2.75, -0.9] },
  learn: `<p>The same motor that spins the blades also swings the head. Behind the motor, the shaft ends in a <b>worm</b>: a screw thread. Each turn of the worm nudges the <b>worm wheel</b> on by just one tooth, so a 60-tooth wheel turns 60 times slower. A small <b>pinion</b> and a bigger gear slow it 4 times more.</p>
    <p>The slow output turns a <b>crank</b> under the head. A <b>link</b> joins the crank to a fixed lug on the stand. As the crank goes round, the link pushes and pulls, and because the head sits on a <b>pivot</b>, it swings to one side, stops, and swings back. Turning round and round becomes back and forth.</p>
    <p>Pull the <b>knob</b> on top and a little clutch lets the worm wheel slip, so the head stays still. Some fans let you move the link to a different hole to change how wide the swing is.</p>
    <p><b>Bladeless</b> fans, like Dyson's Air Multiplier (2009), hide the blades in the base: an impeller blows air out of a thin slot in a ring, and that jet drags much more air along with it.</p>
    <p class="tip"><b>Try it:</b> switch the swing on and off, then change the width. The time-lapse speeds up the swing so you can see it.</p>`,
  terms: [
    { t: 'Worm gear', d: 'A screw that turns a toothed wheel one tooth per turn. It slows things down a lot in a small space.' },
    { t: 'Gear ratio', d: 'How many turns in for one turn out. Here, 60 × 4 = 240.' },
    { t: 'Crank', d: 'An arm that turns in a circle, like a bicycle pedal.' },
    { t: 'Linkage', d: 'Bars joined by pins that turn one kind of motion into another.' },
    { t: 'Clutch', d: 'A part that connects or disconnects a drive. The knob works one.' },
  ],
  defaults: { osc: true, speed: 3, width: 'wide', lapse: true },
  controls: [
    { key: 'osc', type: 'toggle', label: 'Swing (knob pushed down)' },
    { key: 'speed', type: 'seg', label: 'Speed switch', options: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }], fmt: (v) => RPM[v] + ' rpm' },
    { key: 'width', type: 'seg', label: 'Swing width', options: [{ v: 'narrow', label: 'Narrow' }, { v: 'wide', label: 'Wide' }], fmt: (v) => `about ${THROWS[v].deg}°` },
    { key: 'lapse', type: 'toggle', label: `Time-lapse (${LAPSE}× faster)` },
  ],
  quiz: [
    { q: 'Why use a worm gear to swing the head?', options: ['It speeds the motor up', 'It slows the motor down a lot in a tiny space', 'It makes the blades spin backwards', 'It keeps the motor cool'], answer: 1, why: 'Each turn of the worm moves the wheel one tooth, so a 60-tooth wheel turns 60 times slower.' },
    { q: 'What turns the crank’s round-and-round motion into a side-to-side swing?', options: ['A spring', 'A link tied to the stand, with the head on a pivot', 'A second motor', 'The air pushing back'], answer: 1, why: 'The link keeps the crank pin a fixed distance from the stand, so the head has to swing to make room.' },
    { q: 'The motor turns at 1,200 rpm and the gears slow it 240 times. How often does the head swing back and forth?', options: ['5 times a minute', '50 times a minute', 'Once an hour', '1,200 times a minute'], answer: 0, why: '1,200 ÷ 240 = 5 turns of the crank a minute, and each turn is one full swing there and back.' },
  ],
  reel: [
    { ms: 5600, caption: 'A worm gear slows the motor 240 times, and a crank and link swing the head to and fro.', set: { osc: true, speed: 3, width: 'wide', lapse: true }, view: { pos: [-4.6, 4.0, -3.6], target: [0, 2.7, -0.5] }, spin: 0.1 },
  ],

  build({ stage }) {
    const f = makeDeskFan();
    stage.root.add(f.group);
    f.housingMat.opacity = 0.35; f.housingMat.depthWrite = false;
    // The patch of floor the air sweeps across.
    const sweepMat = M.ghost(0x8ef0ff, 0.16);
    let sweep = null;
    const makeSweep = (deg) => {
      if (sweep) { f.group.remove(sweep); sweep.geometry.dispose(); }
      const a = (deg * Math.PI) / 180;
      sweep = new THREE.Mesh(new THREE.RingGeometry(1.8, 7.5, 64, 1, -Math.PI / 2 - a / 2, a), sweepMat);
      sweep.rotation.x = -Math.PI / 2; sweep.position.set(0, 0.02, DESK.PIVOT[2]); f.group.add(sweep);
    };

    const L = (t, obj, p, cls) => stage.label(t, p, obj, cls);
    const Y = DESK.AXIS_Y;
    L('Worm on the motor shaft', f.gb, [-0.35, Y + 0.5, -1.4]);
    L('Worm wheel: 60 teeth', f.gb, [0.45, Y + 0.12, -1.95]);
    L('Pinion and gear: 4 to 1', f.gb, [-0.35, Y - 0.3, -1.95]);
    L('Crank', f.gb, [-0.4, 0.0, -1.6], 'hot');
    L('Link to the stand', f.base, [-0.1, DESK.PIVOT[1] - 0.2, -1.05]);
    L('Pivot', f.base, [-0.35, DESK.PIVOT[1] - 0.6, DESK.PIVOT[2]]);
    const lKnob = L('Knob', f.gb, [0.45, Y + 0.8, -1.0]);
    const lSweep = stage.label('', [0, 0.1, 6.6]);

    let spin = 0, phi = Math.PI / 2, psi = 0, width = '', knob = 0;
    const st = { psi: 0 };
    return {
      update(dt, s) {
        if (s.width !== width) { width = s.width; f.setThrow(width); makeSweep(THROWS[width].deg); psi = swingAngle(phi, psi); }
        const rpm = RPM[s.speed] || 0;
        spin += (rpm / 60) * 0.1 * Math.PI * 2 * dt;                     // blades shown about 10× slower
        f.setSpin(spin);
        knob = approach(knob, s.osc ? 0 : 1, 8, dt);
        f.knob.position.y = Y + 0.365 + knob * 0.16;
        lKnob.element.textContent = s.osc ? 'Knob down: swinging' : 'Knob pulled up: head stays still';
        if (s.osc) phi += ((rpm / RATIO) / 60) * Math.PI * 2 * (s.lapse ? LAPSE : 1) * dt;
        psi = swingAngle(phi, psi);
        f.setCrank(phi, psi);
        st.psi = psi;
        sweepMat.opacity = s.osc ? 0.16 : 0.05;
        lSweep.element.textContent = s.osc ? `Air sweeps about ${THROWS[width].deg}°` : 'Air blows one way only';
        lSweep.position.set(0, 0.1, 6.6);
      },
      readout: (s) => {
        const rpm = RPM[s.speed], crank = rpm / RATIO, period = 60 / crank;
        return `<div class="big">${s.osc ? `One swing every ${period.toFixed(0)} s` : 'Not swinging'}</div>
          <div class="row"><span>Motor</span><b>${rpm.toLocaleString('en')} rpm</b></div>
          <div class="row"><span>Gears slow it by</span><b>60 × 4 = ${RATIO}</b></div>
          <div class="row"><span>Crank turns at</span><b>${crank.toFixed(1)} rpm</b></div>
          <div class="row"><span>Head angle now</span><b>${Math.round((st.psi * 180) / Math.PI)}°</b></div>`;
      },
    };
  },
};

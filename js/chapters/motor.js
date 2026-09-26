// Chapter 3: the motor. Two windings, one fed through a capacitor, make a magnetic field
// that turns; it drags a squirrel-cage rotor round after it. Or: magnets and electronics (BLDC).
import { THREE, M, torus, beam, arrow, clamp } from '../kit.js';
import { zrod } from '../fan.js';

const TAU = Math.PI * 2;
// Speeds are worked out as fractions of the field's speed (1 = synchronous).
// Induction torque against slip s (Kloss's formula), peak at slip SM.
const SM = 0.25;
const kloss = (s) => (2 * s * SM) / (s * s + SM * SM);
// Fan load grows with speed²; chosen so a healthy motor runs at 7% slip (a typical figure).
const LOAD = kloss(0.07) / 0.93 ** 2;
const J = 0.35;                                     // rotor + blades inertia (sets how fast it spins up)
// A real ceiling fan: 16 poles on 50 Hz mains.
const POLES = 16, HZ = 50, SYNC = (120 * HZ) / POLES;   // 375 rpm
const FIELD_SHOWN = 0.35;                           // the field turns 0.35 times a second on screen (much slower than real)

export default {
  id: 'motor',
  short: 'The motor',
  title: 'How the motor spins',
  subtitle: 'Coils make a magnetic field that turns, and it drags the rotor round.',
  view: { pos: [3.0, 4.6, 8.6], target: [-0.3, 3.1, 0] },
  learn: `<p>Most fans use an <b>induction motor</b>. Around the outside is the <b>stator</b>: iron poles wrapped in copper coils. Mains electricity flows back and forth 50 times a second, so each coil becomes a magnet that keeps flipping.</p>
    <p>One set of coils on its own just flips, and a flipping field can't decide which way to turn anything. So a second set of coils is fed through a <b>capacitor</b>, which makes its current peak a moment later. The two sets take turns, and together they make a <b>magnetic field that rotates</b>.</p>
    <p>Inside sits the <b>rotor</b>, a <b>squirrel cage</b> of metal bars. The turning field sweeps across the bars and makes currents flow in them, and those currents are pushed along by the field. The rotor chases the field but never quite catches it: it always runs a few percent slower. That gap is called <b>slip</b>.</p>
    <p>Newer <b>BLDC</b> fans use permanent magnets on the rotor and a little circuit that switches the coils at just the right moment. They move the same air on about 28 to 35 W instead of 70 to 75 W.</p>
    <p class="tip"><b>Try it:</b> take out the capacitor and switch the motor off and on. It hums but won't start. Now give it a push, either way.</p>`,
  terms: [
    { t: 'Induction motor', d: 'A motor whose rotor is pushed by currents the stator’s field induces in it. No wires reach the rotor.' },
    { t: 'Rotating field', d: 'A magnetic field that turns, made by coils whose currents peak one after another.' },
    { t: 'Squirrel cage', d: 'A rotor made of metal bars joined by a ring at each end, like a hamster wheel.' },
    { t: 'Slip', d: 'How far the rotor lags behind the rotating field, as a percentage.' },
    { t: 'BLDC', d: 'Brushless DC motor: magnets on the rotor, coils switched by electronics.' },
  ],
  defaults: { type: 'induction', cap: true, on: true },
  controls: [
    { key: 'type', type: 'seg', label: 'Motor', options: [{ v: 'induction', label: 'Induction' }, { v: 'bldc', label: 'BLDC' }] },
    { key: 'on', type: 'toggle', label: 'Switched on' },
    { key: 'cap', type: 'toggle', label: 'Capacitor fitted', hint: 'Induction motor only. Without it the field just flips.' },
    { key: 'push', type: 'buttons', label: 'Give the rotor a push', items: [{ label: '↺ Anticlockwise', act: (s, inst) => inst.push(1) }, { label: '↻ Clockwise', act: (s, inst) => inst.push(-1) }] },
  ],
  quiz: [
    { q: 'What is the capacitor for in a fan’s induction motor?', options: ['It stores power for a power cut', 'It delays the current in a second coil so the field rotates', 'It makes the fan quieter', 'It cools the motor'], answer: 1, why: 'Two coils peaking one after another make a rotating field. Without it the field only flips, and the motor can’t start.' },
    { q: 'A fan with a dead capacitor hums but won’t start. What happens if you give the blades a push?', options: ['Nothing', 'It runs, in whichever direction you pushed it', 'It always runs backwards', 'It explodes'], answer: 1, why: 'A flipping field is like two fields turning opposite ways. Once the rotor moves, the one going its way wins.' },
    { q: 'Why does an induction rotor always turn a little slower than the field?', options: ['Friction in the bearings only', 'If it caught up, no current would be induced in the bars and there’d be no push', 'The capacitor slows it', 'The blades are too heavy'], answer: 1, why: 'Currents are only induced while the field sweeps past the bars. That needs a speed difference: slip.' },
  ],
  reel: [
    { ms: 5600, caption: 'Two sets of coils take turns, making a magnetic field that spins and drags the rotor round.', set: { type: 'induction', cap: true, on: true }, act: (s, inst) => inst.reset(0), view: { pos: [2.8, 3.9, 7.6], target: [0, 2.6, 0] }, spin: 0.15 },
    { ms: 4800, caption: 'BLDC fans use magnets and electronics, and need less than half the power.', set: { type: 'bldc', on: true }, act: (s, inst) => inst.reset(0.9), view: { pos: [2.8, 3.9, 7.6], target: [0, 2.6, 0] }, spin: 0.2 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); g.position.y = 2.6; stage.root.add(g);

    // Stator: a ring of iron with four poles, each wrapped in a coil. Axis along Z.
    const ironMat = M.metal(0x6c7484, { roughness: 0.5, metalness: 0.6 });
    const ring = new THREE.Shape(); ring.absarc(0, 0, 2.15, 0, TAU, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, 1.8, 0, TAU, true); ring.holes.push(hole);
    const ringGeo = new THREE.ExtrudeGeometry(ring, { depth: 1.2, bevelEnabled: false, curveSegments: 64 }); ringGeo.translate(0, 0, -0.6);
    const yoke = new THREE.Mesh(ringGeo, ironMat); yoke.castShadow = true; g.add(yoke);
    const coils = [];
    // Pole i at angle i·90°: 0° and 180° are the starting winding (through the capacitor), 90° and 270° the main winding.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU, holder = new THREE.Group(); holder.rotation.z = a; g.add(holder);
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.46, 1.2), ironMat); tooth.position.x = 1.5; tooth.castShadow = true; holder.add(tooth);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 1.2), ironMat); shoe.position.x = 1.22; holder.add(shoe);
      const mat = M.metal(0xd08a4a, { roughness: 0.4, metalness: 0.7, emissive: new THREE.Color(0), emissiveIntensity: 1 });
      const c = torus(0.34, 0.1, mat, 32); c.rotation.y = Math.PI / 2; c.scale.set(2.6, 1, 1); c.position.x = 1.55; holder.add(c);
      coils.push({ mat, main: i % 2 === 1, sign: i < 2 ? 1 : -1 });
    }

    // Rotor: squirrel cage (bars + end rings) around an iron core; or a two-pole magnet for BLDC.
    const rotor = new THREE.Group(); g.add(rotor);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 1.1, 48), M.metal(0x3a404c, { transparent: true, opacity: 0.55 })); core.rotation.x = Math.PI / 2; rotor.add(core);
    const cage = new THREE.Group(); rotor.add(cage);
    const barMats = [];
    const N = 18;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU, m = M.metal(i === 0 ? 0xffffff : 0xc9ced8, { emissive: new THREE.Color(0), emissiveIntensity: 1 });
      const b = beam([Math.cos(a) * 1.0, Math.sin(a) * 1.0, -0.66], [Math.cos(a + 0.12) * 1.0, Math.sin(a + 0.12) * 1.0, 0.66], 0.055, m);
      cage.add(b); barMats.push({ m, a: a + 0.06 });
    }
    for (const z of [-0.66, 0.66]) { const r = torus(1.0, 0.07, M.metal(0xc9ced8), 64); r.position.z = z; cage.add(r); }
    const magnet = new THREE.Group(); rotor.add(magnet);
    const half = (col, start) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.1, 48, 1, false, start, Math.PI), M.plastic(col, { roughness: 0.35 })); m.rotation.x = Math.PI / 2; return m; };
    magnet.add(half(0xff6b6b, 0), half(0x5b8cff, Math.PI));
    const lN = stage.label('N', [0.55, 0, 0.7], magnet, 'hot');
    const lS = stage.label('S', [-0.55, 0, 0.7], magnet);
    rotor.add(zrod(-1.8, 2.0, 0.1, 0.1, M.metal(0xdfe4ec), 24));

    // The field: an arrow from the centre, in front of the rotor.
    const field = new THREE.Group(); field.position.z = 0.95; g.add(field);
    const fArrow = arrow(0x8ef0ff, 1.6, 0.35, 0.06); field.add(fArrow);
    const lField = stage.label('Magnetic field', [0, 1.9, 0], fArrow, 'hot');

    const lMain = stage.label('Main winding', [0, 2.55, 0.6], g);
    const lStart = stage.label('Starting winding + capacitor', [2.45, -0.5, 0.6], g);
    const lRotor = stage.label('Squirrel-cage rotor', [-0.2, -1.35, 0.9], g);
    // A small circuit board for BLDC mode.
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.06), M.plastic(0x1f6f4a)); board.position.set(-2.5, -1.6, 0.4); g.add(board);
    for (let i = 0; i < 4; i++) { const chip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.06), M.plastic(0x16181f)); chip.position.set(-2.8 + i * 0.22, -1.6, 0.45); g.add(chip); }
    const lBoard = stage.label('Controller: switches the coils', [-2.5, -2.1, 0.5], g);

    let w = 0.93, rotA = 0, fieldA = 0, since = 0;
    const st = { w: 0.93, hum: false };
    const hot = new THREE.Color(0xff5a3c), cold = new THREE.Color(0x3c8cff), black = new THREE.Color(0);
    const api = {
      push(dir) { w = dir * 0.45; },
      reset(v = 0) { w = v; since = 0; },
    };
    return {
      ...api,
      update(dt, s) {
        const bldc = s.type === 'bldc';
        cage.visible = lRotor.visible = !bldc; core.visible = !bldc;
        magnet.visible = lN.visible = lS.visible = bldc;
        board.visible = lBoard.visible = bldc;
        lMain.element.textContent = bldc ? 'Stator coils' : 'Main winding';
        lStart.element.textContent = bldc ? 'Coils switched by the controller' : s.cap ? 'Starting winding + capacitor' : 'Starting winding (no capacitor)';
        since += dt;
        // Currents in the two windings (as fractions of full) and the field they make.
        let Ia = 0, Im = 0;
        if (!bldc) {
          fieldA += dt * FIELD_SHOWN * TAU;
          if (s.on) { Im = Math.sin(fieldA); Ia = s.cap ? Math.cos(fieldA) : 0; }
          // Torque on the rotor. Balanced windings: one field turning forwards.
          // One winding alone: two half-strength fields turning opposite ways (a quarter of the torque each).
          let T = 0;
          if (s.on) T = s.cap ? kloss(1 - w) : 0.25 * (kloss(1 - w) - kloss(1 + w));
          T -= LOAD * w * Math.abs(w) + 0.02 * w;
          w += (T / J) * dt;
        } else {
          // BLDC: the controller keeps the field a quarter turn ahead of the magnet, in 60° steps.
          const target = s.on ? 0.93 : 0;
          w += clamp(target - w, -0.8 * dt, 0.8 * dt) + (s.on ? 0 : -0.3 * w * dt);
          const step = Math.round((rotA + Math.PI / 2) / (Math.PI / 3)) * (Math.PI / 3);
          fieldA = step;
          if (s.on) { Ia = Math.cos(fieldA); Im = Math.sin(fieldA); }
        }
        rotA += w * FIELD_SHOWN * TAU * dt;
        rotor.rotation.z = rotA;
        st.w = w; st.hum = s.on && !bldc && !s.cap && Math.abs(w) < 0.02;
        // Field arrow: sum of the two windings' fields.
        const B = Math.hypot(Ia, Im);
        fArrow.rotation.z = Math.atan2(Im, Ia) - Math.PI / 2;
        fArrow.set(0.2 + 1.5 * B); fArrow.visible = B > 0.05;
        lField.visible = B > 0.05;
        // Coil colours: red for one direction of current, blue for the other.
        for (const c of coils) {
          const I = (c.main ? Im : Ia) * c.sign;
          c.mat.emissive.copy(I >= 0 ? hot : cold).multiplyScalar(Math.abs(I) * 0.9);
        }
        // Bars light up where the field sweeps past them fastest (induced current).
        const slip = bldc ? 0 : Math.abs(1 - w);
        const fa = Math.atan2(Im, Ia);
        for (const b of barMats) {
          const k = clamp(Math.abs(Math.cos(b.a + rotA - fa)) * B * Math.min(1, slip * 5), 0, 1);
          b.m.emissive.copy(k > 0 ? new THREE.Color(0xffd27a) : black).multiplyScalar(k * 0.8);
        }
      },
      readout: (s) => {
        const rpm = Math.round(Math.abs(st.w) * SYNC);
        const way = st.w > 0.02 ? 'anticlockwise' : st.w < -0.02 ? 'clockwise' : '';
        if (!s.on) return `<div class="big">Switched off</div><div class="row"><span>Rotor</span><b>${rpm ? rpm + ' rpm, slowing' : 'stopped'}</b></div>`;
        if (s.type === 'bldc') return `<div class="big">BLDC: about 30 W</div>
          <div class="row"><span>Rotor</span><b>${rpm} rpm, locked to the switching</b></div>
          <div class="row"><span>Same fan, induction motor</span><b>70–75 W</b></div>
          <div class="row"><span>Energy saved</span><b>about 60%</b></div>`;
        if (st.hum) return `<div class="big no">Humming, not turning</div>A flipping field pulls both ways at once. Give the rotor a push.`;
        const slip = (1 - Math.abs(st.w)) * 100;
        return `<div class="big">${rpm} rpm ${way}</div>
          <div class="row"><span>Field turns at</span><b>${SYNC} rpm (${POLES} poles, ${HZ} Hz)</b></div>
          <div class="row"><span>Slip</span><b>${slip.toFixed(0)}%</b></div>
          <div class="row"><span>Power at the plug</span><b>about 75 W</b></div>
          ${s.cap ? '' : '<div class="no">No capacitor: weak and slow, turning whichever way it was pushed.</div>'}`;
      },
    };
  },
};

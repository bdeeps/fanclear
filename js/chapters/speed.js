// Chapter 4: the fan laws. Airflow grows with speed, push with speed², power with speed³.
import { THREE, M, canvasTexture, approach, box } from '../kit.js';
import { makeCeilingFan, makeRoomAir, CEIL } from '../fan.js';

// A typical 1200 mm ceiling fan at full speed.
const FULL_RPM = 350;
const FULL_Q = 210;          // m³/min, a typical rated air delivery for this size
// Power the blades themselves need at full speed. A BLDC fan moves this much air on about
// 30 W at the plug with a motor and driver around 85% efficient, so roughly 26 W reaches
// the blades. (An ordinary induction fan draws 70–75 W for the same job: its motor wastes more.)
const FULL_SHAFT_W = 26;
// Rough regulator steps for an ordinary five-step ceiling fan regulator.
const STEPS = [0, 130, 180, 230, 290, 350];

export const fanLaws = (rpm) => { const k = rpm / FULL_RPM; return { k, q: FULL_Q * k, p: k * k, w: FULL_SHAFT_W * k ** 3 }; };

export default {
  id: 'speed',
  short: 'Speed and power',
  title: 'Faster fans, much hungrier motors',
  subtitle: 'Twice the speed moves twice the air, but needs eight times the power.',
  view: { pos: [2.2, 3.8, 11.5], target: [-2.0, 3.3, 0] },
  learn: `<p>Turn a fan up and three things change, each in its own way. Engineers call these the <b>fan laws</b>.</p>
    <p><b>Airflow</b> grows in step with speed: twice the rpm, twice the air. The <b>push</b> (pressure) the blades make grows with speed × speed, because each bit of air is hit harder <i>and</i> more often. The <b>power</b> it takes grows with speed × speed × speed. So a fan at half speed moves half the air on only one eighth of the power.</p>
    <p>That is why the <b>regulator</b> on the wall saves real energy on the low steps. It changes speed with no gears at all: it just gives the motor less voltage (old ones did this with a resistor that wasted the rest as heat; modern ones don't), or, in a BLDC fan, tells the electronics to switch the coils more slowly.</p>
    <p class="tip"><b>Try it:</b> step the regulator from 1 to 5 and watch the three curves. The power line starts flat and then shoots up.</p>`,
  terms: [
    { t: 'rpm', d: 'Revolutions per minute: how many full turns the blades make each minute.' },
    { t: 'Fan laws', d: 'Airflow ∝ speed, pressure ∝ speed², power ∝ speed³, for the same fan.' },
    { t: 'Regulator', d: 'The speed control on the wall. It sets how fast the motor turns.' },
    { t: 'Cube law', d: 'Something that grows with speed × speed × speed: double the speed, eight times as much.' },
  ],
  defaults: { step: 4, rpm: 290 },
  onChange(s, key) {
    if (key === 'step') s.rpm = STEPS[s.step];
    if (key === 'rpm') { let best = 0; STEPS.forEach((r, i) => { if (Math.abs(r - s.rpm) < Math.abs(STEPS[best] - s.rpm)) best = i; }); s.step = best; }
  },
  controls: [
    { key: 'step', type: 'seg', label: 'Regulator', options: [0, 1, 2, 3, 4, 5].map((v) => ({ v, label: v ? String(v) : 'Off' })), fmt: (v) => (v ? `step ${v}` : 'off') },
    { key: 'rpm', type: 'range', label: 'Fan speed', min: 0, max: 350, step: 5, fmt: (v) => Math.round(v) + ' rpm' },
  ],
  quiz: [
    { q: 'You halve a fan’s speed. What happens to the airflow?', options: ['It stays the same', 'It halves', 'It drops to a quarter', 'It drops to an eighth'], answer: 1, why: 'Airflow grows in step with speed.' },
    { q: 'You halve a fan’s speed. What happens to the power the blades need?', options: ['It halves', 'It drops to a quarter', 'It drops to an eighth', 'It doesn’t change'], answer: 2, why: 'Power follows the cube of speed: ½ × ½ × ½ = ⅛.' },
    { q: 'How does a wall regulator change a ceiling fan’s speed?', options: ['With a gearbox in the fan', 'By changing how much electricity reaches the motor', 'By tilting the blades', 'By adding weight to the blades'], answer: 1, why: 'Less voltage (or, in a BLDC fan, slower switching) means the motor settles at a lower speed. No gears needed.' },
  ],
  reel: [
    { ms: 5600, caption: 'Double a fan’s speed and it moves twice the air, but needs eight times the power.', set: {}, anim: { rpm: [120, 350] }, view: { pos: [0.8, 4.0, 9.6], target: [-1.9, 3.5, 0] }, spin: 0.12 },
  ],

  build({ stage }) {
    const f = makeCeilingFan({ pitchDeg: 12, blade: 0xe8d7b8 });
    stage.root.add(f.group);
    const ceiling = box(10, 0.08, 10, M.clear(0xcfe0ff, 0.06)); ceiling.position.y = CEIL.TOP + 0.04; ceiling.castShadow = false; stage.root.add(ceiling);
    const air = makeRoomAir(420, 0x8ef0ff, { plane: -0.2 });
    stage.root.add(air.mesh);

    // A board with the three fan-law curves and a dot for the current speed.
    const cur = { k: 0.8 };
    const COLORS = { q: '#8ef0ff', p: '#ffb547', w: '#ff7a59' };
    const chart = canvasTexture(640, 460, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(7,8,12,.82)'; g.fillRect(0, 0, w, h);
      const x0 = 70, y0 = h - 60, cw = w - 110, ch = h - 130;
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { const y = y0 - (ch * i) / 4; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + cw, y); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '22px sans-serif';
      g.fillText('0', x0 - 30, y0 + 8); g.fillText('full', x0 - 52, y0 - ch + 8);
      g.fillText('0 rpm', x0 - 10, y0 + 38); g.fillText('350 rpm', x0 + cw - 70, y0 + 38);
      const curve = (fn, col) => { g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 60; i++) { const k = i / 60, x = x0 + cw * k, y = y0 - ch * fn(k); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
      curve((k) => k, COLORS.q); curve((k) => k * k, COLORS.p); curve((k) => k ** 3, COLORS.w);
      const k = cur.k, x = x0 + cw * k;
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 - ch); g.stroke(); g.setLineDash([]);
      for (const [fn, col] of [[k, COLORS.q], [k * k, COLORS.p], [k ** 3, COLORS.w]]) { g.fillStyle = col; g.beginPath(); g.arc(x, y0 - ch * fn, 11, 0, Math.PI * 2); g.fill(); }
      g.font = 'bold 26px sans-serif';
      g.fillStyle = COLORS.q; g.fillText('Airflow ∝ speed', 24, 40);
      g.fillStyle = COLORS.p; g.fillText('Push ∝ speed²', 250, 40);
      g.fillStyle = COLORS.w; g.fillText('Power ∝ speed³', 440, 40);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.16), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, side: THREE.DoubleSide }));
    board.position.set(-5.6, 3.0, -1.2); board.rotation.y = 0.45; stage.root.add(board);

    let spin = 0, rpm = 0, drawnK = -1;
    return {
      update(dt, s) {
        rpm = approach(rpm, s.rpm, 2, dt);
        spin -= (rpm / 60) * Math.PI * 2 * 0.25 * dt;        // shown about 4× slower
        f.spinner.rotation.y = spin;
        const v = 0.9 * 2 * Math.PI * 0.45 * Math.tan((12 * Math.PI) / 180) * (rpm / 60);   // same air model as the blades chapter
        air.update(dt, (v / 0.5) * 0.35, 1, -0.4 * Math.min(1, v));
        cur.k = rpm / FULL_RPM;
        if (Math.abs(cur.k - drawnK) > 0.004) { chart.redraw(); drawnK = cur.k; }
      },
      readout: (s) => {
        const { k, q, p, w } = fanLaws(s.rpm);
        return `<div class="big">${Math.round(q)} m³/min of air</div>
          <div class="row"><span>Speed</span><b>${Math.round(s.rpm)} rpm (${Math.round(k * 100)}%)</b></div>
          <div class="row"><span>Push (pressure)</span><b>${Math.round(p * 100)}% of full</b></div>
          <div class="row"><span>Power to turn the blades</span><b>${w.toFixed(w < 10 ? 1 : 0)} W (${Math.round(k ** 3 * 100)}%)</b></div>`;
      },
    };
  },
};

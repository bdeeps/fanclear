// Chapter 2: how tilted blades push air, and why a ceiling fan can run backwards.
import { THREE, M, arrow, approach, box, canvasTexture } from '../kit.js';
import { makeCeilingFan, makeRoomAir, CEIL } from '../fan.js';

// A 1200 mm ceiling fan. Each turn, a blade tilted at angle θ would screw itself forward
// 2π·r·tanθ through the air if the air didn't slip; real air slips a little.
const R = 0.6, HUB = 0.1, R75 = 0.75 * R;            // metres
const SLIP = 0.9;                                    // calibrated: 12° at 350 rpm gives ≈210 m³/min, a typical rated airflow
const RHO = 1.2;                                     // air density, kg/m³
const AREA = Math.PI * (R * R - HUB * HUB);          // swept area, m²
export const airSpeed = (rpm, deg) => SLIP * 2 * Math.PI * R75 * Math.tan((deg * Math.PI) / 180) * (rpm / 60);   // m/s through the fan
export const airflow = (rpm, deg) => airSpeed(rpm, deg) * AREA * 60;                                             // m³/min
const airPower = (v) => 0.5 * RHO * AREA * v ** 3;   // kinetic energy given to the air each second, W

export default {
  id: 'blades',
  short: 'Tilted blades',
  title: 'How tilted blades push air',
  subtitle: 'Each blade is a slanted paddle that shoves air one way as it sweeps round.',
  view: { pos: [3.4, 3.7, 5.2], target: [0, 4.3, 0] },
  learn: `<p>Look at a fan blade from the side and you'll see it's <b>tilted</b>. One edge, the <b>leading edge</b>, is higher than the other. As the blade sweeps round, that slope scoops air and pushes it out of the other side, just like a boat's propeller pushes water.</p>
    <p>The tilt is called the <b>pitch</b>. With no pitch the blades just slice through the air and move almost nothing. More pitch pushes more air each turn, but it also needs much more power, because the energy in moving air grows with the <b>cube</b> of its speed. Most ceiling fans use about 10 to 14 degrees.</p>
    <p>Run the motor <b>backwards</b> and the same blades push air the other way. In winter, many ceiling fans turn slowly in <b>reverse</b>: they pull air up and spill the warm air that collects near the ceiling down the walls, without a chilly breeze on you.</p>
    <p class="tip"><b>Try it:</b> flatten the blades to 0°, then tilt them up. Then flip the switch to winter.</p>`,
  terms: [
    { t: 'Pitch', d: 'How steeply a blade is tilted from the flat plane it spins in.' },
    { t: 'Leading edge', d: 'The edge of the blade that meets the air first as it turns.' },
    { t: 'Airflow', d: 'How much air the fan moves, usually in cubic metres per minute.' },
    { t: 'Reverse mode', d: 'Spinning the fan the other way so it pulls air up instead of pushing it down.' },
  ],
  defaults: { rpm: 300, pitch: 12, winter: false },
  controls: [
    { key: 'rpm', type: 'range', label: 'Fan speed', min: 0, max: 350, step: 5, fmt: (v) => Math.round(v) + ' rpm' },
    { key: 'pitch', type: 'range', label: 'Blade tilt (pitch)', min: 0, max: 30, step: 0.5, ends: ['flat', 'steep'], fmt: (v) => v.toFixed(1) + '°' },
    { key: 'winter', type: 'toggle', label: 'Reverse (winter mode)', hint: 'Same blades, spinning the other way.' },
  ],
  quiz: [
    { q: 'Why do fan blades need to be tilted?', options: ['To look nice', 'So that as they sweep round they push air out of one side', 'To stop them wobbling', 'To make the motor cooler'], answer: 1, why: 'A flat blade slices through the air. A tilted one shoves it sideways, out of the fan.' },
    { q: 'What happens when a ceiling fan runs in reverse?', options: ['It stops moving air', 'It pulls air up towards the ceiling instead of pushing it down', 'It blows cold air', 'It uses no power'], answer: 1, why: 'The same tilted blades moving the other way push air the other way.' },
    { q: 'Doubling the air speed takes about how much more power?', options: ['The same', 'Twice as much', 'Four times', 'Eight times'], answer: 3, why: 'The energy the air carries away each second grows with the cube of its speed: 2 × 2 × 2 = 8.' },
  ],
  reel: [
    { ms: 5200, caption: 'Each blade is tilted, so as it sweeps round it shoves air out of one side.', set: { rpm: 300, winter: false }, anim: { pitch: [0, 13] }, view: { pos: [3.8, 4.1, 6.0], target: [0.8, 4.3, 0.5] }, spin: 0.25 },
    { ms: 5000, caption: 'Spin it backwards and the same blades pull air up: winter mode.', set: { rpm: 220, pitch: 12, winter: true }, view: { pos: [3.8, 4.1, 6.0], target: [0.8, 4.3, 0.5] }, spin: 0.2 },
  ],

  build({ stage }) {
    const f = makeCeilingFan({ pitchDeg: 12 });
    stage.root.add(f.group);
    const ceiling = box(10, 0.08, 10, M.clear(0xcfe0ff, 0.06)); ceiling.position.y = CEIL.TOP + 0.04; ceiling.castShadow = false; stage.root.add(ceiling);
    const air = makeRoomAir(460, 0x8ef0ff, { plane: -0.6 });
    stage.root.add(air.mesh);

    // Arrows riding on one blade: how it moves (amber) and where it pushes the air (blue).
    const rider = new THREE.Group(); f.spinner.add(rider);
    const move = arrow(0xffb547, 0.9, 0.22, 0.03); move.position.set(1.0, 0.12, 0); rider.add(move);
    const push = arrow(0x8ef0ff, 0.9, 0.22, 0.03); push.position.set(1.0, -0.12, 0); rider.add(push);
    const lMove = stage.label('Blade moves this way', [1.0, 0.1, 1.2], rider);
    const lPush = stage.label('Air pushed', [1.2, -0.9, 0], rider, 'hot');
    stage.label('Ceiling', [3.6, CEIL.TOP + 0.25, -3.6]);
    const lDir = stage.label('', [2.6, 1.0, 0]);

    // A diagram of one blade seen end-on: its tilt, which way it moves and where it throws the air.
    const dia = { pitch: 12, d: 1, v: 2.7 };
    const board = canvasTexture(520, 340, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.82)'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '24px sans-serif'; g.fillText('One blade, seen end-on', 20, 36);
      g.fillStyle = '#ffb547'; g.fillText(`tilt ${dia.pitch.toFixed(0)}°`, w - 120, 36);
      const cx = w / 2, cy = h / 2 + 6, th = (dia.pitch * Math.PI) / 180, L = 150;
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 190, cy); g.lineTo(cx + 190, cy); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#f1e3c8'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - L * Math.cos(th), cy + L * Math.sin(th)); g.lineTo(cx + L * Math.cos(th), cy - L * Math.sin(th)); g.stroke();
      const arrowTo = (x0, y0, x1, y1, col, wd) => { g.strokeStyle = g.fillStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 18 * Math.cos(a - 0.45), y1 - 18 * Math.sin(a - 0.45)); g.lineTo(x1 - 18 * Math.cos(a + 0.45), y1 - 18 * Math.sin(a + 0.45)); g.closePath(); g.fill(); };
      const my = cy - dia.d * 80;                       // the motion arrow sits on the side the air comes from
      arrowTo(cx - dia.d * 70, my, cx + dia.d * 70, my, '#ffb547', 6);
      g.fillStyle = '#ffb547'; g.font = '20px sans-serif'; g.fillText('blade moves', cx - 55, my - dia.d * 16 + (dia.d > 0 ? 0 : 14));
      const len = Math.min(95, 10 + dia.v * 26);
      if (dia.v > 0.05) for (const x of [-90, 0, 90]) arrowTo(cx + x, cy + dia.d * 30, cx + x, cy + dia.d * (30 + len), '#8ef0ff', 5);
      g.fillStyle = '#8ef0ff'; g.fillText(dia.v > 0.05 ? (dia.d > 0 ? 'air pushed down' : 'air pushed up') : 'no push', 20, h - 18);
    });
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: board.tex, transparent: true, side: THREE.DoubleSide }));
    boardMesh.position.set(2.3, 3.0, 1.4); boardMesh.rotation.y = 0.4; stage.root.add(boardMesh);

    let spin = 0, shown = { rpm: 0, pitch: 12 }, dir = 1, pitchBuilt = 12;
    return {
      update(dt, s) {
        dir = approach(dir, s.winter ? -1 : 1, 3, dt);
        shown.rpm = approach(shown.rpm, s.rpm, 2, dt);
        shown.pitch = approach(shown.pitch, s.pitch, 8, dt);
        if (Math.abs(shown.pitch - pitchBuilt) > 0.2) { f.setPitch(shown.pitch); pitchBuilt = shown.pitch; }
        // Summer: counterclockwise seen from below (negative about +Y), air down. Shown about 4× slower.
        spin -= dir * (shown.rpm / 60) * Math.PI * 2 * 0.25 * dt;
        f.spinner.rotation.y = spin;
        const v = airSpeed(shown.rpm, shown.pitch);             // m/s
        air.update(dt, (Math.abs(v) / 0.5) * 0.35, Math.sign(dir) || 1, -dir * 0.4 * Math.min(1, v));
        // Arrows: the blade at +X moves towards +Z in summer; the air goes down (or up in winter).
        const d = dir >= 0 ? 1 : -1;
        move.rotation.set(d * Math.PI / 2, 0, 0);
        push.rotation.set(d > 0 ? Math.PI : 0, 0, 0); push.position.y = d > 0 ? -0.12 : 0.12;
        push.set(0.15 + Math.min(1.2, v * 0.35));
        lPush.position.set(1.2, d > 0 ? -0.95 : 1.0, 0);
        lMove.element.textContent = d > 0 ? 'Blade moves this way, raised edge first' : 'Now the lower edge leads';
        lMove.position.set(1.05, 0.12, d * 1.25);
        if (Math.abs(dia.pitch - shown.pitch) > 0.3 || dia.d !== d || Math.abs(dia.v - v) > 0.05) { dia.pitch = shown.pitch; dia.d = d; dia.v = v; board.redraw(); }
        lDir.element.textContent = v < 0.05 ? 'Hardly any air moves' : d > 0 ? 'Air goes down, then round the room' : 'Air goes up, along the ceiling, down the walls';
      },
      readout: (s) => {
        const v = airSpeed(s.rpm, s.pitch), q = airflow(s.rpm, s.pitch), p = airPower(v);
        return `<div class="big">${Math.round(q)} m³ of air a minute</div>
          <div class="row"><span>Air speed through the fan</span><b>${v.toFixed(1)} m/s</b></div>
          <div class="row"><span>Direction</span><b>${s.winter ? 'up (winter)' : 'down (summer)'}</b></div>
          <div class="row"><span>Power given to the air</span><b ${p > 35 ? 'class="no"' : ''}>${p.toFixed(p < 10 ? 1 : 0)} W</b></div>
          ${p > 35 ? '<div class="no">More than a normal 75 W fan motor can give: it would slow down.</div>' : ''}`;
      },
    };
  },
};

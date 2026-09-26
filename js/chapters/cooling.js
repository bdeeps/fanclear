// Chapter 5: why a fan feels cool though it doesn't cool the air.
import { THREE, M, box, swarm, approach, clamp } from '../kit.js';
import { makeDeskFan, vrod } from '../fan.js';

// "Cooling effect" of moving air, from the ASHRAE Standard 55 SET method (the same model
// behind the CBE Thermal Comfort Tool): how many °C cooler the room would need to be, in
// still air (0.1 m/s), to feel the same. Computed with pythermalcomfort's cooling_effect()
// for a lightly dressed person sitting quietly (0.5 clo, 1.1 met), air and wall temperatures equal.
// (One small dip in the 80%, 34 °C row is smoothed out.)
const CE_V = [0.1, 0.2, 0.3, 0.5, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
const CE_T = [26, 30, 34, 38];
const CE = {
  30: [[0, 0.8, 1.6, 2.4, 3.2, 3.6, 3.9, 4.3, 4.7, 5.0, 5.3], [0, 0.9, 1.8, 2.8, 3.5, 3.8, 4.1, 4.3, 4.7, 4.9, 5.1], [0, 1.0, 2.0, 3.0, 3.8, 4.1, 4.3, 4.6, 4.9, 5.1, 5.3], [0, 1.1, 2.1, 3.2, 4.0, 4.3, 4.5, 4.8, 5.0, 5.2, 5.4]],
  50: [[0, 0.8, 1.6, 2.4, 3.1, 3.5, 3.8, 4.1, 4.6, 4.9, 5.1], [0, 0.9, 1.7, 2.6, 3.4, 3.7, 3.9, 4.2, 4.5, 4.8, 5.0], [0, 0.9, 1.8, 2.7, 3.5, 3.8, 4.0, 4.2, 4.5, 4.8, 4.9], [0, 0.8, 1.6, 2.5, 3.2, 3.5, 3.7, 4.0, 4.2, 4.4, 4.5]],
  80: [[0, 0.7, 1.5, 2.3, 3.0, 3.4, 3.6, 4.0, 4.4, 4.7, 4.9], [0, 0.7, 1.4, 2.3, 3.0, 3.2, 3.5, 3.8, 4.1, 4.3, 4.5], [0, 0.7, 1.3, 2.3, 2.8, 3.0, 3.2, 3.2, 3.3, 3.5, 3.6], [0, 0.4, 0.8, 1.3, 1.7, 1.8, 2.0, 2.1, 2.3, 2.5, 2.6]],
};
const interp = (xs, ys, x) => { x = clamp(x, xs[0], xs.at(-1)); let i = 0; while (i < xs.length - 2 && x > xs[i + 1]) i++; const k = (x - xs[i]) / (xs[i + 1] - xs[i]); return ys[i] + (ys[i + 1] - ys[i]) * k; };
export function coolingEffect(v, t, rh) { const rows = CE[rh] || CE[50]; return interp(CE_T, rows.map((r) => interp(CE_V, r, v)), t); }

// Heat carried from skin by moving air (ASHRAE Handbook, Fundamentals: seated person,
// hc = 8.3·v^0.6 W/m²K, and no less than about 3.1 for still air). Skin is about 34 °C.
const SKIN = 34;
const hc = (v) => Math.max(3.1, 8.3 * Math.pow(v, 0.6));
const psat = (t) => 0.61094 * Math.exp((17.625 * t) / (t + 243.04));      // kPa (Magnus formula)
// The most heat the air could take by drying fully wet skin (Lewis relation, 16.5 K/kPa).
const eMax = (v, t, rh) => 16.5 * hc(v) * (psat(SKIN) - (rh / 100) * psat(t));
const FAN_W = 55;                                                          // a 400 mm desk fan at full speed

export default {
  id: 'cooling',
  short: 'Why it feels cool',
  title: 'Why a fan feels cool',
  subtitle: 'It doesn’t cool the air. It strips the warm, damp layer off your skin.',
  view: { pos: [1.0, 4.6, 9.8], target: [-0.5, 1.8, 0] },
  learn: `<p>Here's the surprise: a fan does <b>not</b> make the air colder. Leave one running in an empty room and the room gets very slightly <b>warmer</b>, because all the electricity the motor uses ends up as heat.</p>
    <p>You feel cooler because your body is warmer than the air, about 34 °C at the skin. In still air a thin blanket of warm, damp air clings to you and slows the heat down. A breeze blows that blanket away, so heat leaves you faster. That's <b>wind chill</b>, or <b>convection</b>.</p>
    <p>The bigger effect is <b>evaporation</b>. Turning sweat into vapour takes a lot of heat, and it takes it from your skin. Moving air carries the damp air away so more sweat can dry. In very humid air, sweat dries slowly and the fan helps less.</p>
    <p>A breeze of about 1 m/s feels roughly 3 to 4 °C cooler. When the air is hotter than your skin, the breeze starts heating you instead, and only drying sweat still helps.</p>
    <p class="tip"><b>Try it:</b> turn the breeze up and watch the warm layer thin and the sweat beads shrink. Then make it muggy.</p>`,
  terms: [
    { t: 'Convection', d: 'Heat carried away by moving air or water.' },
    { t: 'Evaporation', d: 'A liquid turning into a gas. It soaks up heat, which is why drying sweat cools you.' },
    { t: 'Humidity', d: 'How much water vapour the air already holds. Humid air dries sweat slowly.' },
    { t: 'Cooling effect', d: 'How many degrees cooler a breeze makes you feel, compared with still air.' },
  ],
  defaults: { v: 1, temp: 30, rh: 50 },
  controls: [
    { key: 'v', type: 'range', label: 'Breeze on your skin', min: 0.1, max: 3, step: 0.05, ends: ['still', 'strong'], fmt: (v) => v.toFixed(1) + ' m/s' },
    { key: 'temp', type: 'range', label: 'Room temperature', min: 26, max: 38, step: 0.5, fmt: (v) => v.toFixed(1) + ' °C' },
    { key: 'rh', type: 'seg', label: 'Humidity', options: [{ v: 30, label: 'Dry 30%' }, { v: 50, label: 'Normal 50%' }, { v: 80, label: 'Muggy 80%' }] },
  ],
  quiz: [
    { q: 'What does a fan do to the temperature of the air in a room?', options: ['Cools it a lot', 'Cools it a little', 'Nothing, or warms it very slightly', 'Makes it much hotter'], answer: 2, why: 'The motor’s electricity ends up as heat. The cool feeling comes from air moving over your skin.' },
    { q: 'Why does a breeze feel cool on sweaty skin?', options: ['It carries cold from outside', 'It helps sweat evaporate, which takes heat from your skin', 'It blocks sunlight', 'It lowers your blood pressure'], answer: 1, why: 'Evaporation soaks up heat. Moving air carries damp air away so more sweat can dry.' },
    { q: 'When does a fan help least?', options: ['In cool, dry air', 'In very hot, very humid air', 'At night', 'When the fan is on high'], answer: 1, why: 'Humid air dries sweat slowly, and air hotter than your skin heats you as it blows past.' },
  ],
  reel: [
    { ms: 5600, caption: 'A fan doesn’t cool the air. It blows away the warm layer on your skin and dries your sweat.', set: { temp: 30, rh: 50 }, anim: { v: [0.1, 2.5] }, view: { pos: [0.9, 4.6, 9.6], target: [-0.6, 1.6, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    // A slab of skin, seen close up.
    const skin = box(7.4, 0.6, 3.2, M.matte(0xd9a07c, { roughness: 0.7 })); skin.position.y = 0.7; stage.root.add(skin);
    const under = box(7.4, 0.3, 3.2, M.matte(0xb5535a)); under.position.y = 0.25; stage.root.add(under);
    const TOP = 1.0;

    // The desk fan, small, blowing along +X across the skin.
    const fan = makeDeskFan({ gearbox: false }); fan.group.scale.setScalar(0.55); fan.group.rotation.y = Math.PI / 2; fan.group.position.set(-4.9, 0, 0);
    fan.setCrank(0, 0); fan.link.visible = false; fan.lug.visible = false;
    stage.root.add(fan.group);

    // The warm, damp layer of air on the skin.
    const layerMat = M.ghost(0xff8a4a, 0.3);
    const layer = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1, 3.2), layerMat); stage.root.add(layer);

    // Sweat beads.
    const NB = 42, beads = swarm(NB, new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.clear(0xe8f6ff, 0.75, { depthWrite: true, roughness: 0.05, metalness: 0.1 }));
    stage.root.add(beads);
    const B = Array.from({ length: NB }, (_, i) => ({ x: -3.3 + ((i % 14) + 0.5 * ((i / 14) | 0) % 1) * 0.5 + ((i * 37) % 10) * 0.02, z: -1.1 + ((i / 14) | 0) * 1.1 + ((i * 53) % 10) * 0.03, s: 0.5 + ((i * 29) % 10) * 0.05 }));
    // Water vapour leaving the beads.
    const NV = 140, vapour = swarm(NV, new THREE.SphereGeometry(0.035, 8, 6), M.glow(0xdff4ff, { transparent: true, opacity: 0.8 }));
    stage.root.add(vapour);
    const V = Array.from({ length: NV }, (_, i) => ({ life: -((i * 0.618) % 1) * 2, x: 0, y: 0, z: 0 }));
    // The breeze.
    const NW = 220, wind = swarm(NW, new THREE.BoxGeometry(0.26, 0.022, 0.022), M.glow(0x8ef0ff, { transparent: true, opacity: 0.75 }));
    stage.root.add(wind);
    const Wd = Array.from({ length: NW }, (_, i) => ({ x: -3.7 + ((i * 0.618) % 1) * 7.4, y: TOP + 0.04 + Math.pow((i * 0.7548) % 1, 1.4) * 2.2, z: -1.5 + ((i * 0.5698) % 1) * 3 }));

    // A thermometer in the room air.
    const glass = vrod(1.0, 3.8, 0.12, 0.12, M.clear(0xffffff, 0.25), 24); glass.position.set(3.9, glass.position.y, -1.2); stage.root.add(glass);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), M.glow(0xff5a4a)); bulb.position.set(3.9, 1.0, -1.2); stage.root.add(bulb);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 12), M.glow(0xff5a4a)); col.position.x = 3.9; col.position.z = -1.2; stage.root.add(col);
    const lAir = stage.label('', [3.9, 4.15, -1.2], stage.root, 'hot');
    const lFeel = stage.label('', [0.6, 3.5, 0.4], stage.root);
    const lLayer = stage.label('Warm, damp air clinging to the skin', [-1.8, 1.2, 1.7]);
    stage.label('Skin, about 34 °C', [2.4, 0.6, 1.7]);
    stage.label('Sweat', [-2.6, 1.15, -1.5]);
    stage.label(`Fan: ${FAN_W} W, all of it ends up as heat`, [-4.1, 3.0, 0.4]);

    let spin = 0, thick = 0.5, seed = 12345;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // repeatable, so videos come out the same
    return {
      update(dt, s) {
        const h = hc(s.v);
        // The layer's thickness is about k/hc (air conducts 0.026 W/mK): 8 mm in still air, 2 mm at 3 m/s. Drawn much thicker.
        thick = approach(thick, 3.2 / h, 3, dt);
        layer.scale.y = thick; layer.position.y = TOP + thick / 2;
        layerMat.opacity = 0.18 + 0.2 * clamp((s.temp - 24) / 12, 0, 1);
        spin += s.v * 1.6 * dt; fan.setSpin(spin);
        // Beads grow as you sweat and shrink as they dry. Drying scales with hc and the vapour-pressure gap.
        const dp = psat(SKIN) - (s.rh / 100) * psat(s.temp);
        const dry = 0.025 * h * Math.max(0.05, dp), sweat = 0.25 * (0.5 + (s.temp - 24) / 12);
        for (let i = 0; i < NB; i++) { const b = B[i]; b.s = clamp(b.s + (sweat * (0.8 + (i % 5) * 0.1) - dry * b.s) * dt, 0.05, 1.6); beads.place(i, [b.x, TOP, b.z], null, 0.35 + b.s * 0.7); }
        beads.done();
        // Vapour: rises off the beads and is swept away by the breeze.
        const u = (y) => s.v * (1 - Math.exp(-(y - TOP) / 0.3));
        for (let i = 0; i < NV; i++) {
          const p = V[i]; p.life += dt;
          if (p.life > 2) { const b = B[(i * 7) % NB]; p.x = b.x; p.y = TOP + 0.08; p.z = b.z; p.life = rnd() < clamp(dry * 0.5, 0.05, 1) ? 0 : -0.4 * rnd(); }
          if (p.life < 0) { vapour.place(i, [0, -5, 0], null, 0.001); continue; }
          p.y += 0.35 * dt; p.x += u(p.y) * 1.3 * dt;
          vapour.place(i, [p.x, p.y, p.z], null, p.x > 3.8 ? 0.001 : 1 - p.life / 2.2);
        }
        vapour.done();
        for (let i = 0; i < NW; i++) {
          const p = Wd[i]; p.x += u(p.y) * 1.3 * dt; if (p.x > 3.7) p.x -= 7.4;
          wind.place(i, [p.x, p.y, p.z], null, s.v < 0.15 ? 0.001 : 0.5 + 0.5 * Math.min(1, u(p.y) / s.v));
        }
        wind.done();
        const tk = clamp((s.temp - 20) / 20, 0, 1) * 2.6;
        col.scale.y = tk; col.position.y = 1.0 + tk / 2;
        lAir.element.textContent = `Air: ${s.temp.toFixed(1)} °C`;
        lFeel.element.textContent = `Feels like ${(s.temp - coolingEffect(s.v, s.temp, s.rh)).toFixed(1)} °C`;
        lLayer.position.y = TOP + thick + 0.15;
      },
      readout: (s) => {
        const ce = coolingEffect(s.v, s.temp, s.rh), q = hc(s.v) * (SKIN - s.temp), e = eMax(s.v, s.temp, s.rh);
        return `<div class="big">Feels like ${(s.temp - ce).toFixed(1)} °C</div>The air is still ${s.temp.toFixed(1)} °C: the breeze makes it feel ${ce.toFixed(1)} °C cooler.
          <div class="row"><span>${q >= 0 ? 'Breeze carries off' : 'Breeze adds to you'}</span><b ${q < 0 ? 'class="no"' : ''}>${Math.abs(q).toFixed(0)} W/m² of skin</b></div>
          <div class="row"><span>Drying sweat could take</span><b>up to ${Math.max(0, e).toFixed(0)} W/m²</b></div>
          <div class="row"><span>The fan heats the room by</span><b>${FAN_W} W</b></div>`;
      },
    };
  },
};

// Fan models shared by FanClear's chapters: twisted blades, wire guards, gears,
// a desk fan with an oscillating head, a ceiling fan, and air that circulates a room.
import { THREE, M, rod, beam, box, torus, tube, spring, swarm } from './kit.js';

const TAU = Math.PI * 2;

// rod() runs along X and bakes in its x position; these give upright and front-to-back versions.
export function vrod(y0, y1, r0, r1 = r0, mat, seg = 40, open = false) { const m = rod(y0, y1, r0, r1, mat, seg, open); m.position.set(0, m.position.x, 0); m.rotation.z = Math.PI / 2; return m; }
export function zrod(z0, z1, r0, r1 = r0, mat, seg = 40, open = false) { const m = rod(z0, z1, r0, r1, mat, seg, open); m.position.set(0, 0, m.position.x); m.rotation.y = -Math.PI / 2; return m; }

// ---------------------------------------------------------------- blades
// A blade surface. Local frame: rotor axis +Y, the blade runs along +X from r0 to R.
// At each radius the section is a gently curved plate of chord c tilted by the pitch
// angle from the plane of rotation. hand = +1 means it is made to turn positively
// about +Y (a point on +X moves towards -Z): its leading edge is the raised one, so
// it pushes air towards -Y. Turn it the other way and it pushes air towards +Y.
export function bladeGeometry({ r0, R, chord, pitch, hand = 1, camber = 0.06, nr = 18, nc = 8 }) {
  const pos = [], idx = [];
  for (let i = 0; i <= nr; i++) {
    const u = i / nr, r = r0 + (R - r0) * u, c = chord(u), th = pitch(u);
    const cd = [0, Math.sin(th), -hand * Math.cos(th)];     // trailing → leading
    const nm = [0, Math.cos(th), hand * Math.sin(th)];      // towards the suction side
    for (let j = 0; j <= nc; j++) {
      const t = j / nc - 0.5, a = t * c, bulge = camber * c * (1 - 4 * t * t);
      pos.push(r, cd[1] * a + nm[1] * bulge, cd[2] * a + nm[2] * bulge);
    }
  }
  for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
    const a = i * (nc + 1) + j, b = a + nc + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// A spinning rotor: hub plus n blades, axis +Y. Returns the group and a setPitch().
export function makeRotor({ n = 3, r0, R, chord, pitch, hand = 1, color = 0x8ef0ff, hub = 0.2, hubH = 0.25, mat, irons = false }) {
  const g = new THREE.Group();
  const bmat = mat || M.plastic(color, { side: THREE.DoubleSide, roughness: 0.35, transparent: true, opacity: 0.94 });
  const blades = [];
  const make = (p) => bladeGeometry({ r0, R, chord, pitch: typeof p === 'function' ? p : () => p, hand });
  for (let k = 0; k < n; k++) {
    const holder = new THREE.Group(); holder.rotation.y = (k / n) * TAU;
    const m = new THREE.Mesh(make(pitch), bmat); m.castShadow = true;
    holder.add(m); blades.push(m);
    if (irons) holder.add(beam([hub * 0.9, 0.02, 0], [r0 + 0.12, 0.02, 0], 0.03, M.metal(0x9aa3b2)));
    g.add(holder);
  }
  return {
    group: g, blades, mat: bmat,
    setPitch(p) { const geo = make(p); blades.forEach((b, i) => { b.geometry.dispose(); b.geometry = i ? geo.clone() : geo; }); },
  };
}

// ---------------------------------------------------------------- guard
// A wire guard around a rotor. Axis +Y like the rotor; the front grill bulges to -Y.
export function makeGuard({ R, front = 0.45, back = 0.35, spokes = 28, rings = [0.35, 0.55, 0.75, 0.9], color = 0xd6dde8 }) {
  const g = new THREE.Group(), mat = M.metal(color, { roughness: 0.3 });
  const frontG = new THREE.Group(), backG = new THREE.Group();
  const dome = (s, d) => d * Math.sqrt(Math.max(0, 1 - s ** 6));
  const rimR = R;
  const rim = torus(rimR, 0.035, mat, 96); rim.rotation.x = Math.PI / 2; g.add(rim);
  for (const [grp, d, sign, n] of [[frontG, front, -1, spokes], [backG, back, 1, Math.round(spokes * 0.75)]]) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU, pts = [];
      for (let i = 0; i <= 8; i++) { const s = 0.16 + (0.84 * i) / 8; pts.push([Math.cos(a) * rimR * s, sign * dome(s, d), Math.sin(a) * rimR * s]); }
      grp.add(tube(pts, 0.012, mat, false, 16));
    }
    for (const s of rings) { const r = torus(rimR * s, 0.012, mat, 72); r.rotation.x = Math.PI / 2; r.position.y = sign * dome(s, d); grp.add(r); }
    const inner = torus(rimR * 0.16, 0.016, mat, 32); inner.rotation.x = Math.PI / 2; inner.position.y = sign * d; grp.add(inner);
    g.add(grp);
  }
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.16, rimR * 0.16, 0.03, 40), M.plastic(0x2a3040)); badge.position.y = -front; frontG.add(badge);
  return { group: g, front: frontG, back: backG, rim };
}

// ---------------------------------------------------------------- gears
// A spur gear in the XY plane (axis Z), pitch radius r.
export function gear(teeth, r, width = 0.08, color = 0xb7bfcc) {
  const g = new THREE.Group(), mat = M.metal(color, { roughness: 0.35 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, width, 48), mat);
  disc.rotation.x = Math.PI / 2; disc.castShadow = true; g.add(disc);
  const tw = Math.min(0.06, (TAU * r) / teeth * 0.5);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(tw, r * 0.14 + 0.02, width), mat, teeth);
  const o = new THREE.Object3D();
  for (let i = 0; i < teeth; i++) { const a = (i / teeth) * TAU; o.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); o.rotation.set(0, 0, a - Math.PI / 2); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); }
  g.add(inst);
  const mark = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, width + 0.01, 16), M.glow(0xff7a59));
  mark.rotation.x = Math.PI / 2; mark.position.x = r * 0.62; g.add(mark);
  return g;
}

// ---------------------------------------------------------------- desk fan
// A desk fan facing +Z. 1 unit ≈ 12.5 cm: blades 400 mm across (R = 1.6).
// The head yaws about a vertical pivot on the stand; everything that swings is in `head`.
export const DESK = { R: 1.55, PIVOT: [0, 2.4, -0.45], AXIS_Y: 0.8, BLADE_Z: 0.95 };

// Oscillation linkage, seen from above (x right, z forward), relative to the pivot.
// The crank turns on the head; its pin is tied to a fixed lug on the stand by a link,
// so as the crank turns the head is forced to swing to and fro (a four-bar linkage).
export const LINK = { G: [-0.04, -1.29], r: 0.14, A: [0.22, -0.05], L: 1.269 };
// Two holes on the crank: link lengths chosen (numerically) so each swing is centred.
export const THROWS = { wide: { r: 0.14, L: 1.269, deg: 77 }, narrow: { r: 0.1, L: 1.267, deg: 53 } };
export function swingAngle(phi, guess = 0) {
  const { G, r, A, L } = LINK;
  const f = (psi) => {
    const px = G[0] + r * Math.cos(phi), pz = G[1] + r * Math.sin(phi);
    const c = Math.cos(psi), s = Math.sin(psi);
    const wx = c * px + s * pz, wz = -s * px + c * pz;            // rotate about +Y by psi
    return Math.hypot(wx - A[0], wz - A[1]) - L;
  };
  let psi = guess;
  for (let k = 0; k < 12; k++) { const h = 1e-4, d = (f(psi + h) - f(psi - h)) / (2 * h); if (Math.abs(d) < 1e-8) break; psi -= f(psi) / d; }
  return psi;
}
// The crank pin's position in head coordinates, and the link's fixed end.
export function linkPoints(phi) { const { G, r } = LINK; return [G[0] + r * Math.cos(phi), G[1] + r * Math.sin(phi)]; }

export function makeDeskFan({ blade = 0x8ef0ff, body = 0xe9edf3, accent = 0xff7a59, gearbox = true } = {}) {
  const fan = new THREE.Group();
  const shellMat = M.plastic(body, { roughness: 0.4, transparent: true, opacity: 1 });
  const dark = M.plastic(0x2a3040);

  // Base with piano-key speed switches, and the stand.
  const base = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.32, 64), shellMat); plate.position.y = 0.16; plate.castShadow = plate.receiveShadow = true;
  plate.scale.z = 0.8; base.add(plate);
  const keys = [];
  for (let i = 0; i < 4; i++) {
    const k = box(0.26, 0.12, 0.34, i === 0 ? M.plastic(0xff6b6b) : M.plastic(0x5b6478)); k.position.set(-0.45 + i * 0.3, 0.36, 0.72); base.add(k); keys.push(k);
  }
  const pole = vrod(0.2, DESK.PIVOT[1], 0.12, 0.1, shellMat); pole.position.z = DESK.PIVOT[2];
  base.add(pole);
  // A lug on the stand that the oscillation link is tied to (fixed: it doesn't swing).
  const lug = new THREE.Group(); lug.position.set(0, DESK.PIVOT[1], DESK.PIVOT[2]);
  lug.add(beam([0, 0.02, 0], [LINK.A[0], 0.02, LINK.A[1]], 0.035, M.metal(0x9aa3b2)));
  const lugPin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16), M.metal(0x9aa3b2)); lugPin.position.set(LINK.A[0], 0.08, LINK.A[1]); lug.add(lugPin);
  base.add(lug);
  fan.add(base);

  // Everything that swings.
  const head = new THREE.Group(); head.position.set(...DESK.PIVOT); fan.add(head);
  const collar = vrod(-0.05, 0.25, 0.16, 0.16, dark); head.add(collar);

  // Motor: housing shell (can go see-through), stator ring with copper coils, rotor, shaft.
  const motor = new THREE.Group(); motor.position.set(0, DESK.AXIS_Y, 0); head.add(motor);
  const housing = new THREE.Group(); motor.add(housing);
  const housingMat = M.plastic(body, { roughness: 0.4, transparent: true, opacity: 1 });
  const shell = zrod(-0.85, 0.35, 0.58, 0.62, housingMat, 48); housing.add(shell);
  const nose = zrod(0.35, 0.55, 0.62, 0.34, housingMat, 48); housing.add(nose);
  const tail = zrod(-1.02, -0.85, 0.4, 0.58, housingMat, 48); housing.add(tail);
  const stator = new THREE.Group(); motor.add(stator);
  stator.add(zrod(-0.6, 0.15, 0.5, 0.5, M.metal(0x6c7484), 48, true));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, c = torus(0.1, 0.045, M.metal(0xd08a4a, { roughness: 0.4 }), 24);
    c.position.set(Math.cos(a) * 0.4, Math.sin(a) * 0.4, -0.22); c.scale.set(1, 1, 3.2); stator.add(c);
  }
  const rotor = new THREE.Group(); motor.add(rotor);
  rotor.add(zrod(-0.55, 0.1, 0.28, 0.28, M.metal(0x9aa3b2), 32));
  const shaft = zrod(-1.3, 1.05, 0.04, 0.04, M.metal(0xdfe4ec), 16); rotor.add(shaft);

  // Capacitor under the motor.
  const cap = zrod(-0.55, -0.1, 0.13, 0.13, M.plastic(0x2f5bff)); cap.position.y = -0.62; motor.add(cap);

  // Rotor with blades and spinner. Built with its axis +Y (air to -Y), turned so air goes to +Z.
  const mount = new THREE.Group(); mount.position.set(0, DESK.AXIS_Y, DESK.BLADE_Z); mount.rotation.x = -Math.PI / 2; head.add(mount);
  const spinner = new THREE.Group(); mount.add(spinner);
  const rotorBlades = makeRotor({ n: 3, r0: 0.18, R: DESK.R - 0.08, hand: 1, color: blade,
    chord: (u) => 0.55 + 0.75 * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.12)) * (u < 0.9 ? 1 : Math.sqrt(1 - ((u - 0.9) / 0.1) ** 2) * 0.9 + 0.1),
    pitch: (u) => (32 - 12 * u) * Math.PI / 180 });
  spinner.add(rotorBlades.group);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.22, 32), dark); cone.position.y = -0.13; cone.rotation.x = Math.PI; spinner.add(cone);
  const hubCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 32), dark); hubCyl.position.y = 0.05; spinner.add(hubCyl);

  const guard = makeGuard({ R: DESK.R + 0.1, front: 0.42, back: 0.4 });
  mount.add(guard.group);

  // Gearbox behind the motor: worm on the shaft, worm wheel, a pinion and the output gear.
  // Its output shaft runs down to the crank under the head.
  const gb = new THREE.Group(); head.add(gb);
  const gbShell = box(0.72, 0.5, 0.62, M.clear(0xcfe0ff, 0.22)); gbShell.position.set(0.05, DESK.AXIS_Y - 0.02, -1.25); gb.add(gbShell);
  const knob = vrod(DESK.AXIS_Y + 0.23, DESK.AXIS_Y + 0.5, 0.09, 0.07, dark); knob.position.set(0.2, knob.position.y, -1.22); gb.add(knob);
  const worm = spring(-1.4, -1.05, 0.07, 0.022, 5, M.metal(0xe8c46a)); worm.rotation.y = -Math.PI / 2;   // spring() runs along X; this turns it to run along Z
  const wormHolder = new THREE.Group(); wormHolder.position.y = DESK.AXIS_Y; wormHolder.add(worm); gb.add(wormHolder);
  // The worm wheel turns on an upright axis beside the worm; a pinion under it drives the output gear.
  const W = [0.2, -1.22];
  const wormWheel = gear(60, 0.13, 0.05, 0xb7bfcc); wormWheel.rotation.x = -Math.PI / 2;
  const wwHolder = new THREE.Group(); wwHolder.position.set(W[0], DESK.AXIS_Y, W[1]); wwHolder.add(wormWheel); gb.add(wwHolder);
  const pinion = gear(10, 0.05, 0.05, 0xdfe4ec); pinion.rotation.x = -Math.PI / 2; pinion.position.y = -0.12; wwHolder.add(pinion);
  wwHolder.add(beam([0, 0.05, 0], [0, -0.16, 0], 0.02, M.metal(0xdfe4ec)));
  const outAxis = LINK.G;                                              // head-local = relative to the pivot
  const outGear = gear(40, 0.2, 0.05, 0x9aa3b2); outGear.rotation.x = -Math.PI / 2;
  const ogHolder = new THREE.Group(); ogHolder.position.set(outAxis[0], DESK.AXIS_Y - 0.12, outAxis[1]); ogHolder.add(outGear); gb.add(ogHolder);
  // Output shaft and crank, below the motor.
  const outShaft = beam([outAxis[0], DESK.AXIS_Y - 0.12, outAxis[1]], [outAxis[0], 0.12, outAxis[1]], 0.025, M.metal(0xdfe4ec)); gb.add(outShaft);
  const crank = new THREE.Group(); crank.position.set(outAxis[0], 0.12, outAxis[1]); gb.add(crank);
  const crankArm = box(1, 0.05, 0.08, M.metal(0x9aa3b2)); crank.add(crankArm);
  const crankPin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), M.glow(accent)); crankPin.position.set(LINK.r, 0, 0); crank.add(crankPin);
  // The link lives on the fan (world-ish) so it can be re-aimed every frame.
  const linkMat = M.metal(0xffb547, { roughness: 0.3 });
  const link = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 12), linkMat); link.castShadow = true; fan.add(link);
  gb.visible = gearbox;

  const up = new THREE.Vector3(0, 1, 0), pA = new THREE.Vector3(), pB = new THREE.Vector3();
  const api = {
    group: fan, base, pole, keys, head, motor, housing, shell, nose, tail, stator, rotor, cap, mount, spinner, guard, rotorBlades, gb, gbShell, knob,
    wormHolder, wwHolder, ogHolder, crank, link, lug, shellMat, housingMat, worm, wormWheel, pinion, outGear,
    // Spin the blades (and the rotor) by an angle in radians.
    setSpin(a) { spinner.rotation.y = a; rotor.rotation.z = -a; wormHolder.rotation.z = -a; },
    // Place the gears for a crank angle, and swing the head to match.
    setCrank(phi, psi) {
      crank.rotation.y = -phi;
      ogHolder.rotation.y = -phi; wwHolder.rotation.y = phi * 4; // pinion 10 → gear 40
      head.rotation.y = psi;
      // Re-aim the link from the crank pin (on the swinging head) to the lug (fixed).
      crankPin.getWorldPosition(pA); lugPin.getWorldPosition(pB); fan.worldToLocal(pA); fan.worldToLocal(pB);
      link.position.copy(pA).add(pB).multiplyScalar(0.5); link.scale.y = pA.distanceTo(pB);
      link.quaternion.setFromUnitVectors(up, pB.clone().sub(pA).normalize());
    },
    setThrow(name) { const t = THROWS[name] || THROWS.wide; LINK.r = t.r; LINK.L = t.L; crankArm.scale.x = t.r + 0.06; crankArm.position.x = t.r / 2; crankPin.position.x = t.r; },
    setKeys(step) { keys.forEach((k, i) => { k.position.y = i === step ? 0.3 : 0.36; }); },
  };
  api.setThrow('wide');
  api.setCrank(0, swingAngle(0));
  return api;
}

// ---------------------------------------------------------------- ceiling fan
// A 1200 mm ceiling fan. 1 unit = 0.5 m; the ceiling is at y = 6 (3 m), blades at y ≈ 5.2.
export const CEIL = { R: 1.2, Y: 5.2, TOP: 6, WALL: 4.6 };

export function makeCeilingFan({ blade = 0xf1e3c8, body = 0xd9dee7, hand = -1, pitchDeg = 12 } = {}) {
  const fan = new THREE.Group();
  const bodyMat = M.metal(body, { roughness: 0.35, metalness: 0.5 });
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.16, 40), bodyMat); canopy.position.y = CEIL.TOP - 0.08; fan.add(canopy);
  fan.add(beam([0, CEIL.TOP - 0.1, 0], [0, CEIL.Y + 0.3, 0], 0.04, bodyMat));
  // The stator is fixed to the downrod; in a ceiling fan the rotor is the outside of the motor, and it spins.
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.12, 48), bodyMat); top.position.y = CEIL.Y + 0.24; fan.add(top);
  const spinner = new THREE.Group(); spinner.position.y = CEIL.Y; fan.add(spinner);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.3, 48), M.metal(body, { roughness: 0.35, metalness: 0.5 })); bowl.position.y = 0.05; bowl.castShadow = true; spinner.add(bowl);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.04, 48), M.glow(0xff7a59)); stripe.position.y = 0.12; spinner.add(stripe);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 16, 0, TAU, Math.PI / 2, Math.PI / 2), bodyMat); cap.position.y = -0.1; cap.scale.y = 0.5; spinner.add(cap);
  const rot = makeRotor({ n: 3, r0: 0.5, R: CEIL.R, hand, hub: 0.32, irons: true, color: blade,
    chord: (u) => 0.2 + 0.05 * u - (u > 0.94 ? 0.12 * ((u - 0.94) / 0.06) ** 2 : 0),
    pitch: pitchDeg * Math.PI / 180 });
  rot.group.position.y = -0.02;
  spinner.add(rot.group);
  return { group: fan, spinner, rotor: rot, setPitch: (deg) => rot.setPitch(deg * Math.PI / 180) };
}

// ---------------------------------------------------------------- room air
// Tracer particles that circulate a room around a ceiling fan: down through the fan,
// out across the floor, up the walls and back along the ceiling (dir = +1), or the
// reverse (dir = -1). Speeds are fractions of the air speed through the fan.
// Most tracers sit in a vertical slice at angle `plane` (face it to the camera) so the two loops read clearly.
export function makeRoomAir(count = 420, color = 0x8ef0ff, { plane = 0, slice = 0.75 } = {}) {
  const mesh = swarm(count, new THREE.SphereGeometry(0.034, 8, 6), M.glow(color, { transparent: true, opacity: 0.9 }));
  let seed = 20240;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;     // repeatable, so videos come out the same
  const P = Array.from({ length: count }, () => {
    const inSlice = rnd() < slice;
    const a = inSlice ? plane + (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.25 : rnd() * TAU;
    return { q: 0.35 + 0.65 * Math.sqrt(rnd()), a, u: rnd(), lift: rnd(), inSlice };
  });
  const W = CEIL.WALL, Yf = CEIL.Y - 0.08, floorY = 0.25, ceilY = CEIL.TOP - 0.25;
  // Path in the (r, y) half-plane, with a speed factor for each leg.
  const legs = (p) => {
    const r = p.q * CEIL.R, h = p.lift;
    return [
      { a: [r, Yf], b: [r * 1.25, floorY + 0.35 + h * 0.3], k: 1 },            // the jet under the fan
      { a: [r * 1.25, floorY + 0.35 + h * 0.3], b: [W - 0.4 * h, floorY + h * 0.5], k: 0.45 },  // across the floor
      { a: [W - 0.4 * h, floorY + h * 0.5], b: [W - 0.4 * h, ceilY - h * 0.4], k: 0.22 },        // up the walls
      { a: [W - 0.4 * h, ceilY - h * 0.4], b: [r * 0.9, ceilY - h * 0.2], k: 0.28 },             // back along the ceiling
      { a: [r * 0.9, ceilY - h * 0.2], b: [r, Yf], k: 0.6 },                                  // drawn into the fan
    ];
  };
  const cache = P.map((p) => { const L = legs(p); let tot = 0; L.forEach((l) => { l.len = Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]); l.t = l.len / l.k; tot += l.t; }); return { L, tot }; });
  return {
    mesh,
    // v: air speed through the fan (scene units/s). dir: +1 down through the fan, -1 up. swirl in rad/s.
    update(dt, v, dir = 1, swirl = 0) {
      for (let i = 0; i < count; i++) {
        const p = P[i], { L, tot } = cache[i];
        p.u = (((p.u + (dir * v * dt) / tot) % 1) + 1) % 1;
        let t = p.u * tot, j = 0;
        while (j < 4 && t > L[j].t) { t -= L[j].t; j++; }
        const l = L[j], k = Math.min(1, t / l.t);
        const r = l.a[0] + (l.b[0] - l.a[0]) * k, y = l.a[1] + (l.b[1] - l.a[1]) * k;
        if (!p.inSlice) p.a += swirl * dt * (j === 0 || j === 4 ? 1 : 0.25);
        const size = v < 0.01 ? 0.001 : j === 0 ? 1.25 : 0.8;
        mesh.place(i, [Math.cos(p.a) * r, y, Math.sin(p.a) * r], null, size);
      }
      mesh.done();
    },
  };
}

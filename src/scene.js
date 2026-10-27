import * as THREE from "three";
import { destinations } from "./content.js";
const clamp = THREE.MathUtils.clamp;
const rand = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const continents = [
  [
    [-165, 65],
    [-145, 72],
    [-120, 70],
    [-100, 50],
    [-60, 50],
    [-80, 25],
    [-100, 15],
    [-118, 30],
    [-130, 55],
  ],
  [
    [-81, 10],
    [-65, 10],
    [-35, -5],
    [-50, -25],
    [-70, -55],
    [-78, -30],
  ],
  [
    [-18, 35],
    [8, 37],
    [36, 30],
    [51, 10],
    [35, -25],
    [18, -35],
    [3, -5],
    [-15, 12],
  ],
  [
    [-10, 36],
    [-10, 60],
    [20, 70],
    [65, 72],
    [110, 65],
    [175, 65],
    [145, 40],
    [120, 20],
    [105, 5],
    [75, 9],
    [55, 28],
    [30, 35],
  ],
  [
    [112, -12],
    [137, -10],
    [155, -25],
    [145, -39],
    [116, -33],
  ],
  [
    [-55, 60],
    [-25, 66],
    [-40, 82],
    [-60, 80],
  ],
];
function inside(x, y, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++)
    if (
      p[i][1] > y !== p[j][1] > y &&
      x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]
    )
      c = !c;
  return c;
}
export class SpaceScene {
  constructor(stage, events) {
    this.events = events;
    this.mode = "title";
    this.paused = false;
    this.target = null;
    this.orbitId = "earth";
    this.keys = new Set();
    this.heading = 0;
    this.pitch = 0;
    this.hull = 3;
    this.invincible = 0;
    this.collected = new Set();
    this.elapsed = 0;
    this.orbitAngle = 0.6;
    this.orbitElev = 0.28;
    this.distance = 1;
    this.lastUI = 0;
    this.frameAccumulator = 0;
    this.snapCamera = false;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    stage.appendChild(this.renderer.domElement);
    stage.dataset.engine = "Three.js " + THREE.REVISION;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#030815");
    this.camera = new THREE.PerspectiveCamera(
      50,
      innerWidth / innerHeight,
      0.1,
      7000,
    );
    this.scene.add(new THREE.HemisphereLight("#adc8ff", "#1d2136", 2));
    this.keyLight = new THREE.DirectionalLight("#fff0d5", 3.3);
    this.keyLight.position.set(-100, 120, 100);
    this.scene.add(this.keyLight);
    this.world = new Map();
    destinations.forEach((d) => this.addBody(d));
    this.addStars();
    this.addShip();
    this.addSignals();
    this.addRocks();
    this.clock = new THREE.Clock();
    this.look = new THREE.Vector3();
    this.camera.position.set(60, 26, 78);
    this.look.set(-17, 0, 0);
    this.camera.lookAt(this.look);
    this.markerEls = new Map(
      destinations.map((d, i) => {
        const b = document.createElement("button");
        b.className = "marker";
        b.hidden = true;
        b.innerHTML =
          "<b>" +
          String(i + 1).padStart(2, "0") +
          "</b><span>" +
          d.name +
          "</span>";
        b.setAttribute("aria-label", d.name + " 관측하기");
        b.dataset.marker = d.id;
        b.onclick = () => events.observe(d.id);
        document.querySelector("#markers").appendChild(b);
        return [d.id, b];
      }),
    );
    const canvas = this.renderer.domElement;
    let pointer = null;
    canvas.addEventListener("pointerdown", (e) => {
      if (this.mode === "title") return;
      pointer = {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
      };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pointer || this.paused) return;
      const dx = e.clientX - pointer.x,
        dy = e.clientY - pointer.y;
      if (this.mode === "orbit") {
        this.orbitAngle -= dx * 0.006;
        this.orbitElev = clamp(this.orbitElev + dy * 0.004, -0.7, 1.1);
      } else {
        this.target = null;
        this.heading -= dx * 0.007;
        this.pitch = clamp(this.pitch - dy * 0.003, -0.45, 0.45);
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    });
    const release = () => {
      pointer = null;
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (this.mode === "orbit") {
          e.preventDefault();
          this.distance = clamp(this.distance + e.deltaY * 0.0007, 0.7, 1.8);
        }
      },
      { passive: false },
    );
    window.addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.paused = true;
      events.contextLost();
    });
    this.loop();
  }
  addStars() {
    const pos = [],
      colors = [];
    for (let i = 0; i < 2600; i++) {
      const a = rand(i) * Math.PI * 2,
        z = rand(i + 3000) * 2 - 1,
        r = 2000 + rand(i + 5000) * 1200;
      pos.push(
        Math.cos(a) * Math.sqrt(1 - z * z) * r,
        z * r,
        Math.sin(a) * Math.sqrt(1 - z * z) * r - 600,
      );
      const c = new THREE.Color(
        i % 9 === 0 ? "#ffc984" : i % 4 === 0 ? "#98b9f4" : "#d6e4f7",
      );
      colors.push(c.r, c.g, c.b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.scene.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          vertexColors: true,
          size: 2.3,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9,
        }),
      ),
    );
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(3600, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader:
          "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 v;void main(){vec3 n=normalize(v);float band=exp(-pow((n.y-.19*sin(n.x*4.)+.1)*5.,2.));float cloud=pow(.5+.5*sin(n.x*15.+sin(n.z*10.))*sin(n.z*12.+n.y*16.),2.);vec3 col=vec3(.008,.014,.033)+vec3(.018,.025,.055)*band+vec3(.023,.012,.034)*cloud*band;gl_FragColor=vec4(col,1.);}",
      }),
    );
    this.scene.add(sky);
  }
  addBody(d) {
    const group = new THREE.Group();
    group.position.fromArray(d.pos);
    this.scene.add(group);
    this.world.set(d.id, group);
    if (d.id === "stars") {
      const globe = new THREE.Mesh(
        new THREE.IcosahedronGeometry(12, 1),
        new THREE.MeshStandardMaterial({
          color: "#8194ae",
          metalness: 0.6,
          roughness: 0.4,
          flatShading: true,
        }),
      );
      group.add(globe);
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(22 + i * 3, 0.22, 6, 90),
          new THREE.MeshBasicMaterial({
            color: i === 1 ? "#ffc56e" : "#a3c0f1",
          }),
        );
        ring.rotation.set(i * 0.7, 0.4 + i, 0);
        group.add(ring);
      }
      const light = new THREE.Mesh(
        new THREE.OctahedronGeometry(4),
        new THREE.MeshBasicMaterial({ color: "#d6e6ff" }),
      );
      light.position.y = 30;
      group.add(light);
      return;
    }
    const geo = new THREE.IcosahedronGeometry(
      d.radius,
      d.id === "earth" ? 4 : 3,
    );
    const a = geo.attributes.position,
      col = [];
    const base = new THREE.Color(d.color);
    for (let i = 0; i < a.count; i += 3) {
      const p = new THREE.Vector3().fromBufferAttribute(a, i);
      const lat = (Math.asin(p.y / d.radius) * 180) / Math.PI,
        lon = (Math.atan2(p.z, p.x) * 180) / Math.PI;
      const c = base.clone();
      if (d.id === "earth") {
        const land = continents.some((poly) => inside(lon, lat, poly));
        c.set(
          Math.abs(lat) > 71
            ? "#dfe9d9"
            : land
              ? Math.abs(lat) < 24
                ? "#5b9e7c"
                : "#72937b"
              : "#1c6997",
        );
        if (!land && Math.sin(lat * 0.26 + lon * 0.13) > 0.91) c.set("#94bdcb");
      } else if (
        ["jupiter", "saturn", "venus", "uranus", "neptune"].includes(d.id)
      ) {
        c.multiplyScalar(
          1 + Math.sin(lat * (d.id === "jupiter" ? 0.7 : 0.4)) * 0.15,
        );
        if (
          d.id === "jupiter" &&
          Math.abs(lat + 20) < 9 &&
          Math.abs(lon - 20) < 19
        )
          c.set("#ae654c");
      } else c.multiplyScalar(0.8 + rand(i) * 0.28);
      c.multiplyScalar(0.93 + rand(i + 99) * 0.14);
      for (let j = 0; j < 3; j++) col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const material =
      d.id === "sun"
        ? new THREE.MeshBasicMaterial({ vertexColors: true })
        : new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: true,
            roughness: 0.9,
          });
    group.add(new THREE.Mesh(geo, material));
    if (["earth", "venus", "neptune"].includes(d.id)) {
      const atm = new THREE.Mesh(
        new THREE.SphereGeometry(d.radius * 1.025, 48, 32),
        new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: {
            tint: {
              value: new THREE.Color(d.id === "venus" ? "#e5ba75" : "#53bffa"),
            },
          },
          vertexShader:
            "varying vec3 n;varying vec3 eye;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
          fragmentShader:
            "varying vec3 n;varying vec3 eye;uniform vec3 tint;void main(){float rim=pow(1.-abs(dot(n,eye)),3.);gl_FragColor=vec4(tint,rim*.5);}",
        }),
      );
      group.add(atm);
    }
    if (d.id === "saturn" || d.id === "uranus") {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(d.radius * 1.25, d.radius * 1.95, 120, 6),
        new THREE.MeshStandardMaterial({
          color: d.id === "saturn" ? "#c5b38e" : "#8caaaa",
          emissive: d.id === "saturn" ? "#b29a73" : "#658d91",
          emissiveIntensity: 0.65,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          opacity: d.id === "saturn" ? 0.8 : 0.4,
          roughness: 1,
        }),
      );
      ring.rotation.x = 1.0;
      ring.rotation.y = 0.2;
      group.add(ring);
    }
    if (d.id === "moon" || d.id === "mercury") {
      for (let i = 0; i < 24; i++) {
        const dir = new THREE.Vector3(
          rand(i + 10) - 0.5,
          rand(i + 80) - 0.5,
          rand(i + 150) - 0.5,
        ).normalize();
        const crater = new THREE.Mesh(
          new THREE.TorusGeometry(
            d.radius * (0.025 + rand(i + 60) * 0.08),
            d.radius * 0.012,
            4,
            12,
          ),
          new THREE.MeshStandardMaterial({ color: "#8d8a82", roughness: 1 }),
        );
        crater.position.copy(dir.multiplyScalar(d.radius * 0.997));
        crater.lookAt(crater.position.clone().multiplyScalar(2));
        group.add(crater);
      }
    }
    if (d.id === "sun") {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(d.radius * 1.15, 32, 24),
        new THREE.MeshBasicMaterial({
          color: "#ffc478",
          transparent: true,
          opacity: 0.08,
          side: THREE.BackSide,
        }),
      );
      group.add(glow);
    }
  }
  addShip() {
    this.ship = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: "#e5e1cf",
      metalness: 0.35,
      roughness: 0.6,
      flatShading: true,
    });
    const hull = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 5), mat);
    hull.rotation.x = -Math.PI / 2;
    this.ship.add(hull);
    const cabin = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 8, 6),
      new THREE.MeshStandardMaterial({
        color: "#62bdcf",
        metalness: 0.6,
        roughness: 0.15,
      }),
    );
    cabin.position.set(0, 1, -1);
    cabin.scale.set(0.8, 0.6, 1.5);
    this.ship.add(cabin);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(5, 0.35, 4), mat);
      wing.position.set(side * 2.8, -0.4, 1.3);
      wing.rotation.z = side * -0.16;
      this.ship.add(wing);
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 4, 8),
        new THREE.MeshStandardMaterial({
          color: "#5b718b",
          metalness: 0.7,
          roughness: 0.4,
        }),
      );
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 4.2, 0, 1);
      this.ship.add(pod);
    }
    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(1.3, 7, 8),
      new THREE.MeshBasicMaterial({
        color: "#8edbf6",
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.flame.rotation.x = Math.PI / 2;
    this.flame.position.z = 6;
    this.ship.add(this.flame);
    this.ship.position.set(0, 8, 80);
    this.scene.add(this.ship);
  }
  addSignals() {
    this.signalMeshes = [];
    for (let i = 0; i < 8; i++) {
      const d = destinations[i + 1];
      const g = new THREE.Group();
      g.position.set(
        d.pos[0] + (i % 2 ? 30 : -30),
        12,
        d.pos[2] + d.radius + 55,
      );
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(3),
        new THREE.MeshBasicMaterial({ color: "#84e1d6" }),
      );
      g.add(crystal);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(7, 0.15, 5, 30),
        new THREE.MeshBasicMaterial({ color: "#84e1d6" }),
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      this.scene.add(g);
      this.signalMeshes.push(g);
    }
  }
  addRocks() {
    this.rocks = [];
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: "#756e70",
      flatShading: true,
      roughness: 1,
    });
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(
        (rand(i + 110) - 0.5) * 950,
        (rand(i + 310) - 0.5) * 50,
        -390 + (rand(i + 440) - 0.5) * 65,
      );
      m.scale.setScalar(1 + rand(i + 540) * 4);
      m.rotation.set(i, i * 2, i * 0.7);
      this.scene.add(m);
      this.rocks.push(m);
    }
  }
  setSave(save) {
    this.collected = new Set(save.signals);
    this.signalMeshes.forEach(
      (m, i) => (m.visible = this.mode !== "orbit" && !this.collected.has(i)),
    );
    this.markerEls.forEach((b, id) =>
      b.classList.toggle("done", save.done.includes(id)),
    );
  }
  fly(id) {
    this.mode = "flight";
    this.world.forEach((g) => (g.visible = true));
    this.rocks.forEach((m) => (m.visible = true));
    this.signalMeshes.forEach((m, i) => (m.visible = !this.collected.has(i)));
    this.target = destinations.find((d) => d.id === id) || null;
    this.startDistance = this.target
      ? this.ship.position.distanceTo(new THREE.Vector3(...this.target.pos))
      : 1;
    this.keys.clear();
    this.ship.visible = true;
    this.events.mode("flight", this.target?.name || "자유 비행");
  }
  orbit(id) {
    this.mode = "orbit";
    this.world.forEach((g, key) => (g.visible = key === id));
    this.rocks.forEach((m) => (m.visible = false));
    this.signalMeshes.forEach((m) => (m.visible = false));
    this.orbitId = id;
    this.target = null;
    this.keys.clear();
    this.orbitAngle = 0.5;
    this.orbitElev = 0.25;
    this.distance = 1;
    this.snapCamera = true;
    this.ship.visible = false;
    this.events.mode("orbit", destinations.find((d) => d.id === id).name);
  }
  returnFlight() {
    const d = destinations.find((d) => d.id === this.orbitId);
    this.ship.position.set(d.pos[0], d.pos[1] + 9, d.pos[2] + d.radius + 45);
    this.heading = 0;
    this.pitch = 0;
    this.fly(null);
  }
  key(k, on) {
    if (on) {
      this.keys.add(k);
      if (
        [
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
          "a",
          "d",
          "w",
          "s",
        ].includes(k)
      )
        this.target = null;
    } else this.keys.delete(k);
  }
  pause(value) {
    this.paused = value;
    this.keys.clear();
  }
  setMarkers() {
    this.camera.updateMatrixWorld();
    const p = new THREE.Vector3();
    for (const d of destinations) {
      const b = this.markerEls.get(d.id);
      if (this.mode !== "flight") {
        b.hidden = true;
        continue;
      }
      p.set(...d.pos);
      p.y += d.radius + 9;
      const distance = p.distanceTo(this.camera.position);
      p.project(this.camera);
      b.hidden =
        p.z < 0 ||
        p.z > 1 ||
        Math.abs(p.x) > 0.94 ||
        Math.abs(p.y) > 0.82 ||
        distance > 850;
      if (!b.hidden) {
        b.style.left = (p.x * 0.5 + 0.5) * innerWidth + "px";
        b.style.top = (-p.y * 0.5 + 0.5) * innerHeight + "px";
      }
    }
  }
  loop() {
    requestAnimationFrame(() => this.loop());
    this.frameAccumulator += this.clock.getDelta();
    if (this.frameAccumulator < 1 / 40) return;
    const dt = Math.min(this.frameAccumulator, 0.06);
    this.frameAccumulator = 0;
    if (this.paused) return;
    this.elapsed += dt;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.setMarkers();
    if (this.mode === "orbit")
      document.querySelector("#stage").dataset.focused = this.orbitId;
  }
  update(dt) {
    const t = this.elapsed;
    for (const [d, g] of this.world)
      if (d !== "stars") g.rotation.y += this.reduced ? 0 : dt * 0.015;
    this.signalMeshes.forEach((g) => (g.rotation.y += dt * 0.7));
    const desired = new THREE.Vector3(),
      look = new THREE.Vector3();
    if (this.mode === "title") {
      const a = this.reduced ? 0.55 : 0.55 + Math.sin(t * 0.04) * 0.08;
      desired.set(Math.sin(a) * 102, 28, Math.cos(a) * 92);
      look.set(innerWidth < 700 ? -4 : -18, 0, 0);
      this.ship.position.set(18, 1, 40);
      this.ship.rotation.set(0.08, -0.7, -0.15);
      this.flame.scale.y = 0.3;
    } else if (this.mode === "orbit") {
      const d = destinations.find((d) => d.id === this.orbitId),
        center = new THREE.Vector3(...d.pos),
        dist =
          (d.radius *
            (innerWidth <= 700 && document.body.classList.contains("sheet-open")
              ? 9
              : 4.4) +
            23) *
          this.distance;
      desired
        .set(
          Math.sin(this.orbitAngle) * dist,
          Math.sin(this.orbitElev) * dist,
          Math.cos(this.orbitAngle) * dist,
        )
        .add(center);
      look.copy(center);
      if (innerWidth > 700 && document.body.classList.contains("sheet-open")) {
        const right = new THREE.Vector3(
          Math.cos(this.orbitAngle),
          0,
          -Math.sin(this.orbitAngle),
        );
        look.addScaledVector(right, dist * 0.15);
      } else if (
        innerWidth <= 700 &&
        document.body.classList.contains("sheet-open")
      )
        look.y -= dist * 0.25;
    } else {
      const boosting = this.keys.has(" ") || this.keys.has("shift");
      let speed = boosting ? 100 : 38;
      this.invincible = Math.max(0, this.invincible - dt);
      const direction = new THREE.Vector3(
        -Math.sin(this.heading),
        Math.sin(this.pitch),
        -Math.cos(this.heading),
      ).normalize();
      let nearest = null;
      if (this.target) {
        const to = new THREE.Vector3(...this.target.pos).sub(
          this.ship.position,
        );
        const dist = to.length(),
          stop = this.target.radius + 37;
        if (dist > stop + 1) {
          direction.copy(to.normalize());
          speed = Math.min(
            boosting ? 150 : 90,
            Math.max(9, (dist - stop) * 1.6),
          );
          this.heading = Math.atan2(-direction.x, -direction.z);
          this.pitch = Math.asin(direction.y);
          this.ship.position.addScaledVector(direction, speed * dt);
        } else {
          speed = 0;
          nearest = this.target;
        }
      } else {
        this.heading +=
          ((this.keys.has("arrowleft") || this.keys.has("a")) -
            (this.keys.has("arrowright") || this.keys.has("d"))) *
          dt *
          1.25;
        this.pitch = clamp(
          this.pitch +
            ((this.keys.has("arrowup") || this.keys.has("w")) -
              (this.keys.has("arrowdown") || this.keys.has("s"))) *
              dt *
              0.65,
          -0.5,
          0.5,
        );
        direction
          .set(
            -Math.sin(this.heading),
            Math.sin(this.pitch),
            -Math.cos(this.heading),
          )
          .normalize();
        this.ship.position.addScaledVector(direction, speed * dt);
      }
      this.ship.position.x = clamp(this.ship.position.x, -720, 720);
      this.ship.position.y = clamp(this.ship.position.y, -150, 230);
      this.ship.position.z = clamp(this.ship.position.z, -1850, 250);
      this.ship.rotation.set(
        this.pitch,
        this.heading,
        -(
          (this.keys.has("arrowright") || this.keys.has("d")) -
          (this.keys.has("arrowleft") || this.keys.has("a"))
        ) * 0.25,
        "YXZ",
      );
      this.flame.scale.y =
        (boosting ? 1.6 : 0.7) + (this.reduced ? 0 : Math.sin(t * 30) * 0.12);
      if (!nearest)
        nearest = destinations.find(
          (d) =>
            this.ship.position.distanceTo(new THREE.Vector3(...d.pos)) <
            d.radius + 47,
        );
      for (const d of destinations) {
        const c = new THREE.Vector3(...d.pos),
          diff = this.ship.position.clone().sub(c),
          min = d.radius + 8;
        if (diff.length() < min)
          this.ship.position.copy(c.add(diff.normalize().multiplyScalar(min)));
      }
      if (
        !this.target &&
        !this.invincible &&
        this.rocks.some(
          (m) => m.position.distanceTo(this.ship.position) < m.scale.x + 3,
        )
      ) {
        this.hull--;
        this.invincible = 3;
        this.events.collision(this.hull);
        if (this.hull === 0) {
          this.hull = 3;
          this.ship.position.set(0, 8, 80);
          this.heading = 0;
          this.pitch = 0;
        }
      }
      this.signalMeshes.forEach((m, i) => {
        if (
          !this.collected.has(i) &&
          m.position.distanceTo(this.ship.position) < 14
        ) {
          this.collected.add(i);
          m.visible = false;
          this.events.signal(i);
        }
      });
      desired
        .copy(this.ship.position)
        .add(
          new THREE.Vector3(
            Math.sin(this.heading) * 43,
            17,
            Math.cos(this.heading) * 43,
          ),
        );
      look.copy(this.ship.position).addScaledVector(direction, 32);
      look.y += 5;
      if (t - this.lastUI > 0.1) {
        const progress = this.target
          ? 1 -
            Math.max(
              0,
              this.ship.position.distanceTo(
                new THREE.Vector3(...this.target.pos),
              ) -
                this.target.radius -
                37,
            ) /
              Math.max(this.startDistance, 1)
          : 0;
        this.events.flight({
          speed: Math.round(speed),
          hull: this.hull,
          near: nearest?.id || null,
          target: this.target?.name || null,
          progress,
        });
        this.lastUI = t;
      }
    }
    const blend = this.reduced || this.snapCamera ? 1 : 1 - Math.exp(-dt * 3);
    this.camera.position.lerp(desired, blend);
    this.look.lerp(look, blend);
    this.camera.lookAt(this.look);
    this.snapCamera = false;
  }
}

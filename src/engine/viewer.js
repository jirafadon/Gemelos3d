/**
 * Visor 3D con three.js. Eje Z hacia arriba, como en los laminadores.
 * Dibuja solo cuando algo cambia, para no gastar batería.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { solidToTriangles } from './export.js';

export class Viewer {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.addEventListener('change', () => this.render());

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-60, -100, 160);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(120, 80, 60);
    this.scene.add(rim);

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.grid = null;
    this.lastSize = 0;

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || 300, h = this.container.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  setParts(parts) {
    for (const m of this.group.children) { m.geometry.dispose(); m.material.dispose(); }
    this.group.clear();
    const box = new THREE.Box3();
    for (const p of parts) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(solidToTriangles(p.solid), 3));
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: p.color || '#cccccc', roughness: 0.55, metalness: 0.02, flatShading: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.name = p.name;
      this.group.add(mesh);
      geo.computeBoundingBox();
      box.union(geo.boundingBox);
    }
    if (box.isEmpty()) { this.render(); return; }
    // Apoya el modelo en el piso y lo centra
    const c = box.getCenter(new THREE.Vector3());
    this.group.position.set(-c.x, -c.y, -box.min.z);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z);
    this.updateGrid(Math.max(size.x, size.y));
    if (!this.lastSize || span > this.lastSize * 1.6 || span < this.lastSize / 1.6) this.fit(span, size.z);
    this.lastSize = span;
    this.render();
  }

  updateGrid(extent) {
    if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); this.grid.material.dispose(); }
    const step = extent > 150 ? 20 : extent > 60 ? 10 : 5;
    const size = Math.ceil((extent * 1.5) / step) * step;
    this.grid = new THREE.GridHelper(size, size / step, 0x9fb3c8, 0xd5dde6);
    this.grid.rotation.x = Math.PI / 2;
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.6;
    this.scene.add(this.grid);
  }

  fit(span, height = 0) {
    const d = span * 1.9 + 20;
    this.view = this.view || 'iso';
    this.distance = d;
    this.controls.target.set(0, 0, height / 2);
    this.setView(this.view);
  }

  setView(name) {
    this.view = name;
    const d = this.distance || 120, t = this.controls.target;
    const pos = {
      iso: [-0.55 * d, -0.75 * d, 0.55 * d],
      top: [0, -0.0001, d],
      front: [0, -d, t.z],
      side: [d, 0, t.z],
    }[name] || [-0.55 * d, -0.75 * d, 0.55 * d];
    this.camera.position.set(t.x + pos[0], t.y + pos[1], name === 'front' || name === 'side' ? pos[2] : t.z + pos[2]);
    this.camera.lookAt(t);
    this.controls.update();
    this.render();
  }

  // ---------- Modo editor (Taller 3D) ----------

  /** Muestra objetos en su posición real (sin recentrar), con huecos translúcidos y selección. */
  setObjects(objs, selectedId) {
    for (const m of this.group.children) { m.geometry.dispose(); m.material.dispose(); }
    this.group.clear();
    this.group.position.set(0, 0, 0);
    for (const o of objs) {
      if (!o.solid) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(solidToTriangles(o.solid), 3));
      geo.computeVertexNormals();
      const selected = o.id === selectedId;
      const mat = o.hole
        ? new THREE.MeshStandardMaterial({ color: '#8d99ae', transparent: true, opacity: selected ? 0.55 : 0.35, depthWrite: false, roughness: 0.8 })
        : new THREE.MeshStandardMaterial({ color: o.color || '#cccccc', roughness: 0.55, metalness: 0.02 });
      if (selected) { mat.emissive = new THREE.Color('#4f9ff0'); mat.emissiveIntensity = 0.35; }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.id = o.id;
      this.group.add(mesh);
    }
    if (!this.editorGrid) { this.updateGrid(180); this.editorGrid = true; this.distance = 170; this.controls.target.set(0, 0, 10); this.setView('iso'); }
    this.render();
  }

  /** Normaliza un evento de puntero a coordenadas de la cámara. */
  ndc(ev) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  }

  /** Id del objeto bajo el puntero (o null). */
  pick(ev) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(this.ndc(ev), this.camera);
    const hit = ray.intersectObjects(this.group.children, false)[0];
    return hit ? hit.object.userData.id : null;
  }

  /** Punto del plano horizontal z = h bajo el puntero. */
  groundPoint(ev, h = 0) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(this.ndc(ev), this.camera);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -h), p) ? p : null;
  }

  render() { this.renderer.render(this.scene, this.camera); }

  /** Captura cuadrada del visor para usar de miniatura. */
  snapshot(size = 192) {
    this.render();
    const src = this.renderer.domElement;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const s = Math.min(src.width, src.height);
    c.getContext('2d').drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL('image/png');
  }
}

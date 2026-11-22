import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

type CameraPresetId = 'exterior' | 'courtyard' | 'skydeck' | 'aerial';
type LightingPresetId = 'golden' | 'noon' | 'twilight';
type FinishPresetId = 'travertine' | 'basalt' | 'teak';

interface ArchitecturalScene3DProps {
  title?: string;
  subtitle?: string;
  heightClass?: string;
  fullViewport?: boolean;
}

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  exterior: { label: 'Exterior', pos: [17, 9.5, 19], target: [0, 3.2, 0] },
  courtyard: { label: 'Pool Courtyard', pos: [10.5, 4.2, 13.5], target: [1.5, 2.2, 1.5] },
  skydeck: { label: 'Sky Terrace', pos: [-13, 8.8, 12], target: [0.5, 4.8, -0.5] },
  aerial: { label: 'Aerial Plan', pos: [0.5, 25, 16], target: [0, 1.5, 0] },
};

const LIGHTING_PRESETS: Record<
  LightingPresetId,
  {
    label: string;
    sky: number;
    fogDensity: number;
    sunColor: number;
    sunIntensity: number;
    sunPos: [number, number, number];
    hemiSky: number;
    hemiGround: number;
    hemiIntensity: number;
    interiorGlow: number;
    exposure: number;
  }
> = {
  golden: {
    label: 'Golden Hour',
    sky: 0x261d17,
    fogDensity: 0.011,
    sunColor: 0xffd6a5,
    sunIntensity: 2.6,
    sunPos: [18, 12, 14],
    hemiSky: 0xdbe6f6,
    hemiGround: 0x5c4632,
    hemiIntensity: 0.9,
    interiorGlow: 1.35,
    exposure: 1.12,
  },
  noon: {
    label: 'Crisp Daylight',
    sky: 0xe9e2d6,
    fogDensity: 0.0085,
    sunColor: 0xfff7ea,
    sunIntensity: 2.4,
    sunPos: [12, 24, 10],
    hemiSky: 0xdceeff,
    hemiGround: 0x8b7e6d,
    hemiIntensity: 1.05,
    interiorGlow: 0.35,
    exposure: 1.06,
  },
  twilight: {
    label: 'Mumbai Twilight',
    sky: 0x131012,
    fogDensity: 0.013,
    sunColor: 0x9ab3e8,
    sunIntensity: 1.05,
    sunPos: [-16, 14, -12],
    hemiSky: 0x5b709c,
    hemiGround: 0x251b16,
    hemiIntensity: 0.72,
    interiorGlow: 2.4,
    exposure: 1.18,
  },
};

const FINISH_PALETTES: Record<
  FinishPresetId,
  { label: string; stone: number; trim: number; wood: number }
> = {
  travertine: { label: 'Warm Travertine', stone: 0xded2be, trim: 0x8b6c42, wood: 0x7c5334 },
  basalt: { label: 'Charcoal Basalt', stone: 0x45413d, trim: 0xc9a96e, wood: 0x6b472b },
  teak: { label: 'Coastal Sandstone', stone: 0xd5bea0, trim: 0x3b312a, wood: 0x8e5d38 },
};

function createProceduralStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d8d0c4';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const band = Math.sin(y * 0.14) * 10 + (Math.random() - 0.5) * 8;
      const v = Math.max(175, Math.min(235, Math.round(212 + band)));
      ctx.fillStyle = `rgb(${v}, ${v - 4}, ${v - 11})`;
      ctx.fillRect(0, y, 256, 2);
    }
    ctx.strokeStyle = 'rgba(40, 32, 24, 0.14)';
    ctx.lineWidth = 1;
    for (let y = 32; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createProceduralWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 180; i++) {
      const y = (i * 256) / 180;
      const shade = Math.round(110 + Math.sin(i * 0.4) * 18 + (Math.random() - 0.5) * 14);
      ctx.fillStyle = `rgb(${shade + 25}, ${shade - 8}, ${shade - 36})`;
      ctx.fillRect(0, y, 256, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
    grad.addColorStop(0, 'rgba(15, 10, 7, 0.52)');
    grad.addColorStop(0.55, 'rgba(15, 10, 7, 0.22)');
    grad.addColorStop(1, 'rgba(15, 10, 7, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _dummy = new THREE.Object3D();

export function ArchitecturalScene3D({
  title = 'Pali Hill Cantilevered Pavilion',
  subtitle = 'Interactive 3D Architectural Walkthrough · Drag to orbit, scroll to zoom',
  heightClass = 'h-[520px]',
  fullViewport = false,
}: ArchitecturalScene3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('exterior');
  const [lightingPreset, setLightingPreset] = useState<LightingPresetId>('golden');
  const [finishPreset, setFinishPreset] = useState<FinishPresetId>('travertine');
  const [cutaway, setCutaway] = useState(0);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Refs synced to imperative Three.js scene without ever recreating WebGLRenderer
  const controllerRef = useRef<{
    setCamera: (preset: CameraPresetId) => void;
    setLighting: (preset: LightingPresetId) => void;
    setFinish: (preset: FinishPresetId) => void;
    setCutaway: (ratio: number) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param) || '');
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    const initialLight = LIGHTING_PRESETS.golden;
    scene.background = new THREE.Color(initialLight.sky);
    scene.fog = new THREE.FogExp2(initialLight.sky, initialLight.fogDensity);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 220);
    camera.position.set(...CAMERA_PRESETS.exterior.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = initialLight.exposure;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Mandatory studio environment map for metallic & glass PBR response
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 8;
    controls.maxDistance = 42;
    controls.target.set(...CAMERA_PRESETS.exterior.target);
    controls.update();

    // Lighting rig: warm key + cool hemisphere fill + warm rim
    const sunLight = new THREE.DirectionalLight(initialLight.sunColor, initialLight.sunIntensity);
    sunLight.position.set(...initialLight.sunPos);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -18;
    sunLight.shadow.camera.right = 18;
    sunLight.shadow.camera.top = 18;
    sunLight.shadow.camera.bottom = -18;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(
      initialLight.hemiSky,
      initialLight.hemiGround,
      initialLight.hemiIntensity
    );
    scene.add(hemiLight);

    // Procedural PBR textures & shared materials
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const stoneTex = createProceduralStoneTexture();
    stoneTex.anisotropy = maxAniso;
    const woodTex = createProceduralWoodTexture();
    woodTex.anisotropy = maxAniso;
    const shadowTex = createContactShadowTexture();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3b332b,
      roughness: 0.94,
      metalness: 0.02,
    });
    const plinthStoneMat = new THREE.MeshStandardMaterial({
      color: FINISH_PALETTES.travertine.stone,
      map: stoneTex,
      roughness: 0.78,
      metalness: 0.04,
    });
    const upperStoneMat = new THREE.MeshStandardMaterial({
      color: FINISH_PALETTES.travertine.stone,
      map: stoneTex,
      roughness: 0.72,
      metalness: 0.05,
    });
    const bronzeTrimMat = new THREE.MeshStandardMaterial({
      color: FINISH_PALETTES.travertine.trim,
      roughness: 0.28,
      metalness: 0.85,
    });
    const teakWoodMat = new THREE.MeshStandardMaterial({
      color: FINISH_PALETTES.travertine.wood,
      map: woodTex,
      roughness: 0.62,
      metalness: 0.05,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x26323a,
      roughness: 0.14,
      metalness: 0.45,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const interiorGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffddb0,
      emissive: 0xffa94d,
      emissiveIntensity: initialLight.interiorGlow,
      roughness: 0.85,
      metalness: 0,
    });
    const poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x166d73,
      roughness: 0.12,
      metalness: 0.3,
    });

    // Extended natural landscape terrain (never boxed into a floating room)
    const terrainGeo = new THREE.CircleGeometry(72, 48);
    const terrain = new THREE.Mesh(terrainGeo, groundMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Radial contact shadow beneath residence plinth
    const contactShadowGeo = new THREE.CircleGeometry(15.5, 36);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    scene.add(contactShadow);

    // Composite 12-part Architectural Residence Group (bottom-center grounded)
    const villaGroup = new THREE.Group();
    scene.add(villaGroup);

    // Part 1: Stepped Architectural Plinth & Courtyard Deck
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(19, 0.7, 15), plinthStoneMat);
    plinth.position.set(0, 0.35, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    villaGroup.add(plinth);

    // Part 2: Infinity Reflection Pool Basin + Water Surface
    const poolFrame = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.55, 5.2), bronzeTrimMat);
    poolFrame.position.set(3.6, 0.5, 4.1);
    poolFrame.receiveShadow = true;
    villaGroup.add(poolFrame);

    const poolWater = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.42, 4.7), poolWaterMat);
    poolWater.position.set(3.6, 0.62, 4.1);
    villaGroup.add(poolWater);

    // Part 3: Ground Level Limestone Structural Core
    const groundCore = new THREE.Mesh(new THREE.BoxGeometry(11.4, 3.6, 7.6), plinthStoneMat);
    groundCore.position.set(-2.4, 2.5, -1.8);
    groundCore.castShadow = true;
    groundCore.receiveShadow = true;
    villaGroup.add(groundCore);

    // Part 4: Ground Level Illuminated Living Salon Interior + Bronze Mullion Glazing
    const groundGlow = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.1, 0.35), interiorGlowMat);
    groundGlow.position.set(-1.8, 2.45, 2.02);
    villaGroup.add(groundGlow);

    const groundGlass = new THREE.Mesh(new THREE.BoxGeometry(7.9, 3.25, 0.12), glassMat);
    groundGlass.position.set(-1.8, 2.45, 2.25);
    groundGlass.renderOrder = 2;
    villaGroup.add(groundGlass);

    const mullionGeo = new THREE.BoxGeometry(0.1, 3.28, 0.16);
    for (let mx = -5.6; mx <= 2.1; mx += 1.9) {
      const m = new THREE.Mesh(mullionGeo, bronzeTrimMat);
      m.position.set(mx, 2.45, 2.26);
      villaGroup.add(m);
    }

    // Part 5: Brushed Bronze Structural Columns
    const colGeo = new THREE.CylinderGeometry(0.16, 0.16, 3.6, 16);
    const colPositions: Array<[number, number]> = [
      [5.6, 1.4],
      [5.6, -4.4],
      [-7.2, 2.2],
      [1.8, 2.2],
    ];
    for (const [cx, cz] of colPositions) {
      const col = new THREE.Mesh(colGeo, bronzeTrimMat);
      col.position.set(cx, 2.5, cz);
      col.castShadow = true;
      villaGroup.add(col);
    }

    // Part 6: Ground Timber Sun-Deck & Loungers
    const sunDeck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.16, 4.8), teakWoodMat);
    sunDeck.position.set(-4.6, 0.78, 4.2);
    sunDeck.receiveShadow = true;
    villaGroup.add(sunDeck);

    // Upper Floor Group (moves vertically during cutaway explosion!)
    const upperLevelGroup = new THREE.Group();
    villaGroup.add(upperLevelGroup);

    // Part 7: Cantilevered Mid Floor Slab
    const midSlab = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.42, 10.6), upperStoneMat);
    midSlab.position.set(0.6, 4.45, -0.6);
    midSlab.castShadow = true;
    midSlab.receiveShadow = true;
    upperLevelGroup.add(midSlab);

    // Part 8: Upper Master Penthouse Volume
    const upperCore = new THREE.Mesh(new THREE.BoxGeometry(12.2, 3.4, 7.2), upperStoneMat);
    upperCore.position.set(1.2, 6.35, -1.6);
    upperCore.castShadow = true;
    upperCore.receiveShadow = true;
    upperLevelGroup.add(upperCore);

    // Part 9: Upper Panoramic Salon Glow + Bronze Mullion Glazing
    const upperGlow = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.95, 0.35), interiorGlowMat);
    upperGlow.position.set(1.2, 6.3, 2.04);
    upperLevelGroup.add(upperGlow);

    const upperGlass = new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.1, 0.12), glassMat);
    upperGlass.position.set(1.2, 6.3, 2.26);
    upperGlass.renderOrder = 3;
    upperLevelGroup.add(upperGlass);

    const upperMullionGeo = new THREE.BoxGeometry(0.1, 3.12, 0.16);
    for (let mx = -3.5; mx <= 5.9; mx += 1.88) {
      const m = new THREE.Mesh(upperMullionGeo, bronzeTrimMat);
      m.position.set(mx, 6.3, 2.27);
      upperLevelGroup.add(m);
    }

    // Part 10: Glass Sky-Deck Balustrades with Bronze Handrail
    const balustrade = new THREE.Mesh(new THREE.BoxGeometry(15.8, 1.05, 0.08), glassMat);
    balustrade.position.set(0.6, 5.18, 4.55);
    balustrade.renderOrder = 4;
    upperLevelGroup.add(balustrade);

    const handrail = new THREE.Mesh(new THREE.BoxGeometry(15.9, 0.08, 0.14), bronzeTrimMat);
    handrail.position.set(0.6, 5.72, 4.55);
    upperLevelGroup.add(handrail);

    // Roof Pavilion Group (moves even higher during cutaway!)
    const roofGroup = new THREE.Group();
    villaGroup.add(roofGroup);

    // Part 11: Deep Cantilevered Architectural Roof Fascia + Warm Timber Soffit
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.45, 11.4), bronzeTrimMat);
    roofSlab.position.set(0.4, 8.28, -0.6);
    roofSlab.castShadow = true;
    roofSlab.receiveShadow = true;
    roofGroup.add(roofSlab);

    const roofSoffit = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.14, 10.8), teakWoodMat);
    roofSoffit.position.set(0.4, 8.0, -0.6);
    roofGroup.add(roofSoffit);

    // Part 12: Instanced Timber Louver Pergola Slats & Sculptural Courtyard Trees
    const louverGeo = new THREE.BoxGeometry(0.18, 0.24, 4.2);
    const louverCount = 24;
    const louvers = new THREE.InstancedMesh(louverGeo, teakWoodMat, louverCount);
    for (let i = 0; i < louverCount; i++) {
      _dummy.position.set(-7.6 + i * 0.66, 8.15, 2.6);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      louvers.setMatrixAt(i, _dummy.matrix);
    }
    louvers.instanceMatrix.needsUpdate = true;
    louvers.computeBoundingSphere();
    roofGroup.add(louvers);

    // Courtyard architectural bollard lights along pool & plinth edge
    const bollardGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.72, 8);
    const bollardPositions: Array<[number, number]> = [
      [-8.6, 6.6],
      [-4.2, 6.6],
      [0.2, 6.6],
      [8.6, 6.6],
      [8.6, 1.8],
      [8.6, -3.2],
    ];
    for (const [bx, bz] of bollardPositions) {
      const base = new THREE.Mesh(bollardGeo, bronzeTrimMat);
      base.position.set(bx, 1.06, bz);
      villaGroup.add(base);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), interiorGlowMat);
      lamp.position.set(bx, 1.46, bz);
      villaGroup.add(lamp);
    }

    // Instanced Architectural Cypress & Canopy Groves (kept clear of front-right exterior sightline)
    const treePlacements: Array<{ x: number; z: number; s: number; idx: number }> = [];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2 + (i % 3) * 0.11;
      // Leave an unobstructed viewing corridor toward the exterior camera (angle ~0.15 to 1.45 rad)
      if (angle > 0.12 && angle < 1.55) continue;
      const radius = 16.5 + (i % 4) * 3.6;
      treePlacements.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        s: 0.9 + (i % 5) * 0.14,
        idx: i,
      });
    }

    const treeCount = treePlacements.length;
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 2.6, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b382a, roughness: 0.92 });
    const canopyLowerGeo = new THREE.ConeGeometry(1.45, 2.8, 7);
    const canopyUpperGeo = new THREE.ConeGeometry(1.05, 2.2, 7);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x3b4e32, roughness: 0.86 });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const canopiesLower = new THREE.InstancedMesh(canopyLowerGeo, canopyMat, treeCount);
    const canopiesUpper = new THREE.InstancedMesh(canopyUpperGeo, canopyMat, treeCount);
    const tint = new THREE.Color();

    treePlacements.forEach((tp, i) => {
      _dummy.position.set(tp.x, 1.3 * tp.s, tp.z);
      _dummy.scale.set(tp.s, tp.s, tp.s);
      _dummy.rotation.set(0, tp.idx * 0.7, 0);
      _dummy.updateMatrix();
      trunks.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(tp.x, 2.85 * tp.s, tp.z);
      _dummy.scale.set(tp.s, tp.s, tp.s);
      _dummy.updateMatrix();
      canopiesLower.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(tp.x, 4.15 * tp.s, tp.z);
      _dummy.scale.set(tp.s * 0.92, tp.s * 0.95, tp.s * 0.92);
      _dummy.updateMatrix();
      canopiesUpper.setMatrixAt(i, _dummy.matrix);

      tint.setHSL(0.27 + ((tp.idx % 4) - 1.5) * 0.015, 0.26, 0.22 + (tp.idx % 3) * 0.035);
      canopiesLower.setColorAt(i, tint);
      canopiesUpper.setColorAt(i, tint);
    });
    trunks.instanceMatrix.needsUpdate = true;
    canopiesLower.instanceMatrix.needsUpdate = true;
    canopiesUpper.instanceMatrix.needsUpdate = true;
    if (canopiesLower.instanceColor) canopiesLower.instanceColor.needsUpdate = true;
    if (canopiesUpper.instanceColor) canopiesUpper.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    canopiesLower.computeBoundingSphere();
    canopiesUpper.computeBoundingSphere();
    scene.add(trunks);
    scene.add(canopiesLower);
    scene.add(canopiesUpper);

    // Transition state
    let transitionActive = false;
    let cutawayTarget = 0;
    let cutawayCurrent = 0;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 65);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    let lastTime = performance.now();

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000));
        lastTime = now;
        renderDirty = false;

        let needsMoreFrames = false;

        if (transitionActive) {
          const factor = isSoftwareGl ? 1 : 1 - Math.exp(-7 * dt);
          camera.position.lerp(_targetCamPos, factor);
          controls.target.lerp(_targetLook, factor);
          if (
            camera.position.distanceTo(_targetCamPos) < 0.04 &&
            controls.target.distanceTo(_targetLook) < 0.04
          ) {
            camera.position.copy(_targetCamPos);
            controls.target.copy(_targetLook);
            transitionActive = false;
          } else {
            needsMoreFrames = true;
          }
        }

        if (Math.abs(cutawayCurrent - cutawayTarget) > 0.003) {
          const factor = isSoftwareGl ? 1 : 1 - Math.exp(-9 * dt);
          cutawayCurrent = THREE.MathUtils.lerp(cutawayCurrent, cutawayTarget, factor);
          upperLevelGroup.position.y = cutawayCurrent * 2.4;
          roofGroup.position.y = cutawayCurrent * 5.2;
          needsMoreFrames = true;
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || needsMoreFrames)) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    controls.addEventListener('start', () => {
      transitionActive = false;
    });
    controls.addEventListener('change', requestRender);

    controllerRef.current = {
      setCamera: (preset) => {
        const cfg = CAMERA_PRESETS[preset];
        _targetCamPos.set(...cfg.pos);
        _targetLook.set(...cfg.target);
        transitionActive = true;
        requestRender();
      },
      setLighting: (preset) => {
        const cfg = LIGHTING_PRESETS[preset];
        scene.background = new THREE.Color(cfg.sky);
        scene.fog = new THREE.FogExp2(cfg.sky, cfg.fogDensity);
        sunLight.color.setHex(cfg.sunColor);
        sunLight.intensity = cfg.sunIntensity;
        sunLight.position.set(...cfg.sunPos);
        hemiLight.color.setHex(cfg.hemiSky);
        hemiLight.groundColor.setHex(cfg.hemiGround);
        hemiLight.intensity = cfg.hemiIntensity;
        interiorGlowMat.emissiveIntensity = cfg.interiorGlow;
        renderer.toneMappingExposure = cfg.exposure;
        requestRender();
      },
      setFinish: (preset) => {
        const pal = FINISH_PALETTES[preset];
        plinthStoneMat.color.setHex(pal.stone);
        upperStoneMat.color.setHex(pal.stone);
        bronzeTrimMat.color.setHex(pal.trim);
        teakWoodMat.color.setHex(pal.wood);
        requestRender();
      },
      setCutaway: (ratio) => {
        cutawayTarget = ratio;
        requestRender();
      },
    };

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      envRT.dispose();
      stoneTex.dispose();
      woodTex.dispose();
      shadowTex.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleCameraChange = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    controllerRef.current?.setCamera(preset);
  };

  const handleLightingChange = (preset: LightingPresetId) => {
    setLightingPreset(preset);
    controllerRef.current?.setLighting(preset);
  };

  const handleFinishChange = (preset: FinishPresetId) => {
    setFinishPreset(preset);
    controllerRef.current?.setFinish(preset);
  };

  const handleCutawayChange = (val: number) => {
    setCutaway(val);
    controllerRef.current?.setCutaway(val / 100);
  };

  const handleReset = () => {
    handleCameraChange('exterior');
    handleLightingChange('golden');
    handleFinishChange('travertine');
    handleCutawayChange(0);
  };

  return (
    <div
      data-testid="architectural-3d-viewport"
      className={`relative w-full overflow-hidden bg-[#17120F] ${
        fullViewport ? 'h-[calc(100vh-68px)] min-h-[560px]' : `${heightClass} rounded-[28px]`
      }`}
    >
      {/* Dedicated isolated WebGL canvas container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Left Title Overlay (solid rgba, zero backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-4 left-4 sm:top-6 sm:left-6 max-w-sm rounded-2xl bg-[#17120F]/85 border border-[#FAF7F2]/12 px-4 py-3 text-[#FAF7F2]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C9A96E]">
          3D Architectural Studio
        </p>
        <h2 className="text-sm sm:text-base font-bold tracking-tight mt-0.5">{title}</h2>
        <p className="text-xs text-[#FAF7F2]/70 mt-0.5">{subtitle}</p>
      </div>

      {/* Unified Collapsible Bottom Control Dock (zero backdrop-filter, <= 15% footprint) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-[920px] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="mb-1.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#17120F]/92 border border-[#FAF7F2]/15 text-[#FAF7F2] text-xs font-semibold hover:bg-[#261E19] transition-colors"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#C9A96E]" />
              Show Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-[#C9A96E]" />
              Hide Controls
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full rounded-[22px] bg-[#17120F]/94 border border-[#FAF7F2]/14 px-4 py-3 text-[#FAF7F2] flex flex-wrap items-center justify-between gap-3">
            {/* Camera Views */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#FAF7F2]/50 mr-1">
                View
              </span>
              {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCameraChange(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    cameraPreset === key
                      ? 'bg-[#C9A96E] text-[#17120F]'
                      : 'bg-[#261E19] text-[#FAF7F2]/80 hover:text-white'
                  }`}
                >
                  {CAMERA_PRESETS[key].label}
                </button>
              ))}
            </div>

            {/* Lighting */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#FAF7F2]/50 mr-1">
                Light
              </span>
              {(Object.keys(LIGHTING_PRESETS) as LightingPresetId[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleLightingChange(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    lightingPreset === key
                      ? 'bg-[#FAF7F2] text-[#17120F]'
                      : 'bg-[#261E19] text-[#FAF7F2]/80 hover:text-white'
                  }`}
                >
                  {LIGHTING_PRESETS[key].label}
                </button>
              ))}
            </div>

            {/* Finish & Exploded Floorplan Cutaway */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#FAF7F2]/50">
                  Stone
                </span>
                {(Object.keys(FINISH_PALETTES) as FinishPresetId[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFinishChange(key)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                      finishPreset === key
                        ? 'bg-[#C9A96E] text-[#17120F]'
                        : 'bg-[#261E19] text-[#FAF7F2]/80 hover:text-white'
                    }`}
                  >
                    {FINISH_PALETTES[key].label.split(' ')[1]}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-[#FAF7F2]/80">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#FAF7F2]/50 whitespace-nowrap">
                  Cutaway
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={cutaway}
                  onChange={(e) => handleCutawayChange(Number(e.target.value))}
                  aria-label="Floorplan cutaway separation"
                  className="w-20 accent-[#C9A96E]"
                />
                <span className="font-mono-code text-[11px] w-7 text-right">{cutaway}%</span>
              </label>

              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset 3D view"
                className="w-8 h-8 rounded-full bg-[#261E19] text-[#FAF7F2]/80 hover:text-white flex items-center justify-center transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import type { Atom, Bond, Vec3 } from './MoleculeData';
import { vec3Sub, vec3Normalize, vec3Cross, vec3Add, vec3Scale, vec3Length } from './MoleculeData';
import type { CameraState } from './InteractionController';
import type { ForcePair, TrajectoryPoint } from './PhysicsEngine';
import {
  mat4Perspective,
  mat4LookAt,
  mat4Multiply,
  createSphereGeometry,
  createCylinderGeometry,
  type SphereGeometry,
  type CylinderGeometry,
} from './mathUtils';

const ATOM_VERTEX_SHADER = `
struct Uniforms {
  viewProj: mat4x4<f32>,
  viewPos: vec3<f32>,
  padding: f32,
};

struct Instance {
  position: vec3<f32>,
  radius: f32,
  color: vec3<f32>,
  glowIntensity: f32,
  specularStrength: f32,
  atomicNumber: f32,
  padding1: f32,
  padding2: f32,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) viewDir: vec3<f32>,
  @location(4) glowIntensity: f32,
  @location(5) specularStrength: f32,
  @location(6) atomicNumber: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;

@vertex
fn vs_main(@location(0) position: vec3<f32>, @location(1) normal: vec3<f32>, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  var instance = instances[instanceIndex];
  var worldPos = position * instance.radius + instance.position;
  
  var output: VertexOutput;
  output.position = uniforms.viewProj * vec4<f32>(worldPos, 1.0);
  output.normal = normalize(normal);
  output.worldPos = worldPos;
  output.color = instance.color;
  output.viewDir = normalize(uniforms.viewPos - worldPos);
  output.glowIntensity = instance.glowIntensity;
  output.specularStrength = instance.specularStrength;
  output.atomicNumber = instance.atomicNumber;
  return output;
}
`;

const ATOM_FRAGMENT_SHADER = `
struct FragmentInput {
  @location(0) normal: vec3<f32>,
  @location(1) worldPos: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) viewDir: vec3<f32>,
  @location(4) glowIntensity: f32,
  @location(5) specularStrength: f32,
  @location(6) atomicNumber: f32,
};

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
  let lightDir = normalize(vec3<f32>(0.5, 0.8, 1.0));
  let ambientColor = vec3<f32>(0.08, 0.12, 0.2);
  let diffuseColor = input.color;
  let specularColor = vec3<f32>(1.0, 1.0, 1.0);
  
  let normal = normalize(input.normal);
  let viewDir = normalize(input.viewDir);
  let halfDir = normalize(lightDir + viewDir);
  
  let diffuse = max(dot(normal, lightDir), 0.0);
  let specular = pow(max(dot(normal, halfDir), 0.0), 32.0) * input.specularStrength;
  
  var finalColor = ambientColor * diffuseColor + diffuse * diffuseColor + specular * specularColor * 0.8;
  
  let rim = 1.0 - max(dot(normal, viewDir), 0.0);
  let rimColor = vec3<f32>(0.0, 0.7, 1.0);
  finalColor += rimColor * pow(rim, 3.0) * (0.2 + input.glowIntensity * 0.3);
  
  let fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
  finalColor += input.color * fresnel * input.glowIntensity * 0.5;
  
  let centerGlow = pow(max(dot(normal, viewDir), 0.0), 0.3);
  finalColor += input.color * centerGlow * input.glowIntensity * 0.15;
  
  return vec4<f32>(finalColor, 1.0);
}
`;

const BOND_VERTEX_SHADER = `
struct Uniforms {
  viewProj: mat4x4<f32>,
  viewPos: vec3<f32>,
  padding: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) viewDir: vec3<f32>,
};

@vertex
fn vs_main(@location(0) position: vec3<f32>, @location(1) normal: vec3<f32>) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.viewProj * vec4<f32>(position, 1.0);
  output.normal = normalize(normal);
  output.viewDir = normalize(uniforms.viewPos - position);
  return output;
}
`;

const BOND_FRAGMENT_SHADER = `
struct FragmentInput {
  @location(0) normal: vec3<f32>,
  @location(1) viewDir: vec3<f32>,
};

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
  let lightDir = normalize(vec3<f32>(0.5, 0.8, 1.0));
  let bondColor = vec3<f32>(0.6, 0.6, 0.7);
  let ambientColor = vec3<f32>(0.1, 0.15, 0.25);
  
  let normal = normalize(input.normal);
  let diffuse = max(dot(normal, lightDir), 0.0);
  
  var finalColor = ambientColor * bondColor + diffuse * bondColor * 0.8;
  
  return vec4<f32>(finalColor, 1.0);
}
`;

const LINE_VERTEX_SHADER = `
struct Uniforms {
  viewProj: mat4x4<f32>,
  viewPos: vec3<f32>,
  padding: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var<storage, read> lineData: array<vec4<f32>>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  let lineIndex = instanceIndex * 2u;
  let startPos = lineData[lineIndex].xyz;
  let endPos = lineData[lineIndex + 1u].xyz;
  let forceMag = lineData[lineIndex].w;
  
  var pos: vec3<f32>;
  var t: f32;
  if (vertexIndex % 2u == 0u) {
    pos = startPos;
    t = 0.0;
  } else {
    pos = endPos;
    t = 1.0;
  }
  
  var color: vec3<f32>;
  if (forceMag > 0.0) {
    color = mix(vec3<f32>(0.0, 0.8, 1.0), vec3<f32>(1.0, 0.0, 0.5), min(forceMag / 5.0, 1.0));
  } else {
    color = mix(vec3<f32>(0.0, 0.8, 1.0), vec3<f32>(0.0, 1.0, 0.5), min(-forceMag / 5.0, 1.0));
  }
  
  var output: VertexOutput;
  output.position = uniforms.viewProj * vec4<f32>(pos, 1.0);
  output.color = color;
  return output;
}
`;

const LINE_FRAGMENT_SHADER = `
struct FragmentInput {
  @location(0) color: vec3<f32>,
};

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
  return vec4<f32>(input.color, 0.6);
}
`;

const TRAJECTORY_VERTEX_SHADER = `
struct Uniforms {
  viewProj: mat4x4<f32>,
  viewPos: vec3<f32>,
  padding: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<storage, read> trajectoryData: array<vec4<f32>>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  let pointIndex = vertexIndex;
  let point = trajectoryData[pointIndex + instanceIndex * 100u];
  let alpha = point.w;
  
  var output: VertexOutput;
  output.position = uniforms.viewProj * vec4<f32>(point.xyz, 1.0);
  output.color = vec3<f32>(0.0, 0.8, 1.0);
  output.alpha = alpha;
  return output;
}
`;

const TRAJECTORY_FRAGMENT_SHADER = `
struct FragmentInput {
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32,
};

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
  return vec4<f32>(input.color, input.alpha * 0.5);
}
`;

const STAR_VERTEX_SHADER = `
struct Uniforms {
  viewProj: mat4x4<f32>,
  viewPos: vec3<f32>,
  padding: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(4) var<storage, read> starData: array<vec4<f32>>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) brightness: f32,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  let star = starData[vertexIndex];
  var output: VertexOutput;
  output.position = uniforms.viewProj * vec4<f32>(star.xyz, 1.0);
  output.brightness = star.w;
  return output;
}
`;

const STAR_FRAGMENT_SHADER = `
struct FragmentInput {
  @location(0) brightness: f32,
};

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
  return vec4<f32>(vec3<f32>(1.0) * input.brightness, 1.0);
}
`;

export interface RendererOptions {
  showBonds: boolean;
  showForces: boolean;
  showTrajectories: boolean;
  showStars: boolean;
  forceScale: number;
}

const DEFAULT_OPTIONS: RendererOptions = {
  showBonds: true,
  showForces: false,
  showTrajectories: false,
  showStars: true,
  forceScale: 0.1,
};

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private ctx: GPUCanvasContext | null = null;
  private device: GPUDevice | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';
  private options: RendererOptions;

  private sphereGeometry: SphereGeometry | null = null;
  private cylinderGeometry: CylinderGeometry | null = null;

  private uniformBuffer: GPUBuffer | null = null;
  private instanceBuffer: GPUBuffer | null = null;
  private lineDataBuffer: GPUBuffer | null = null;
  private trajectoryBuffer: GPUBuffer | null = null;
  private starBuffer: GPUBuffer | null = null;

  private atomVertexBuffer: GPUBuffer | null = null;
  private atomNormalBuffer: GPUBuffer | null = null;
  private atomIndexBuffer: GPUBuffer | null = null;

  private bondVertexBuffer: GPUBuffer | null = null;
  private bondNormalBuffer: GPUBuffer | null = null;
  private bondIndexBuffer: GPUBuffer | null = null;
  private bondIndexCount: number = 0;

  private bindGroup: GPUBindGroup | null = null;
  private atomPipeline: GPURenderPipeline | null = null;
  private bondPipeline: GPURenderPipeline | null = null;
  private forceLinePipeline: GPURenderPipeline | null = null;
  private trajectoryPipeline: GPURenderPipeline | null = null;
  private starPipeline: GPURenderPipeline | null = null;

  private atomCount: number = 0;
  private bondCount: number = 0;
  private forcePairCount: number = 0;
  private trajectoryLength: number = 0;
  private trajectoryAtomCount: number = 0;
  private starCount: number = 0;

  private width: number = 0;
  private height: number = 0;
  private initialized: boolean = false;

  private msaaTexture: GPUTexture | null = null;
  private depthTexture: GPUTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.options = { ...DEFAULT_OPTIONS };
    this.sphereGeometry = createSphereGeometry(1, 32, 32);
    this.cylinderGeometry = createCylinderGeometry(1, 1, 1, 16, 1);
  }

  async init(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.error('WebGPU not supported');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.error('Failed to get GPU adapter');
        return false;
      }

      this.device = await adapter.requestDevice();
      if (!this.device) {
        console.error('Failed to get GPU device');
        return false;
      }

      this.ctx = this.canvas.getContext('webgpu');
      if (!this.ctx) {
        console.error('Failed to get WebGPU context');
        return false;
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      this.format = format;

      this.ctx.configure({
        device: this.device,
        format: format,
        alphaMode: 'premultiplied',
      });

      this.resize();
      this.createBuffers();
      this.createPipelines();
      this.createStars();
      this.createRenderTextures();

      this.initialized = true;
      return true;
    } catch (e) {
      console.error('WebGPU initialization error:', e);
      return false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  setOptions(options: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): RendererOptions {
    return { ...this.options };
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width * dpr));
    this.height = Math.max(1, Math.floor(rect.height * dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.device && this.initialized) {
      this.createRenderTextures();
    }
  }

  private createRenderTextures(): void {
    if (!this.device) return;

    if (this.msaaTexture) {
      this.msaaTexture.destroy();
    }
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.msaaTexture = this.device.createTexture({
      size: [this.width, this.height],
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: 4,
    });

    this.depthTexture = this.device.createTexture({
      size: [this.width, this.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: 4,
    });
  }

  private createBuffers(): void {
    if (!this.device || !this.sphereGeometry) return;

    const uniformBufferSize = 256;
    this.uniformBuffer = this.device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.atomVertexBuffer = this.device.createBuffer({
      size: this.sphereGeometry.positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.atomVertexBuffer, 0, this.sphereGeometry.positions);

    this.atomNormalBuffer = this.device.createBuffer({
      size: this.sphereGeometry.normals.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.atomNormalBuffer, 0, this.sphereGeometry.normals);

    this.atomIndexBuffer = this.device.createBuffer({
      size: this.sphereGeometry.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.atomIndexBuffer, 0, this.sphereGeometry.indices);

    const maxBonds = 1024;
    const bondVerticesPerBond = (16 + 1) * (1 + 1);
    const bondIndicesPerBond = 16 * 1 * 6;
    this.bondVertexBuffer = this.device.createBuffer({
      size: maxBonds * bondVerticesPerBond * 3 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.bondNormalBuffer = this.device.createBuffer({
      size: maxBonds * bondVerticesPerBond * 3 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.bondIndexBuffer = this.device.createBuffer({
      size: maxBonds * bondIndicesPerBond * 2,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    this.instanceBuffer = this.device.createBuffer({
      size: 1024 * 16 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.lineDataBuffer = this.device.createBuffer({
      size: 2048 * 16 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.trajectoryBuffer = this.device.createBuffer({
      size: 1024 * 100 * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.starBuffer = this.device.createBuffer({
      size: 2000 * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createBindGroup(): void {
    if (!this.device || !this.atomPipeline) return;

    const layout = this.atomPipeline.getBindGroupLayout(0);
    this.bindGroup = this.device.createBindGroup({
      layout: layout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer! } },
        { binding: 1, resource: { buffer: this.instanceBuffer! } },
        { binding: 2, resource: { buffer: this.lineDataBuffer! } },
        { binding: 3, resource: { buffer: this.trajectoryBuffer! } },
        { binding: 4, resource: { buffer: this.starBuffer! } },
      ],
    });
  }

  private createPipelines(): void {
    if (!this.device) return;

    const shaderModule = (code: string) =>
      this.device!.createShaderModule({ code });

    const atomVS = shaderModule(ATOM_VERTEX_SHADER);
    const atomFS = shaderModule(ATOM_FRAGMENT_SHADER);
    const bondVS = shaderModule(BOND_VERTEX_SHADER);
    const bondFS = shaderModule(BOND_FRAGMENT_SHADER);
    const lineVS = shaderModule(LINE_VERTEX_SHADER);
    const lineFS = shaderModule(LINE_FRAGMENT_SHADER);
    const trajVS = shaderModule(TRAJECTORY_VERTEX_SHADER);
    const trajFS = shaderModule(TRAJECTORY_FRAGMENT_SHADER);
    const starVS = shaderModule(STAR_VERTEX_SHADER);
    const starFS = shaderModule(STAR_FRAGMENT_SHADER);

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 4, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.atomPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: atomVS,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }],
          },
        ],
      },
      fragment: {
        module: atomFS,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
        frontFace: 'cw',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      multisample: { count: 4 },
    });

    this.bondPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: bondVS,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
          },
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }],
          },
        ],
      },
      fragment: {
        module: bondFS,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
        frontFace: 'cw',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      multisample: { count: 4 },
    });

    this.forceLinePipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: lineVS, entryPoint: 'vs_main', buffers: [] },
      fragment: {
        module: lineFS,
        entryPoint: 'fs_main',
        targets: [{ format: this.format, blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
          alpha: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
        } }],
      },
      primitive: { topology: 'line-list' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      multisample: { count: 4 },
    });

    this.trajectoryPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: trajVS, entryPoint: 'vs_main', buffers: [] },
      fragment: {
        module: trajFS,
        entryPoint: 'fs_main',
        targets: [{ format: this.format, blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
          alpha: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
        } }],
      },
      primitive: { topology: 'line-strip' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      multisample: { count: 4 },
    });

    this.starPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: starVS, entryPoint: 'vs_main', buffers: [] },
      fragment: { module: starFS, entryPoint: 'fs_main', targets: [{ format: this.format }] },
      primitive: { topology: 'point-list' },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less',
        format: 'depth24plus',
      },
      multisample: { count: 4 },
    });

    this.createBindGroup();
  }

  private createStars(): void {
    if (!this.device) return;

    const stars: number[] = [];
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 30;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      const brightness = 0.3 + Math.random() * 0.7;
      stars.push(x, y, z, brightness);
    }

    this.starCount = 500;
    const data = new Float32Array(stars);
    this.device.queue.writeBuffer(this.starBuffer!, 0, data);
  }

  updateAtoms(atoms: Atom[]): void {
    if (!this.device || !this.instanceBuffer) return;

    this.atomCount = atoms.length;
    const instanceData = new Float32Array(atoms.length * 12);

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const offset = i * 12;
      instanceData[offset + 0] = atom.position.x;
      instanceData[offset + 1] = atom.position.y;
      instanceData[offset + 2] = atom.position.z;
      instanceData[offset + 3] = atom.radius;
      instanceData[offset + 4] = atom.color.x;
      instanceData[offset + 5] = atom.color.y;
      instanceData[offset + 6] = atom.color.z;
      instanceData[offset + 7] = atom.glowIntensity || 0.2;
      instanceData[offset + 8] = atom.specularStrength || 0.5;
      instanceData[offset + 9] = atom.atomicNumber || 0;
      instanceData[offset + 10] = 0;
      instanceData[offset + 11] = 0;
    }

    this.device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);
  }

  updateBonds(atoms: Atom[], bonds: Bond[]): void {
    if (!this.device || !this.cylinderGeometry) return;

    this.bondCount = bonds.length;
    const baseVerts = this.cylinderGeometry.positions;
    const baseNorms = this.cylinderGeometry.normals;
    const baseIndices = this.cylinderGeometry.indices;
    const vertCount = this.cylinderGeometry.vertexCount;
    const idxCount = this.cylinderGeometry.indexCount;

    const bondRadius = 0.15;
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < bonds.length; i++) {
      const bond = bonds[i];
      const atom1 = atoms[bond.atom1];
      const atom2 = atoms[bond.atom2];
      if (!atom1 || !atom2) continue;

      const p1 = atom1.position;
      const p2 = atom2.position;
      const dir = vec3Sub(p2, p1);
      const length = vec3Length(dir);
      const mid = vec3Scale(vec3Add(p1, p2), 0.5);

      const yAxis = vec3Normalize(dir);
      let xAxis: Vec3;
      const worldUp = { x: 0, y: 1, z: 0 };
      const dot = Math.abs(yAxis.x * worldUp.x + yAxis.y * worldUp.y + yAxis.z * worldUp.z);
      if (dot > 0.999) {
        xAxis = vec3Normalize(vec3Cross({ x: 1, y: 0, z: 0 }, yAxis));
      } else {
        xAxis = vec3Normalize(vec3Cross(worldUp, yAxis));
      }
      const zAxis = vec3Cross(xAxis, yAxis);

      const baseIdx = vertices.length / 3;

      for (let j = 0; j < vertCount; j++) {
        const vx = baseVerts[j * 3];
        const vy = baseVerts[j * 3 + 1];
        const vz = baseVerts[j * 3 + 2];

        const sx = vx * bondRadius;
        const sy = vy * length;
        const sz = vz * bondRadius;

        const wx = xAxis.x * sx + yAxis.x * sy + zAxis.x * sz;
        const wy = xAxis.y * sx + yAxis.y * sy + zAxis.y * sz;
        const wz = xAxis.z * sx + yAxis.z * sy + zAxis.z * sz;

        vertices.push(wx + mid.x, wy + mid.y, wz + mid.z);

        const nx = baseNorms[j * 3];
        const ny = baseNorms[j * 3 + 1];
        const nz = baseNorms[j * 3 + 2];

        const nwx = xAxis.x * nx + yAxis.x * ny + zAxis.x * nz;
        const nwy = xAxis.y * nx + yAxis.y * ny + zAxis.y * nz;
        const nwz = xAxis.z * nx + yAxis.z * ny + zAxis.z * nz;

        normals.push(nwx, nwy, nwz);
      }

      for (let j = 0; j < idxCount; j++) {
        indices.push(baseIdx + baseIndices[j]);
      }
    }

    this.bondIndexCount = indices.length;

    if (vertices.length > 0) {
      const vertData = new Float32Array(vertices);
      const normData = new Float32Array(normals);
      const idxData = new Uint16Array(indices);
      this.device.queue.writeBuffer(this.bondVertexBuffer!, 0, vertData);
      this.device.queue.writeBuffer(this.bondNormalBuffer!, 0, normData);
      this.device.queue.writeBuffer(this.bondIndexBuffer!, 0, idxData);
    }
  }

  updateForces(forcePairs: ForcePair[], atoms: Atom[]): void {
    if (!this.device || !this.lineDataBuffer) return;

    this.forcePairCount = forcePairs.length * 2;
    const lineData = new Float32Array(forcePairs.length * 4 * 4);
    const scale = this.options.forceScale;

    for (let i = 0; i < forcePairs.length; i++) {
      const pair = forcePairs[i];
      const atom1 = atoms[pair.atom1];
      const atom2 = atoms[pair.atom2];

      if (!atom1 || !atom2) continue;

      const baseOffset = i * 16;

      lineData[baseOffset + 0] = atom1.position.x;
      lineData[baseOffset + 1] = atom1.position.y;
      lineData[baseOffset + 2] = atom1.position.z;
      lineData[baseOffset + 3] = -pair.magnitude;

      const fx1 = -pair.force.x * scale;
      const fy1 = -pair.force.y * scale;
      const fz1 = -pair.force.z * scale;
      lineData[baseOffset + 4] = atom1.position.x + fx1;
      lineData[baseOffset + 5] = atom1.position.y + fy1;
      lineData[baseOffset + 6] = atom1.position.z + fz1;
      lineData[baseOffset + 7] = -pair.magnitude;

      lineData[baseOffset + 8] = atom2.position.x;
      lineData[baseOffset + 9] = atom2.position.y;
      lineData[baseOffset + 10] = atom2.position.z;
      lineData[baseOffset + 11] = pair.magnitude;

      const fx2 = pair.force.x * scale;
      const fy2 = pair.force.y * scale;
      const fz2 = pair.force.z * scale;
      lineData[baseOffset + 12] = atom2.position.x + fx2;
      lineData[baseOffset + 13] = atom2.position.y + fy2;
      lineData[baseOffset + 14] = atom2.position.z + fz2;
      lineData[baseOffset + 15] = pair.magnitude;
    }

    this.device.queue.writeBuffer(this.lineDataBuffer, 0, lineData);
  }

  updateTrajectories(trajectories: Map<number, TrajectoryPoint[]>): void {
    if (!this.device || !this.trajectoryBuffer) return;

    const maxPoints = 100;
    const atomIds = Array.from(trajectories.keys());
    this.trajectoryAtomCount = atomIds.length;

    const trajData = new Float32Array(atomIds.length * maxPoints * 4);

    for (let i = 0; i < atomIds.length; i++) {
      const traj = trajectories.get(atomIds[i]) || [];
      const baseOffset = i * maxPoints * 4;
      this.trajectoryLength = Math.min(traj.length, maxPoints);

      for (let j = 0; j < maxPoints; j++) {
        const offset = baseOffset + j * 4;
        if (j < traj.length) {
          const point = traj[j];
          const alpha = (j + 1) / traj.length;
          trajData[offset + 0] = point.position.x;
          trajData[offset + 1] = point.position.y;
          trajData[offset + 2] = point.position.z;
          trajData[offset + 3] = alpha;
        } else {
          const lastPoint = traj[traj.length - 1];
          if (lastPoint) {
            trajData[offset + 0] = lastPoint.position.x;
            trajData[offset + 1] = lastPoint.position.y;
            trajData[offset + 2] = lastPoint.position.z;
            trajData[offset + 3] = 0;
          }
        }
      }
    }

    this.device.queue.writeBuffer(this.trajectoryBuffer, 0, trajData);
  }

  render(camera: CameraState): void {
    if (!this.initialized || !this.device || !this.ctx || !this.bindGroup || !this.msaaTexture || !this.depthTexture) return;

    const aspect = this.width / this.height;
    const fovRad = (camera.fov * Math.PI) / 180;
    const proj = mat4Perspective(fovRad, aspect, camera.near, camera.far);
    const view = mat4LookAt(camera.position, camera.target, camera.up);
    const viewProj = mat4Multiply(proj, view);

    const uniformData = new Float32Array(16 + 4);
    uniformData.set(viewProj, 0);
    uniformData[16] = camera.position.x;
    uniformData[17] = camera.position.y;
    uniformData[18] = camera.position.z;
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, uniformData);

    const commandEncoder = this.device.createCommandEncoder();

    const pass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.msaaTexture.createView(),
          resolveTarget: this.ctx.getCurrentTexture().createView(),
          clearValue: { r: 0.02, g: 0.05, b: 0.1, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    pass.setBindGroup(0, this.bindGroup);

    if (this.options.showStars && this.starCount > 0) {
      pass.setPipeline(this.starPipeline!);
      pass.draw(this.starCount);
    }

    if (this.options.showTrajectories && this.trajectoryAtomCount > 0) {
      pass.setPipeline(this.trajectoryPipeline!);
      for (let i = 0; i < this.trajectoryAtomCount; i++) {
        pass.draw(this.trajectoryLength, 1, 0, i);
      }
    }

    if (this.options.showForces && this.forcePairCount > 0) {
      pass.setPipeline(this.forceLinePipeline!);
      pass.draw(2, this.forcePairCount);
    }

    if (this.options.showBonds && this.bondCount > 0 && this.bondIndexCount > 0) {
      pass.setPipeline(this.bondPipeline!);
      pass.setVertexBuffer(0, this.bondVertexBuffer!);
      pass.setVertexBuffer(1, this.bondNormalBuffer!);
      pass.setIndexBuffer(this.bondIndexBuffer!, 'uint16');
      pass.drawIndexed(this.bondIndexCount);
    }

    if (this.atomCount > 0 && this.sphereGeometry) {
      pass.setPipeline(this.atomPipeline!);
      pass.setVertexBuffer(0, this.atomVertexBuffer!);
      pass.setVertexBuffer(1, this.atomNormalBuffer!);
      pass.setIndexBuffer(this.atomIndexBuffer!, 'uint16');
      pass.drawIndexed(this.sphereGeometry.indexCount, this.atomCount);
    }

    pass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  destroy(): void {
    if (this.device) {
      this.msaaTexture?.destroy();
      this.depthTexture?.destroy();
      this.uniformBuffer?.destroy();
      this.instanceBuffer?.destroy();
      this.lineDataBuffer?.destroy();
      this.trajectoryBuffer?.destroy();
      this.starBuffer?.destroy();
      this.atomVertexBuffer?.destroy();
      this.atomNormalBuffer?.destroy();
      this.atomIndexBuffer?.destroy();
      this.bondVertexBuffer?.destroy();
      this.bondNormalBuffer?.destroy();
      this.bondIndexBuffer?.destroy();
    }
  }
}

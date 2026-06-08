import type { Vec3 } from './MoleculeData';
import { vec3Add, vec3Sub, vec3Scale, vec3Cross, vec3Normalize, vec3Length } from './MoleculeData';

export interface CameraState {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  near: number;
  far: number;
}

export interface InteractionConfig {
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
  minDistance: number;
  maxDistance: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
}

const DEFAULT_CONFIG: InteractionConfig = {
  rotateSpeed: 0.005,
  zoomSpeed: 0.001,
  panSpeed: 0.003,
  minDistance: 1,
  maxDistance: 50,
  autoRotate: false,
  autoRotateSpeed: 0.002,
};

type InteractionMode = 'none' | 'rotate' | 'pan' | 'zoom';

export class InteractionController {
  private canvas: HTMLCanvasElement;
  private config: InteractionConfig;
  private camera: CameraState;
  private mode: InteractionMode;
  private lastX: number;
  private lastY: number;
  private initialDistance: number;
  private touchStartDist: number;
  private listeners: (() => void)[] = [];

  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: () => void;
  private _onWheel: (e: WheelEvent) => void;
  private _onContextMenu: (e: MouseEvent) => void;
  private _onTouchStart: (e: TouchEvent) => void;
  private _onTouchMove: (e: TouchEvent) => void;
  private _onTouchEnd: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG };
    this.camera = {
      position: { x: 0, y: 0, z: 8 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      fov: 60,
      near: 0.1,
      far: 100,
    };
    this.mode = 'none';
    this.lastX = 0;
    this.lastY = 0;
    this.initialDistance = 8;
    this.touchStartDist = 0;

    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onMouseUp = this.onMouseUp.bind(this);
    this._onWheel = this.onWheel.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);
    this._onTouchStart = this.onTouchStart.bind(this);
    this._onTouchMove = this.onTouchMove.bind(this);
    this._onTouchEnd = this.onTouchEnd.bind(this);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this._onContextMenu);

    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);

    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
  }

  getCamera(): CameraState {
    return {
      position: { ...this.camera.position },
      target: { ...this.camera.target },
      up: { ...this.camera.up },
      fov: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far,
    };
  }

  setCamera(camera: Partial<CameraState>): void {
    this.camera = { ...this.camera, ...camera };
    this.notifyChange();
  }

  getConfig(): InteractionConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<InteractionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onChange(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (e.button === 0) {
      this.mode = 'rotate';
    } else if (e.button === 2) {
      this.mode = 'pan';
    } else if (e.button === 1) {
      this.mode = 'zoom';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.mode === 'none') return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.mode === 'rotate') {
      this.rotate(dx, dy);
    } else if (this.mode === 'pan') {
      this.pan(dx, dy);
    } else if (this.mode === 'zoom') {
      this.zoom(dy * 0.1);
    }
  }

  private onMouseUp(): void {
    this.mode = 'none';
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.zoom(e.deltaY * this.config.zoomSpeed);
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.mode = 'rotate';
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      this.mode = 'zoom';
      this.touchStartDist = this.getTouchDistance(e.touches);
      this.initialDistance = this.getCameraDistance();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.mode === 'rotate') {
      const dx = e.touches[0].clientX - this.lastX;
      const dy = e.touches[0].clientY - this.lastY;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
      this.rotate(dx, dy);
    } else if (e.touches.length === 2 && this.mode === 'zoom') {
      const dist = this.getTouchDistance(e.touches);
      const scale = this.touchStartDist / dist;
      const currentDist = this.getCameraDistance();
      const targetDist = this.initialDistance * scale;
      const delta = currentDist - targetDist;
      this.zoom(delta * 0.1);
    }
  }

  private onTouchEnd(): void {
    this.mode = 'none';
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getCameraDistance(): number {
    const diff = vec3Sub(this.camera.position, this.camera.target);
    return vec3Length(diff);
  }

  private rotate(dx: number, dy: number): void {
    const angleX = -dx * this.config.rotateSpeed;
    const angleY = -dy * this.config.rotateSpeed;

    const direction = vec3Sub(this.camera.position, this.camera.target);
    const distance = vec3Length(direction);
    const dirNorm = vec3Normalize(direction);

    const right = vec3Normalize(vec3Cross(dirNorm, this.camera.up));
    const up = vec3Normalize(vec3Cross(right, dirNorm));

    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    let newDir = vec3Add(
      vec3Scale(dirNorm, cosY),
      vec3Scale(up, sinY)
    );

    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    newDir = vec3Add(
      vec3Scale(newDir, cosX),
      vec3Scale(right, sinX)
    );

    newDir = vec3Normalize(newDir);
    const newPos = vec3Add(this.camera.target, vec3Scale(newDir, distance));

    this.camera.position = newPos;
    this.camera.up = up;

    this.notifyChange();
  }

  private pan(dx: number, dy: number): void {
    const direction = vec3Sub(this.camera.position, this.camera.target);
    const distance = vec3Length(direction);
    const dirNorm = vec3Normalize(direction);

    const right = vec3Normalize(vec3Cross(dirNorm, this.camera.up));
    const up = vec3Normalize(vec3Cross(right, dirNorm));

    const panX = dx * this.config.panSpeed * distance;
    const panY = -dy * this.config.panSpeed * distance;

    const panVec = vec3Add(
      vec3Scale(right, panX),
      vec3Scale(up, panY)
    );

    this.camera.position = vec3Add(this.camera.position, panVec);
    this.camera.target = vec3Add(this.camera.target, panVec);

    this.notifyChange();
  }

  private zoom(delta: number): void {
    const direction = vec3Sub(this.camera.position, this.camera.target);
    const distance = vec3Length(direction);

    let newDistance = distance + delta;

    newDistance = Math.max(this.config.minDistance, Math.min(this.config.maxDistance, newDistance));

    const dirNorm = vec3Normalize(direction);
    this.camera.position = vec3Add(this.camera.target, vec3Scale(dirNorm, newDistance));

    this.notifyChange();
  }

  update(deltaTime: number): void {
    if (this.config.autoRotate && this.mode === 'none') {
      this.rotate(this.config.autoRotateSpeed * deltaTime * 60, 0);
    }
  }

  reset(): void {
    this.camera = {
      position: { x: 0, y: 0, z: 8 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      fov: 60,
      near: 0.1,
      far: 100,
    };
    this.notifyChange();
  }

  setTarget(target: Vec3): void {
    const direction = vec3Sub(this.camera.position, this.camera.target);
    this.camera.target = { ...target };
    this.camera.position = vec3Add(this.camera.target, direction);
    this.notifyChange();
  }

  fitView(radius: number): void {
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const distance = radius / Math.sin(fovRad / 2) * 1.2;

    const direction = vec3Normalize(vec3Sub(this.camera.position, this.camera.target));
    this.camera.position = vec3Add(this.camera.target, vec3Scale(direction, distance));

    this.config.minDistance = radius * 0.5;
    this.config.maxDistance = radius * 10;

    this.notifyChange();
  }
}

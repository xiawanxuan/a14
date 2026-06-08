import type { Vec3 } from './MoleculeData';

export type Mat4 = Float32Array;

export function mat4Identity(): Mat4 {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

export function mat4Perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1.0 / Math.tan(fovY / 2);
  const f_n = -far / (far - near);
  const nf_n = -far * near / (far - near);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, -f, 0, 0,
    0, 0, f_n, -1,
    0, 0, nf_n, 0,
  ]);
}

export function mat4LookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const zAxis = normalize({
    x: eye.x - center.x,
    y: eye.y - center.y,
    z: eye.z - center.z,
  });
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);

  return new Float32Array([
    xAxis.x, yAxis.x, zAxis.x, 0,
    xAxis.y, yAxis.y, zAxis.y, 0,
    xAxis.z, yAxis.z, zAxis.z, 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1,
  ]);
}

export function mat4Translate(m: Mat4, v: Vec3): Mat4 {
  const result = new Float32Array(m);
  result[12] = m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12];
  result[13] = m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13];
  result[14] = m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14];
  result[15] = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
  return result;
}

export function mat4Scale(m: Mat4, v: Vec3): Mat4 {
  const result = new Float32Array(m);
  result[0] *= v.x;
  result[1] *= v.x;
  result[2] *= v.x;
  result[3] *= v.x;
  result[4] *= v.y;
  result[5] *= v.y;
  result[6] *= v.y;
  result[7] *= v.y;
  result[8] *= v.z;
  result[9] *= v.z;
  result[10] *= v.z;
  result[11] *= v.z;
  return result;
}

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const result = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i * 4 + j] =
        a[0 * 4 + j] * b[i * 4 + 0] +
        a[1 * 4 + j] * b[i * 4 + 1] +
        a[2 * 4 + j] * b[i * 4 + 2] +
        a[3 * 4 + j] * b[i * 4 + 3];
    }
  }
  return result;
}

export function mat4Transpose(m: Mat4): Mat4 {
  const result = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i * 4 + j] = m[j * 4 + i];
    }
  }
  return result;
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export interface SphereGeometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

export function createSphereGeometry(radius: number, widthSegments: number, heightSegments: number): SphereGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const theta = v * Math.PI;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const phi = u * Math.PI * 2;

      const px = -radius * Math.sin(theta) * Math.cos(phi);
      const py = radius * Math.cos(theta);
      const pz = radius * Math.sin(theta) * Math.sin(phi);

      const nx = px / radius;
      const ny = py / radius;
      const nz = pz / radius;

      positions.push(px, py, pz);
      normals.push(nx, ny, nz);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    vertexCount: positions.length / 3,
    indexCount: indices.length,
  };
}

export interface CylinderGeometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

export function createCylinderGeometry(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  heightSegments: number = 1
): CylinderGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const halfHeight = height / 2;

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const radius = radiusTop + (radiusBottom - radiusTop) * (1 - v);

    for (let x = 0; x <= radialSegments; x++) {
      const u = x / radialSegments;
      const theta = u * Math.PI * 2;

      const px = radius * Math.cos(theta);
      const py = -halfHeight + v * height;
      const pz = radius * Math.sin(theta);

      positions.push(px, py, pz);

      const nx = Math.cos(theta);
      const ny = (radiusBottom - radiusTop) / height;
      const nz = Math.sin(theta);
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normals.push(nx / nLen, ny / nLen, nz / nLen);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < radialSegments; x++) {
      const a = y * (radialSegments + 1) + x;
      const b = a + radialSegments + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    vertexCount: positions.length / 3,
    indexCount: indices.length,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

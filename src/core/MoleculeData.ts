export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Atom {
  id: number;
  element: string;
  position: Vec3;
  velocity: Vec3;
  color: Vec3;
  radius: number;
  mass: number;
}

export interface Bond {
  atom1: number;
  atom2: number;
  type: 'single' | 'double' | 'triple';
}

export interface Molecule {
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
}

interface ElementProperties {
  color: Vec3;
  radius: number;
  mass: number;
}

const ELEMENT_PROPERTIES: Record<string, ElementProperties> = {
  H: { color: { x: 1.0, y: 1.0, z: 1.0 }, radius: 0.32, mass: 1.008 },
  C: { color: { x: 0.3, y: 0.3, z: 0.3 }, radius: 0.75, mass: 12.011 },
  N: { color: { x: 0.2, y: 0.4, z: 1.0 }, radius: 0.71, mass: 14.007 },
  O: { color: { x: 1.0, y: 0.1, z: 0.1 }, radius: 0.68, mass: 15.999 },
  F: { color: { x: 0.0, y: 1.0, z: 0.0 }, radius: 0.64, mass: 18.998 },
  Cl: { color: { x: 0.0, y: 0.8, z: 0.0 }, radius: 0.99, mass: 35.453 },
  Br: { color: { x: 0.6, y: 0.1, z: 0.0 }, radius: 1.14, mass: 79.904 },
  I: { color: { x: 0.5, y: 0.0, z: 0.6 }, radius: 1.33, mass: 126.904 },
  S: { color: { x: 1.0, y: 0.9, z: 0.2 }, radius: 1.02, mass: 32.065 },
  P: { color: { x: 1.0, y: 0.5, z: 0.0 }, radius: 1.06, mass: 30.974 },
  Na: { color: { x: 0.7, y: 0.0, z: 0.8 }, radius: 1.54, mass: 22.990 },
  K: { color: { x: 0.6, y: 0.0, z: 0.8 }, radius: 2.03, mass: 39.098 },
  Ca: { color: { x: 0.3, y: 0.8, z: 0.3 }, radius: 1.76, mass: 40.078 },
  Fe: { color: { x: 0.8, y: 0.4, z: 0.0 }, radius: 1.17, mass: 55.845 },
  Zn: { color: { x: 0.5, y: 0.5, z: 0.5 }, radius: 1.10, mass: 65.38 },
};

export function getElementProperties(element: string): ElementProperties {
  const props = ELEMENT_PROPERTIES[element];
  if (!props) {
    return { color: { x: 0.5, y: 0.5, z: 0.5 }, radius: 0.8, mass: 10.0 };
  }
  return props;
}

function createAtom(id: number, element: string, x: number, y: number, z: number): Atom {
  const props = getElementProperties(element);
  return {
    id,
    element,
    position: { x, y, z },
    velocity: { x: 0, y: 0, z: 0 },
    color: props.color,
    radius: props.radius,
    mass: props.mass,
  };
}

function createBond(atom1: number, atom2: number, type: 'single' | 'double' | 'triple' = 'single'): Bond {
  return { atom1, atom2, type };
}

const BUILTIN_MOLECULES: Molecule[] = [
  {
    name: '水分子 (H₂O)',
    formula: 'H2O',
    atoms: [
      createAtom(0, 'O', 0, 0, 0),
      createAtom(1, 'H', 0.76, 0.586, 0),
      createAtom(2, 'H', -0.76, 0.586, 0),
    ],
    bonds: [
      createBond(0, 1),
      createBond(0, 2),
    ],
  },
  {
    name: '甲烷 (CH₄)',
    formula: 'CH4',
    atoms: [
      createAtom(0, 'C', 0, 0, 0),
      createAtom(1, 'H', 0.629, 0.629, 0.629),
      createAtom(2, 'H', -0.629, -0.629, 0.629),
      createAtom(3, 'H', -0.629, 0.629, -0.629),
      createAtom(4, 'H', 0.629, -0.629, -0.629),
    ],
    bonds: [
      createBond(0, 1),
      createBond(0, 2),
      createBond(0, 3),
      createBond(0, 4),
    ],
  },
  {
    name: '氨 (NH₃)',
    formula: 'NH3',
    atoms: [
      createAtom(0, 'N', 0, 0, 0.3),
      createAtom(1, 'H', 0.937, 0, -0.2),
      createAtom(2, 'H', -0.468, 0.811, -0.2),
      createAtom(3, 'H', -0.468, -0.811, -0.2),
    ],
    bonds: [
      createBond(0, 1),
      createBond(0, 2),
      createBond(0, 3),
    ],
  },
  {
    name: '二氧化碳 (CO₂)',
    formula: 'CO2',
    atoms: [
      createAtom(0, 'C', 0, 0, 0),
      createAtom(1, 'O', 1.16, 0, 0),
      createAtom(2, 'O', -1.16, 0, 0),
    ],
    bonds: [
      createBond(0, 1, 'double'),
      createBond(0, 2, 'double'),
    ],
  },
  {
    name: '苯 (C₆H₆)',
    formula: 'C6H6',
    atoms: [
      createAtom(0, 'C', 1.39, 0, 0),
      createAtom(1, 'C', 0.695, 1.204, 0),
      createAtom(2, 'C', -0.695, 1.204, 0),
      createAtom(3, 'C', -1.39, 0, 0),
      createAtom(4, 'C', -0.695, -1.204, 0),
      createAtom(5, 'C', 0.695, -1.204, 0),
      createAtom(6, 'H', 2.47, 0, 0),
      createAtom(7, 'H', 1.235, 2.142, 0),
      createAtom(8, 'H', -1.235, 2.142, 0),
      createAtom(9, 'H', -2.47, 0, 0),
      createAtom(10, 'H', -1.235, -2.142, 0),
      createAtom(11, 'H', 1.235, -2.142, 0),
    ],
    bonds: [
      createBond(0, 1, 'double'),
      createBond(1, 2, 'single'),
      createBond(2, 3, 'double'),
      createBond(3, 4, 'single'),
      createBond(4, 5, 'double'),
      createBond(5, 0, 'single'),
      createBond(0, 6),
      createBond(1, 7),
      createBond(2, 8),
      createBond(3, 9),
      createBond(4, 10),
      createBond(5, 11),
    ],
  },
  {
    name: '乙醇 (C₂H₆O)',
    formula: 'C2H6O',
    atoms: [
      createAtom(0, 'C', -0.75, 0, 0),
      createAtom(1, 'C', 0.75, 0, 0),
      createAtom(2, 'O', 1.6, 1.0, 0),
      createAtom(3, 'H', -1.15, 0.6, 0.87),
      createAtom(4, 'H', -1.15, 0.6, -0.87),
      createAtom(5, 'H', -1.15, -1.0, 0),
      createAtom(6, 'H', 0.75, -0.6, 0.87),
      createAtom(7, 'H', 0.75, -0.6, -0.87),
      createAtom(8, 'H', 2.2, 0.8, 0),
    ],
    bonds: [
      createBond(0, 1),
      createBond(1, 2),
      createBond(0, 3),
      createBond(0, 4),
      createBond(0, 5),
      createBond(1, 6),
      createBond(1, 7),
      createBond(2, 8),
    ],
  },
  {
    name: ' Lennard-Jones流体 (32原子)',
    formula: 'LJ-Fluid',
    atoms: [],
    bonds: [],
  },
];

function generateLJFluid(count: number = 32, boxSize: number = 6): Molecule {
  const atoms: Atom[] = [];
  const perSide = Math.ceil(Math.cbrt(count));
  const spacing = boxSize / perSide;
  const offset = -boxSize / 2 + spacing / 2;
  let id = 0;

  for (let i = 0; i < perSide && id < count; i++) {
    for (let j = 0; j < perSide && id < count; j++) {
      for (let k = 0; k < perSide && id < count; k++) {
        const x = offset + i * spacing + (Math.random() - 0.5) * 0.2;
        const y = offset + j * spacing + (Math.random() - 0.5) * 0.2;
        const z = offset + k * spacing + (Math.random() - 0.5) * 0.2;
        const temp = 1.0;
        const vx = (Math.random() - 0.5) * temp;
        const vy = (Math.random() - 0.5) * temp;
        const vz = (Math.random() - 0.5) * temp;

        const color = {
          x: 0.2 + (id / count) * 0.6,
          y: 0.5 + Math.random() * 0.3,
          z: 1.0,
        };

        atoms.push({
          id,
          element: 'Ar',
          position: { x, y, z },
          velocity: { x: vx, y: vy, z: vz },
          color,
          radius: 0.5,
          mass: 1.0,
        });
        id++;
      }
    }
  }

  let vxSum = 0, vySum = 0, vzSum = 0;
  for (const atom of atoms) {
    vxSum += atom.velocity.x;
    vySum += atom.velocity.y;
    vzSum += atom.velocity.z;
  }
  vxSum /= atoms.length;
  vySum /= atoms.length;
  vzSum /= atoms.length;
  for (const atom of atoms) {
    atom.velocity.x -= vxSum;
    atom.velocity.y -= vySum;
    atom.velocity.z -= vzSum;
  }

  return {
    name: 'Lennard-Jones流体 (32原子)',
    formula: 'LJ-Fluid',
    atoms,
    bonds: [],
  };
}

export function getBuiltinMolecules(): Molecule[] {
  const molecules = BUILTIN_MOLECULES.filter(m => m.formula !== 'LJ-Fluid');
  return [...molecules, generateLJFluid(32, 6)];
}

export function parseXYZ(data: string): Molecule {
  const lines = data.trim().split('\n');
  const atomCount = parseInt(lines[0], 10);
  const atoms: Atom[] = [];

  for (let i = 2; i < 2 + atomCount && i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length >= 4) {
      const element = parts[0];
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      atoms.push(createAtom(i - 2, element, x, y, z));
    }
  }

  return {
    name: '自定义分子',
    formula: 'Custom',
    atoms,
    bonds: [],
  };
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

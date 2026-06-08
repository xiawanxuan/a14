import type { Atom, Vec3, Bond, HydrogenBond } from './MoleculeData';

export interface ForcePair {
  atom1: number;
  atom2: number;
  force: Vec3;
  magnitude: number;
}

export interface TrajectoryPoint {
  position: Vec3;
  timestamp: number;
}

export interface SimulationConfig {
  timestep: number;
  temperature: number;
  epsilon: number;
  sigma: number;
  cutoff: number;
  useThermostat: boolean;
  thermostatTime: number;
  boundaryType: 'none' | 'periodic' | 'reflect';
  boxSize: number;
  bondSpringConstant: number;
  bondEquilibriumScale: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  timestep: 0.005,
  temperature: 1.0,
  epsilon: 1.0,
  sigma: 1.0,
  cutoff: 2.5,
  useThermostat: true,
  thermostatTime: 0.1,
  boundaryType: 'reflect',
  boxSize: 6,
  bondSpringConstant: 100.0,
  bondEquilibriumScale: 1.0,
};

export class PhysicsEngine {
  private atoms: Atom[];
  private bonds: Bond[];
  private initialAtoms: Atom[];
  private forces: Vec3[];
  private config: SimulationConfig;
  private forcePairs: ForcePair[];
  private trajectories: Map<number, TrajectoryPoint[]>;
  private maxTrajectoryLength: number;
  private simulationTime: number;
  private stepCount: number;
  private kineticEnergy: number;
  private potentialEnergy: number;
  private bondedPairs: Set<string>;

  constructor() {
    this.atoms = [];
    this.bonds = [];
    this.initialAtoms = [];
    this.forces = [];
    this.config = { ...DEFAULT_CONFIG };
    this.forcePairs = [];
    this.trajectories = new Map();
    this.maxTrajectoryLength = 100;
    this.simulationTime = 0;
    this.stepCount = 0;
    this.kineticEnergy = 0;
    this.potentialEnergy = 0;
    this.bondedPairs = new Set();
  }

  setMolecule(atoms: Atom[], bonds: Bond[]): void {
    this.atoms = atoms.map(a => ({
      ...a,
      position: { ...a.position },
      velocity: { ...a.velocity },
    }));
    this.initialAtoms = atoms.map(a => ({
      ...a,
      position: { ...a.position },
      velocity: { ...a.velocity },
    }));
    this.bonds = bonds.map(b => ({ ...b }));
    this.forces = new Array(atoms.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
    this.forcePairs = [];
    this.trajectories = new Map();
    for (const atom of this.atoms) {
      this.trajectories.set(atom.id, []);
    }
    this.bondedPairs = new Set();
    for (const bond of this.bonds) {
      const key = `${Math.min(bond.atom1, bond.atom2)}-${Math.max(bond.atom1, bond.atom2)}`;
      this.bondedPairs.add(key);
    }
    this.simulationTime = 0;
    this.stepCount = 0;
    this.updateTrajectories();
  }

  getAtoms(): Atom[] {
    return this.atoms;
  }

  getBonds(): Bond[] {
    return this.bonds;
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getForcePairs(): ForcePair[] {
    return this.forcePairs;
  }

  getTrajectory(atomId: number): TrajectoryPoint[] {
    return this.trajectories.get(atomId) || [];
  }

  getSimulationTime(): number {
    return this.simulationTime;
  }

  getStepCount(): number {
    return this.stepCount;
  }

  getKineticEnergy(): number {
    return this.kineticEnergy;
  }

  getPotentialEnergy(): number {
    return this.potentialEnergy;
  }

  getTotalEnergy(): number {
    return this.kineticEnergy + this.potentialEnergy;
  }

  getTemperature(): number {
    if (this.atoms.length === 0) return 0;
    const df = 3 * this.atoms.length - 3;
    if (df <= 0) return 0;
    return (2 * this.kineticEnergy) / df;
  }

  step(numSteps: number = 1): void {
    for (let i = 0; i < numSteps; i++) {
      this.verletStep();
      this.simulationTime += this.config.timestep;
      this.stepCount++;
      if (this.stepCount % 5 === 0) {
        this.updateTrajectories();
      }
    }
  }

  private verletStep(): void {
    const dt = this.config.timestep;
    const dt2 = dt * dt;

    this.calculateForces();

    for (let i = 0; i < this.atoms.length; i++) {
      const atom = this.atoms[i];
      const force = this.forces[i];
      const mass = atom.mass;

      atom.position.x += atom.velocity.x * dt + 0.5 * (force.x / mass) * dt2;
      atom.position.y += atom.velocity.y * dt + 0.5 * (force.y / mass) * dt2;
      atom.position.z += atom.velocity.z * dt + 0.5 * (force.z / mass) * dt2;

      atom.velocity.x += 0.5 * (force.x / mass) * dt;
      atom.velocity.y += 0.5 * (force.y / mass) * dt;
      atom.velocity.z += 0.5 * (force.z / mass) * dt;
    }

    this.calculateForces();

    for (let i = 0; i < this.atoms.length; i++) {
      const atom = this.atoms[i];
      const force = this.forces[i];
      const mass = atom.mass;

      atom.velocity.x += 0.5 * (force.x / mass) * dt;
      atom.velocity.y += 0.5 * (force.y / mass) * dt;
      atom.velocity.z += 0.5 * (force.z / mass) * dt;
    }

    this.applyBoundaryConditions();

    if (this.config.useThermostat) {
      this.applyThermostat();
    }

    this.calculateEnergies();
  }

  private calculateForces(): void {
    for (let i = 0; i < this.forces.length; i++) {
      this.forces[i] = { x: 0, y: 0, z: 0 };
    }

    this.forcePairs = [];

    this.calculateLJForces();

    this.calculateBondForces();
  }

  private isBonded(i: number, j: number): boolean {
    const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
    return this.bondedPairs.has(key);
  }

  private calculateLJForces(): void {
    const epsilon = this.config.epsilon;
    const sigma = this.config.sigma;
    const cutoff = this.config.cutoff * sigma;
    const cutoffSq = cutoff * cutoff;

    for (let i = 0; i < this.atoms.length; i++) {
      for (let j = i + 1; j < this.atoms.length; j++) {
        if (this.isBonded(i, j)) continue;

        const atom1 = this.atoms[i];
        const atom2 = this.atoms[j];

        let dx = atom2.position.x - atom1.position.x;
        let dy = atom2.position.y - atom1.position.y;
        let dz = atom2.position.z - atom1.position.z;

        if (this.config.boundaryType === 'periodic') {
          dx = dx - Math.round(dx / this.config.boxSize) * this.config.boxSize;
          dy = dy - Math.round(dy / this.config.boxSize) * this.config.boxSize;
          dz = dz - Math.round(dz / this.config.boxSize) * this.config.boxSize;
        }

        const rSq = dx * dx + dy * dy + dz * dz;

        if (rSq > cutoffSq) continue;
        if (rSq < 0.0001) continue;

        const r = Math.sqrt(rSq);
        const s6 = Math.pow(sigma, 6) / Math.pow(r, 6);
        const s12 = s6 * s6;

        const forceMag = 24 * epsilon * (2 * s12 - s6) / r;

        const fx = forceMag * dx / r;
        const fy = forceMag * dy / r;
        const fz = forceMag * dz / r;

        this.forces[i].x -= fx;
        this.forces[i].y -= fy;
        this.forces[i].z -= fz;
        this.forces[j].x += fx;
        this.forces[j].y += fy;
        this.forces[j].z += fz;

        this.forcePairs.push({
          atom1: i,
          atom2: j,
          force: { x: fx, y: fy, z: fz },
          magnitude: forceMag,
        });
      }
    }
  }

  private calculateBondForces(): void {
    const k = this.config.bondSpringConstant;

    for (const bond of this.bonds) {
      const i = bond.atom1;
      const j = bond.atom2;

      if (i >= this.atoms.length || j >= this.atoms.length) continue;

      const atom1 = this.atoms[i];
      const atom2 = this.atoms[j];

      const dx = atom2.position.x - atom1.position.x;
      const dy = atom2.position.y - atom1.position.y;
      const dz = atom2.position.z - atom1.position.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (r < 0.0001) continue;

      const eqDist = (atom1.radius + atom2.radius) * this.config.bondEquilibriumScale;
      const displacement = r - eqDist;
      const forceMag = -k * displacement;

      const fx = forceMag * dx / r;
      const fy = forceMag * dy / r;
      const fz = forceMag * dz / r;

      this.forces[i].x -= fx;
      this.forces[i].y -= fy;
      this.forces[i].z -= fz;
      this.forces[j].x += fx;
      this.forces[j].y += fy;
      this.forces[j].z += fz;
    }
  }

  private applyBoundaryConditions(): void {
    if (this.config.boundaryType === 'none') return;

    const halfBox = this.config.boxSize / 2;

    for (const atom of this.atoms) {
      if (this.config.boundaryType === 'periodic') {
        if (atom.position.x > halfBox) atom.position.x -= this.config.boxSize;
        if (atom.position.x < -halfBox) atom.position.x += this.config.boxSize;
        if (atom.position.y > halfBox) atom.position.y -= this.config.boxSize;
        if (atom.position.y < -halfBox) atom.position.y += this.config.boxSize;
        if (atom.position.z > halfBox) atom.position.z -= this.config.boxSize;
        if (atom.position.z < -halfBox) atom.position.z += this.config.boxSize;
      } else if (this.config.boundaryType === 'reflect') {
        if (atom.position.x > halfBox - atom.radius) {
          atom.position.x = halfBox - atom.radius;
          atom.velocity.x = -atom.velocity.x;
        }
        if (atom.position.x < -halfBox + atom.radius) {
          atom.position.x = -halfBox + atom.radius;
          atom.velocity.x = -atom.velocity.x;
        }
        if (atom.position.y > halfBox - atom.radius) {
          atom.position.y = halfBox - atom.radius;
          atom.velocity.y = -atom.velocity.y;
        }
        if (atom.position.y < -halfBox + atom.radius) {
          atom.position.y = -halfBox + atom.radius;
          atom.velocity.y = -atom.velocity.y;
        }
        if (atom.position.z > halfBox - atom.radius) {
          atom.position.z = halfBox - atom.radius;
          atom.velocity.z = -atom.velocity.z;
        }
        if (atom.position.z < -halfBox + atom.radius) {
          atom.position.z = -halfBox + atom.radius;
          atom.velocity.z = -atom.velocity.z;
        }
      }
    }
  }

  private applyThermostat(): void {
    const targetTemp = this.config.temperature;
    const dt = this.config.timestep;
    const tau = this.config.thermostatTime;

    let ke = 0;
    for (const atom of this.atoms) {
      const vSq = atom.velocity.x * atom.velocity.x +
                  atom.velocity.y * atom.velocity.y +
                  atom.velocity.z * atom.velocity.z;
      ke += 0.5 * atom.mass * vSq;
    }

    const df = 3 * this.atoms.length - 3;
    if (df <= 0) return;
    const currentTemp = (2 * ke) / df;
    if (currentTemp === 0) return;

    const scale = Math.sqrt(1 + (dt / tau) * (targetTemp / currentTemp - 1));

    const clampedScale = Math.max(0.5, Math.min(2.0, scale));

    for (const atom of this.atoms) {
      atom.velocity.x *= clampedScale;
      atom.velocity.y *= clampedScale;
      atom.velocity.z *= clampedScale;
    }
  }

  private calculateEnergies(): void {
    this.kineticEnergy = 0;
    for (const atom of this.atoms) {
      const vSq = atom.velocity.x * atom.velocity.x +
                  atom.velocity.y * atom.velocity.y +
                  atom.velocity.z * atom.velocity.z;
      this.kineticEnergy += 0.5 * atom.mass * vSq;
    }

    this.potentialEnergy = 0;
    const epsilon = this.config.epsilon;
    const sigma = this.config.sigma;
    const cutoff = this.config.cutoff * sigma;
    const cutoffSq = cutoff * cutoff;

    for (let i = 0; i < this.atoms.length; i++) {
      for (let j = i + 1; j < this.atoms.length; j++) {
        if (this.isBonded(i, j)) continue;

        const atom1 = this.atoms[i];
        const atom2 = this.atoms[j];

        let dx = atom2.position.x - atom1.position.x;
        let dy = atom2.position.y - atom1.position.y;
        let dz = atom2.position.z - atom1.position.z;

        if (this.config.boundaryType === 'periodic') {
          dx = dx - Math.round(dx / this.config.boxSize) * this.config.boxSize;
          dy = dy - Math.round(dy / this.config.boxSize) * this.config.boxSize;
          dz = dz - Math.round(dz / this.config.boxSize) * this.config.boxSize;
        }

        const rSq = dx * dx + dy * dy + dz * dz;
        if (rSq > cutoffSq) continue;
        if (rSq < 0.0001) continue;

        const r = Math.sqrt(rSq);
        const s6 = Math.pow(sigma, 6) / Math.pow(r, 6);
        const s12 = s6 * s6;
        this.potentialEnergy += 4 * epsilon * (s12 - s6);
      }
    }

    const k = this.config.bondSpringConstant;
    for (const bond of this.bonds) {
      const i = bond.atom1;
      const j = bond.atom2;
      if (i >= this.atoms.length || j >= this.atoms.length) continue;

      const atom1 = this.atoms[i];
      const atom2 = this.atoms[j];
      const dx = atom2.position.x - atom1.position.x;
      const dy = atom2.position.y - atom1.position.y;
      const dz = atom2.position.z - atom1.position.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (r < 0.0001) continue;

      const eqDist = (atom1.radius + atom2.radius) * this.config.bondEquilibriumScale;
      const displacement = r - eqDist;
      this.potentialEnergy += 0.5 * k * displacement * displacement;
    }
  }

  private updateTrajectories(): void {
    for (const atom of this.atoms) {
      const traj = this.trajectories.get(atom.id);
      if (traj) {
        traj.push({
          position: { ...atom.position },
          timestamp: this.simulationTime,
        });
        if (traj.length > this.maxTrajectoryLength) {
          traj.shift();
        }
      }
    }
  }

  setMaxTrajectoryLength(length: number): void {
    this.maxTrajectoryLength = Math.max(10, length);
    for (const traj of this.trajectories.values()) {
      while (traj.length > this.maxTrajectoryLength) {
        traj.shift();
      }
    }
  }

  reset(): void {
    this.atoms = this.initialAtoms.map(a => ({
      ...a,
      position: { ...a.position },
      velocity: { ...a.velocity },
    }));
    this.simulationTime = 0;
    this.stepCount = 0;
    this.kineticEnergy = 0;
    this.potentialEnergy = 0;
    this.forces = new Array(this.atoms.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
    this.forcePairs = [];
    this.trajectories.clear();
    for (const atom of this.atoms) {
      this.trajectories.set(atom.id, [{
        position: { ...atom.position },
        timestamp: 0,
      }]);
    }
  }

  getMaxForceMagnitude(): number {
    let max = 0;
    for (const pair of this.forcePairs) {
      const absMag = Math.abs(pair.magnitude);
      if (absMag > max) max = absMag;
    }
    return max;
  }

  getHydrogenBonds(): HydrogenBond[] {
    const hBonds: HydrogenBond[] = [];
    const hBondDonors = ['N', 'O', 'F'];
    const hBondAcceptors = ['N', 'O', 'F'];
    const maxDistance = 2.5;
    const minAngle = 120 * Math.PI / 180;

    const hydrogenIndices: number[] = [];
    for (let i = 0; i < this.atoms.length; i++) {
      if (this.atoms[i].element === 'H') {
        hydrogenIndices.push(i);
      }
    }

    for (const hIdx of hydrogenIndices) {
      const hAtom = this.atoms[hIdx];
      let donorIdx = -1;
      let minDist = Infinity;

      for (let i = 0; i < this.atoms.length; i++) {
        if (i === hIdx) continue;
        if (!hBondDonors.includes(this.atoms[i].element)) continue;

        const pairKey1 = `${i}-${hIdx}`;
        const pairKey2 = `${hIdx}-${i}`;
        if (!this.bondedPairs.has(pairKey1) && !this.bondedPairs.has(pairKey2)) continue;

        const dx = hAtom.position.x - this.atoms[i].position.x;
        const dy = hAtom.position.y - this.atoms[i].position.y;
        const dz = hAtom.position.z - this.atoms[i].position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDist) {
          minDist = dist;
          donorIdx = i;
        }
      }

      if (donorIdx === -1) continue;

      const donorAtom = this.atoms[donorIdx];
      const donorToH = {
        x: hAtom.position.x - donorAtom.position.x,
        y: hAtom.position.y - donorAtom.position.y,
        z: hAtom.position.z - donorAtom.position.z,
      };

      for (let i = 0; i < this.atoms.length; i++) {
        if (i === hIdx || i === donorIdx) continue;
        if (!hBondAcceptors.includes(this.atoms[i].element)) continue;

        const acceptorAtom = this.atoms[i];
        const hToAcceptor = {
          x: acceptorAtom.position.x - hAtom.position.x,
          y: acceptorAtom.position.y - hAtom.position.y,
          z: acceptorAtom.position.z - hAtom.position.z,
        };

        const distHA = Math.sqrt(
          hToAcceptor.x * hToAcceptor.x +
          hToAcceptor.y * hToAcceptor.y +
          hToAcceptor.z * hToAcceptor.z
        );

        if (distHA > maxDistance) continue;

        const dot =
          donorToH.x * hToAcceptor.x +
          donorToH.y * hToAcceptor.y +
          donorToH.z * hToAcceptor.z;

        const lenDH = Math.sqrt(
          donorToH.x * donorToH.x +
          donorToH.y * donorToH.y +
          donorToH.z * donorToH.z
        );

        const cosAngle = dot / (lenDH * distHA);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

        if (angle >= minAngle) {
          hBonds.push({
            donor: donorIdx,
            hydrogen: hIdx,
            acceptor: i,
            distance: distHA,
            angle: angle * 180 / Math.PI,
          });
        }
      }
    }

    return hBonds;
  }

  exportTrajectories(format: 'json' | 'csv' = 'json'): string {
    const atomIds = Array.from(this.trajectories.keys());

    if (format === 'csv') {
      const maxLen = Math.max(...Array.from(this.trajectories.values()).map(t => t.length));
      let csv = 'timestamp';
      for (const id of atomIds) {
        csv += `,atom_${id}_x,atom_${id}_y,atom_${id}_z`;
      }
      csv += '\n';

      for (let t = 0; t < maxLen; t++) {
        let timestamp = 0;
        const firstTraj = this.trajectories.get(atomIds[0]);
        if (firstTraj && t < firstTraj.length) {
          timestamp = firstTraj[t].timestamp;
        }
        csv += timestamp.toFixed(4);

        for (const id of atomIds) {
          const traj = this.trajectories.get(id);
          if (traj && t < traj.length) {
            csv += `,${traj[t].position.x.toFixed(4)},${traj[t].position.y.toFixed(4)},${traj[t].position.z.toFixed(4)}`;
          } else {
            csv += ',,,';
          }
        }
        csv += '\n';
      }

      return csv;
    } else {
      const data = {
        simulationTime: this.simulationTime,
        stepCount: this.stepCount,
        atomCount: this.atoms.length,
        atoms: this.atoms.map(a => ({
          id: a.id,
          element: a.element,
          mass: a.mass,
          atomicNumber: a.atomicNumber,
        })),
        trajectories: Object.fromEntries(
          Array.from(this.trajectories.entries()).map(([id, traj]) => [
            id,
            traj.map(p => ({
              t: p.timestamp,
              x: p.position.x,
              y: p.position.y,
              z: p.position.z,
            })),
          ])
        ),
      };
      return JSON.stringify(data, null, 2);
    }
  }
}

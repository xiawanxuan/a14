import { create } from 'zustand';
import type { Molecule } from '../core/MoleculeData';
import { getBuiltinMolecules } from '../core/MoleculeData';

export interface SimulationState {
  molecules: Molecule[];
  currentMoleculeIndex: number;
  isPlaying: boolean;
  speed: number;
  temperature: number;
  showBonds: boolean;
  showForces: boolean;
  showTrajectories: boolean;
  showStars: boolean;
  forceScale: number;
  simulationTime: number;
  stepCount: number;
  kineticEnergy: number;
  potentialEnergy: number;
  atomCount: number;
  bondCount: number;
  autoRotate: boolean;
  resetTrigger: number;
  actualTemperature: number;

  setCurrentMoleculeIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setTemperature: (temp: number) => void;
  setShowBonds: (show: boolean) => void;
  setShowForces: (show: boolean) => void;
  setShowTrajectories: (show: boolean) => void;
  setShowStars: (show: boolean) => void;
  setForceScale: (scale: number) => void;
  setSimulationTime: (time: number) => void;
  setStepCount: (count: number) => void;
  setEnergies: (kinetic: number, potential: number) => void;
  setAtomCount: (count: number) => void;
  setBondCount: (count: number) => void;
  setAutoRotate: (auto: boolean) => void;
  togglePlay: () => void;
  resetSimulation: () => void;
  setActualTemperature: (temp: number) => void;
}

const initialMolecules = getBuiltinMolecules();

export const useSimulationStore = create<SimulationState>((set) => ({
  molecules: initialMolecules,
  currentMoleculeIndex: 0,
  isPlaying: true,
  speed: 1,
  temperature: 1.0,
  showBonds: true,
  showForces: false,
  showTrajectories: false,
  showStars: true,
  forceScale: 0.1,
  simulationTime: 0,
  stepCount: 0,
  kineticEnergy: 0,
  potentialEnergy: 0,
  atomCount: 0,
  bondCount: 0,
  autoRotate: false,
  resetTrigger: 0,
  actualTemperature: 0,

  setCurrentMoleculeIndex: (index: number) => set({ currentMoleculeIndex: index }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setSpeed: (speed: number) => set({ speed: Math.max(0.1, Math.min(10, speed)) }),
  setTemperature: (temp: number) => set({ temperature: Math.max(0.1, Math.min(10, temp)) }),
  setShowBonds: (show: boolean) => set({ showBonds: show }),
  setShowForces: (show: boolean) => set({ showForces: show }),
  setShowTrajectories: (show: boolean) => set({ showTrajectories: show }),
  setShowStars: (show: boolean) => set({ showStars: show }),
  setForceScale: (scale: number) => set({ forceScale: Math.max(0.01, Math.min(1, scale)) }),
  setSimulationTime: (time: number) => set({ simulationTime: time }),
  setStepCount: (count: number) => set({ stepCount: count }),
  setEnergies: (kinetic: number, potential: number) => set({ kineticEnergy: kinetic, potentialEnergy: potential }),
  setAtomCount: (count: number) => set({ atomCount: count }),
  setBondCount: (count: number) => set({ bondCount: count }),
  setAutoRotate: (auto: boolean) => set({ autoRotate: auto }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  resetSimulation: () => set((state) => ({ simulationTime: 0, stepCount: 0, resetTrigger: state.resetTrigger + 1, actualTemperature: 0 })),
  setActualTemperature: (temp: number) => set({ actualTemperature: temp }),
}));

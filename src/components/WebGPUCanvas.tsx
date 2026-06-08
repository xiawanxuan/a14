import { useEffect, useRef, useCallback, useState } from 'react';
import { WebGPURenderer } from '../core/WebGPURenderer';
import { PhysicsEngine } from '../core/PhysicsEngine';
import { InteractionController } from '../core/InteractionController';
import type { Molecule } from '../core/MoleculeData';
import { useSimulationStore } from '../store/simulationStore';

interface WebGPUCanvasProps {
  molecule: Molecule;
}

export default function WebGPUCanvas({ molecule }: WebGPUCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGPURenderer | null>(null);
  const physicsRef = useRef<PhysicsEngine | null>(null);
  const interactionRef = useRef<InteractionController | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);

  const isPlayingRef = useRef(false);
  const speedRef = useRef(1);
  const showForcesRef = useRef(false);
  const showTrajectoriesRef = useRef(false);

  const {
    isPlaying,
    speed,
    temperature,
    showBonds,
    showForces,
    showTrajectories,
    showStars,
    forceScale,
    autoRotate,
    resetTrigger,
    setSimulationTime,
    setStepCount,
    setEnergies,
    setAtomCount,
    setBondCount,
    setActualTemperature,
  } = useSimulationStore();

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { showForcesRef.current = showForces; }, [showForces]);
  useEffect(() => { showTrajectoriesRef.current = showTrajectories; }, [showTrajectories]);

  const loadMolecule = useCallback((mol: Molecule) => {
    if (!physicsRef.current || !rendererRef.current || !interactionRef.current) return;

    physicsRef.current.setMolecule(mol.atoms, mol.bonds);

    const atoms = physicsRef.current.getAtoms();
    const bonds = physicsRef.current.getBonds();
    rendererRef.current.updateAtoms(atoms);
    rendererRef.current.updateBonds(atoms, bonds);

    setAtomCount(atoms.length);
    setBondCount(bonds.length);

    let maxDist = 0;
    for (const atom of atoms) {
      const dist = Math.sqrt(
        atom.position.x * atom.position.x +
        atom.position.y * atom.position.y +
        atom.position.z * atom.position.z
      ) + atom.radius;
      if (dist > maxDist) maxDist = dist;
    }
    if (maxDist > 0) {
      interactionRef.current.fitView(Math.max(maxDist, 2));
    }
  }, [setAtomCount, setBondCount]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      if (!canvasRef.current) return;

      const renderer = new WebGPURenderer(canvasRef.current);
      const success = await renderer.init();
      if (!success) {
        console.error('Failed to initialize WebGPU');
        return;
      }

      const physics = new PhysicsEngine();
      const interaction = new InteractionController(canvasRef.current);

      renderer.setOptions({
        showBonds,
        showForces,
        showTrajectories,
        showStars,
        forceScale,
      });

      interaction.setConfig({ autoRotate });

      rendererRef.current = renderer;
      physicsRef.current = physics;
      interactionRef.current = interaction;

      loadMolecule(molecule);

      const handleResize = () => {
        renderer.resize();
      };
      window.addEventListener('resize', handleResize);

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
      };

      setIsReady(true);
    };

    init();

    return () => {
      if (cleanup) cleanup();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
      if (interactionRef.current) {
        interactionRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isReady && physicsRef.current) {
      loadMolecule(molecule);
    }
  }, [molecule, isReady, loadMolecule]);

  useEffect(() => {
    if (physicsRef.current) {
      physicsRef.current.setConfig({ temperature });
    }
  }, [temperature]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setOptions({
        showBonds,
        showForces,
        showTrajectories,
        showStars,
        forceScale,
      });
    }
  }, [showBonds, showForces, showTrajectories, showStars, forceScale]);

  useEffect(() => {
    if (interactionRef.current) {
      interactionRef.current.setConfig({ autoRotate });
    }
  }, [autoRotate]);

  useEffect(() => {
    if (!isReady || !physicsRef.current || !rendererRef.current) return;

    physicsRef.current.reset();
    const atoms = physicsRef.current.getAtoms();
    const bonds = physicsRef.current.getBonds();
    rendererRef.current.updateAtoms(atoms);
    rendererRef.current.updateBonds(atoms, bonds);

    setSimulationTime(0);
    setStepCount(0);
    setEnergies(0, 0);
  }, [resetTrigger, isReady, setSimulationTime, setStepCount, setEnergies]);

  useEffect(() => {
    if (!isReady) return;
    if (!rendererRef.current || !physicsRef.current || !interactionRef.current) return;

    let lastUpdateTime = 0;

    const animate = (time: number) => {
      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      if (rendererRef.current && physicsRef.current && interactionRef.current) {
        if (isPlayingRef.current) {
          const steps = Math.max(1, Math.floor(speedRef.current * 2));
          for (let i = 0; i < steps; i++) {
            physicsRef.current.step(1);
          }
        }

        const atoms = physicsRef.current.getAtoms();
        const bonds = physicsRef.current.getBonds();
        rendererRef.current.updateAtoms(atoms);
        rendererRef.current.updateBonds(atoms, bonds);

        if (showForcesRef.current) {
          const forcePairs = physicsRef.current.getForcePairs();
          rendererRef.current.updateForces(forcePairs, atoms);
        }

        if (showTrajectoriesRef.current) {
          const trajectories = new Map<number, { position: { x: number; y: number; z: number }; timestamp: number }[]>();
          for (const atom of atoms) {
            const traj = physicsRef.current.getTrajectory(atom.id);
            if (traj.length > 0) {
              trajectories.set(atom.id, traj);
            }
          }
          rendererRef.current.updateTrajectories(trajectories);
        }

        interactionRef.current.update(deltaTime);

        const camera = interactionRef.current.getCamera();
        rendererRef.current.render(camera);

        if (isPlayingRef.current && time - lastUpdateTime > 50) {
          lastUpdateTime = time;
          setSimulationTime(physicsRef.current.getSimulationTime());
          setStepCount(physicsRef.current.getStepCount());
          setEnergies(
            physicsRef.current.getKineticEnergy(),
            physicsRef.current.getPotentialEnergy()
          );
          setActualTemperature(physicsRef.current.getTemperature());
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReady, setSimulationTime, setStepCount, setEnergies, setActualTemperature]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
    />
  );
}

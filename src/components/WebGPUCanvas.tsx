import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { WebGPURenderer } from '../core/WebGPURenderer';
import { PhysicsEngine } from '../core/PhysicsEngine';
import { InteractionController } from '../core/InteractionController';
import type { Molecule, Atom } from '../core/MoleculeData';
import { useSimulationStore } from '../store/simulationStore';

interface WebGPUCanvasProps {
  molecule: Molecule;
}

export interface WebGPUCanvasHandle {
  exportTrajectories: (format: 'json' | 'csv') => string;
  getPhysicsEngine: () => PhysicsEngine | null;
}

const WebGPUCanvas = forwardRef<WebGPUCanvasHandle, WebGPUCanvasProps>(function WebGPUCanvas({ molecule }, ref) {
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
  const showHydrogenBondsRef = useRef(false);
  const atomsRef = useRef<Atom[]>([]);

  const {
    isPlaying,
    speed,
    temperature,
    showBonds,
    showForces,
    showTrajectories,
    showStars,
    showHydrogenBonds,
    forceScale,
    autoRotate,
    resetTrigger,
    setSimulationTime,
    setStepCount,
    setEnergies,
    setAtomCount,
    setBondCount,
    setHydrogenBondCount,
    setActualTemperature,
    setSelectedAtom,
  } = useSimulationStore();

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { showForcesRef.current = showForces; }, [showForces]);
  useEffect(() => { showTrajectoriesRef.current = showTrajectories; }, [showTrajectories]);
  useEffect(() => { showHydrogenBondsRef.current = showHydrogenBonds; }, [showHydrogenBonds]);

  useImperativeHandle(ref, () => ({
    exportTrajectories: (format: 'json' | 'csv') => {
      if (!physicsRef.current) return '';
      return physicsRef.current.exportTrajectories(format);
    },
    getPhysicsEngine: () => physicsRef.current,
  }));

  const loadMolecule = useCallback((mol: Molecule) => {
    if (!physicsRef.current || !rendererRef.current || !interactionRef.current) return;

    physicsRef.current.setMolecule(mol.atoms, mol.bonds);

    const atoms = physicsRef.current.getAtoms();
    const bonds = physicsRef.current.getBonds();
    atomsRef.current = atoms;
    rendererRef.current.updateAtoms(atoms);
    rendererRef.current.updateBonds(atoms, bonds);

    setAtomCount(atoms.length);
    setBondCount(bonds.length);
    setHydrogenBondCount(0);

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
  }, [setAtomCount, setBondCount, setHydrogenBondCount]);

  const handleCanvasClick = useCallback((e: MouseEvent) => {
    if (!rendererRef.current || !interactionRef.current || !physicsRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;

    const atoms = physicsRef.current.getAtoms();
    const camera = interactionRef.current.getCamera();
    const result = rendererRef.current.raycastAtom(x, y, atoms, camera);

    if (result) {
      setSelectedAtom({ ...result.atom });
    } else {
      setSelectedAtom(null);
    }
  }, [setSelectedAtom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handler = (e: MouseEvent) => handleCanvasClick(e);
    canvas.addEventListener('click', handler);
    return () => canvas.removeEventListener('click', handler);
  }, [handleCanvasClick]);

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
        showHydrogenBonds,
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
        showHydrogenBonds,
        forceScale,
      });
    }
  }, [showBonds, showForces, showTrajectories, showStars, showHydrogenBonds, forceScale]);

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

        if (showHydrogenBondsRef.current) {
          const hBonds = physicsRef.current.getHydrogenBonds();
          rendererRef.current.updateHydrogenBonds(hBonds, atoms);
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
          if (showHydrogenBondsRef.current) {
            setHydrogenBondCount(physicsRef.current.getHydrogenBonds().length);
          }
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
      style={{ touchAction: 'none', cursor: 'pointer' }}
    />
  );
});

export default WebGPUCanvas;

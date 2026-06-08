import { useEffect, useState } from 'react';
import WebGPUCanvas from '@/components/WebGPUCanvas';
import ControlPanel from '@/components/ControlPanel';
import InfoPanel from '@/components/InfoPanel';
import Timeline from '@/components/Timeline';
import { useSimulationStore } from '@/store/simulationStore';
import { AlertTriangle } from 'lucide-react';

export default function Home() {
  const { molecules, currentMoleculeIndex } = useSimulationStore();
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      if (!navigator.gpu) {
        setWebgpuSupported(false);
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        setWebgpuSupported(!!adapter);
      } catch {
        setWebgpuSupported(false);
      }
    };
    checkSupport();
  }, []);

  const currentMolecule = molecules[currentMoleculeIndex];

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      {webgpuSupported === false && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50">
          <div className="text-center p-8 bg-slate-900/90 rounded-2xl border border-red-500/30 max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">
              WebGPU 不受支持
            </h2>
            <p className="text-slate-400 mb-4">
              您的浏览器不支持 WebGPU API。
              请使用最新版本的 Chrome、Edge 或 Safari 浏览器。
            </p>
            <p className="text-slate-500 text-sm">
              请确保您的浏览器支持 WebGPU，
              并启用了硬件加速功能。
            </p>
          </div>
        </div>
      )}

      {webgpuSupported === true && (
        <>
          <div className="absolute inset-0">
            <WebGPUCanvas molecule={currentMolecule} />
          </div>

          <ControlPanel />
          <InfoPanel />
          <Timeline />

          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-slate-600 text-xs pointer-events-none">
            拖拽旋转 · 滚轮缩放 · 右键平移
          </div>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-widest">
              分子动力学可视化系统
            </h1>
            <p className="text-center text-slate-500 text-xs mt-1">
              Molecular Dynamics Visualization
            </p>
          </div>
        </>
      )}

      {webgpuSupported === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <div className="text-cyan-400 animate-pulse">
            正在初始化 WebGPU...
          </div>
        </div>
      )}
    </div>
  );
}

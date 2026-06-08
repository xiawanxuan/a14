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
            <h2 className="text-2xl font-bold text-red-400 mb-3">
              WebGPU 不受支持
            </h2>
            <div className="text-slate-400 text-sm mb-4 space-y-2">
              <p>
                <span className="text-cyan-400 font-medium">本系统采用 WebGPU 技术</span>
                （而非 WebGL），提供更高性能的 3D 渲染。
              </p>
              <p>您的浏览器不支持 WebGPU API，请使用以下浏览器：</p>
              <ul className="text-left text-slate-500 text-xs mt-2 space-y-1 pl-4 list-disc">
                <li>Chrome 113+ 或 Edge 113+（推荐）</li>
                <li>Safari 17+（macOS Sonoma 及以上）</li>
                <li>Firefox 121+</li>
              </ul>
            </div>
            <div className="pt-3 border-t border-slate-700/50">
              <p className="text-slate-500 text-xs">
                请确保浏览器已启用硬件加速，并更新到最新版本。
              </p>
            </div>
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

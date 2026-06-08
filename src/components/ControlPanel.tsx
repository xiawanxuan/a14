import { Play, Pause, Settings, ChevronLeft, ChevronRight, Download, Droplets } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { useState } from 'react';
import { clsx } from 'clsx';

interface ControlPanelProps {
  onExportTrajectories?: (format: 'json' | 'csv') => void;
}

export default function ControlPanel({ onExportTrajectories }: ControlPanelProps) {
  const {
    molecules,
    currentMoleculeIndex,
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
    setCurrentMoleculeIndex,
    setSpeed,
    setTemperature,
    setShowBonds,
    setShowForces,
    setShowTrajectories,
    setShowStars,
    setShowHydrogenBonds,
    setForceScale,
    setAutoRotate,
    togglePlay,
  } = useSimulationStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div
      className={clsx(
        'absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300',
        isCollapsed ? 'translate-x-[-280px]' : 'translate-x-0'
      )}
    >
      <div className="w-64 bg-slate-900/70 backdrop-blur-md rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 overflow-hidden">
        <div className="p-4 border-b border-cyan-500/20">
          <h2 className="text-cyan-400 font-bold text-lg tracking-wider">
            分子动力可视化
          </h2>
          <p className="text-slate-400 text-xs mt-1">Molecular Dynamics</p>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              分子模型
            </label>
            <select
              value={currentMoleculeIndex}
              onChange={(e) => setCurrentMoleculeIndex(Number(e.target.value))}
              className="w-full bg-slate-800/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 cursor-pointer"
            >
              {molecules.map((mol, idx) => (
                <option key={idx} value={idx}>
                  {mol.name}
                </option>
              ))}
            </select>
            <p className="text-cyan-400/70 text-xs mt-1 font-mono">
              {molecules[currentMoleculeIndex]?.formula}
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={togglePlay}
              className={clsx(
                'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg',
                isPlaying
                  ? 'bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 shadow-pink-500/30'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30'
              )}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 text-sm">播放速度</label>
              <span className="text-cyan-400 text-sm font-mono">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 text-sm">温度</label>
              <span className="text-orange-400 text-sm font-mono">{temperature.toFixed(1)} T</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-orange-500 rounded-full appearance-none cursor-pointer slider"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              高级设置
              <ChevronRight
                className={clsx('w-4 h-4 transition-transform', showSettings && 'rotate-90')}
              />
            </button>
          </div>

          {showSettings && (
            <div className="space-y-3 pt-3 border-t border-slate-700/50">
              <ToggleOption
                label="显示化学键"
                checked={showBonds}
                onChange={setShowBonds}
              />
              <ToggleOption
                label="显示氢键"
                checked={showHydrogenBonds}
                onChange={setShowHydrogenBonds}
                icon={<Droplets className="w-3.5 h-3.5" />}
              />
              <ToggleOption
                label="显示作用力"
                checked={showForces}
                onChange={setShowForces}
              />
              <ToggleOption
                label="显示运动轨迹"
                checked={showTrajectories}
                onChange={setShowTrajectories}
              />
              <ToggleOption
                label="星空背景"
                checked={showStars}
                onChange={setShowStars}
              />
              <ToggleOption
                label="自动旋转"
                checked={autoRotate}
                onChange={setAutoRotate}
              />

              {showForces && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-400 text-xs">作用力线条长度</label>
                    <span className="text-cyan-400 text-xs font-mono">
                      {forceScale.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={forceScale}
                    onChange={(e) => setForceScale(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer slider"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-700/50">
                <div className="text-slate-400 text-xs mb-2 flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" />
                  导出运动轨迹
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onExportTrajectories?.('json')}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors border border-slate-600/30"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => onExportTrajectories?.('csv')}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors border border-slate-600/30"
                  >
                    CSV
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-16 bg-slate-900/70 backdrop-blur-md border border-cyan-500/20 rounded-r-lg flex items-center justify-center text-cyan-400 hover:bg-slate-800/80 transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ReactNode;
}

function ToggleOption({ label, checked, onChange, icon }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-sm flex items-center gap-1.5">
        {icon && <span className="text-cyan-400/70">{icon}</span>}
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'w-10 h-5 rounded-full transition-all duration-200 relative',
          checked ? 'bg-cyan-500' : 'bg-slate-700'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200',
            checked ? 'left-5' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

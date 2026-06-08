import { Play, Pause, SkipBack, SkipForward, Gauge } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { clsx } from 'clsx';

export default function Timeline() {
  const {
    isPlaying,
    speed,
    simulationTime,
    stepCount,
    togglePlay,
    setSpeed,
    resetSimulation,
  } = useSimulationStore();

  const maxTime = 100;
  const progress = (simulationTime % maxTime) / maxTime;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-2xl">
      <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => resetSimulation()}
            className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
            title="重置"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg',
              isPlaying
                ? 'bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 shadow-pink-500/30'
                : 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30'
            )}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {}}
            className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
            title="快进"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 font-mono">
                t = {simulationTime.toFixed(2)} ps
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Step: {stepCount.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-cyan-500/50"
                style={{ left: `calc(${progress * 100}% - 8px)` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-3">
          <Gauge className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500 whitespace-nowrap">速度</span>
          <div className="flex-1 flex items-center gap-2">
            {[0.5, 1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={clsx(
                  'flex-1 py-1 text-xs font-mono rounded-md transition-all',
                  speed === s
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                )}
              >
                {s}x
              </button>
            ))}
          </div>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-20 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer slider"
          />
        </div>
      </div>
    </div>
  );
}

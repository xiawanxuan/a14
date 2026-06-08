import { Atom, Zap, Clock, Activity, Thermometer, Droplets } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

export default function InfoPanel() {
  const {
    simulationTime,
    stepCount,
    kineticEnergy,
    potentialEnergy,
    atomCount,
    bondCount,
    hydrogenBondCount,
    showHydrogenBonds,
    actualTemperature,
  } = useSimulationStore();

  const totalEnergy = kineticEnergy + potentialEnergy;

  return (
    <div className="absolute right-4 top-4 z-10 w-56">
      <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 overflow-hidden">
        <div className="p-3 border-b border-cyan-500/20">
          <h3 className="text-cyan-400 font-semibold text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            模拟状态
          </h3>
        </div>

        <div className="p-3 space-y-3">
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label="模拟时间"
            value={`${simulationTime.toFixed(2)} ps`}
            color="text-cyan-400"
          />

          <InfoRow
            icon={<Atom className="w-4 h-4" />}
            label="原子数量"
            value={atomCount.toString()}
            color="text-emerald-400"
          />

          <InfoRow
            icon={<Zap className="w-4 h-4" />}
            label="化学键"
            value={bondCount.toString()}
            color="text-amber-400"
          />

          {showHydrogenBonds && (
            <InfoRow
              icon={<Droplets className="w-4 h-4" />}
              label="氢键"
              value={hydrogenBondCount.toString()}
              color="text-cyan-300"
            />
          )}

          <InfoRow
            icon={<Thermometer className="w-4 h-4" />}
            label="系统温度"
            value={`${actualTemperature.toFixed(2)} T`}
            color="text-orange-400"
          />

          <div className="pt-2 border-t border-slate-700/50 space-y-2">
            <EnergyBar
              label="动能"
              value={kineticEnergy}
              total={totalEnergy || 1}
              color="from-cyan-500 to-blue-500"
            />
            <EnergyBar
              label="势能"
              value={Math.abs(potentialEnergy)}
              total={totalEnergy || 1}
              color="from-pink-500 to-rose-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-700/50">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">步数</span>
              <span className="text-slate-300 text-xs font-mono">
                {stepCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function InfoRow({ icon, label, value, color }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-400">
        <span className={color}>{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-sm font-mono font-medium ${color}`}>
        {value}
      </span>
    </div>
  );
}

interface EnergyBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function EnergyBar({ label, value, total, color }: EnergyBarProps) {
  const percentage = Math.min(100, (value / total) * 100);

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-500 text-xs">{label}</span>
        <span className="text-slate-400 text-xs font-mono">
          {value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

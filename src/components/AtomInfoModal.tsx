import { X, Atom, Zap, Hash, Gauge, Move } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { getElementProperties } from '../core/MoleculeData';

export default function AtomInfoModal() {
  const { selectedAtom, setSelectedAtom } = useSimulationStore();

  if (!selectedAtom) return null;

  const props = getElementProperties(selectedAtom.element);
  const velocityMagnitude = Math.sqrt(
    selectedAtom.velocity.x ** 2 +
    selectedAtom.velocity.y ** 2 +
    selectedAtom.velocity.z ** 2
  );

  const kineticEnergy = 0.5 * selectedAtom.mass * velocityMagnitude ** 2;

  const elementNames: Record<string, string> = {
    H: '氢 (Hydrogen)',
    He: '氦 (Helium)',
    Li: '锂 (Lithium)',
    Be: '铍 (Beryllium)',
    B: '硼 (Boron)',
    C: '碳 (Carbon)',
    N: '氮 (Nitrogen)',
    O: '氧 (Oxygen)',
    F: '氟 (Fluorine)',
    Ne: '氖 (Neon)',
    Na: '钠 (Sodium)',
    Mg: '镁 (Magnesium)',
    Al: '铝 (Aluminum)',
    Si: '硅 (Silicon)',
    P: '磷 (Phosphorus)',
    S: '硫 (Sulfur)',
    Cl: '氯 (Chlorine)',
    Ar: '氩 (Argon)',
    K: '钾 (Potassium)',
    Ca: '钙 (Calcium)',
    Fe: '铁 (Iron)',
    Cu: '铜 (Copper)',
    Zn: '锌 (Zinc)',
    Br: '溴 (Bromine)',
    I: '碘 (Iodine)',
  };

  const elementName = elementNames[selectedAtom.element] || selectedAtom.element;

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80">
      <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
              style={{
                backgroundColor: `rgb(${selectedAtom.color.x * 255}, ${selectedAtom.color.y * 255}, ${selectedAtom.color.z * 255})`,
                color: (selectedAtom.color.x * 0.299 + selectedAtom.color.y * 0.587 + selectedAtom.color.z * 0.114) > 0.5 ? '#1e293b' : '#fff',
                boxShadow: `0 0 20px rgba(${selectedAtom.color.x * 255}, ${selectedAtom.color.y * 255}, ${selectedAtom.color.z * 255}, 0.4)`,
              }}
            >
              {selectedAtom.element}
            </div>
            <div>
              <h3 className="text-cyan-300 font-bold text-lg">{elementName}</h3>
              <p className="text-slate-500 text-xs">ID: {selectedAtom.id}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedAtom(null)}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={<Hash className="w-4 h-4" />}
              label="原子序数"
              value={selectedAtom.atomicNumber ? selectedAtom.atomicNumber.toString() : '-'}
              color="text-purple-400"
            />
            <InfoCard
              icon={<Atom className="w-4 h-4" />}
              label="原子质量"
              value={`${selectedAtom.mass.toFixed(3)} u`}
              color="text-emerald-400"
            />
            <InfoCard
              icon={<Gauge className="w-4 h-4" />}
              label="原子半径"
              value={`${selectedAtom.radius.toFixed(3)} Å`}
              color="text-amber-400"
            />
            <InfoCard
              icon={<Zap className="w-4 h-4" />}
              label="动能"
              value={`${kineticEnergy.toFixed(3)} J`}
              color="text-rose-400"
            />
          </div>

          <div className="pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Move className="w-4 h-4" />
              <span className="text-xs">速度矢量</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <VelocityComponent label="X" value={selectedAtom.velocity.x} color="text-red-400" />
              <VelocityComponent label="Y" value={selectedAtom.velocity.y} color="text-green-400" />
              <VelocityComponent label="Z" value={selectedAtom.velocity.z} color="text-blue-400" />
            </div>
            <div className="mt-2 text-center">
              <span className="text-slate-500 text-xs">速度大小: </span>
              <span className="text-cyan-400 font-mono text-sm">{velocityMagnitude.toFixed(3)} Å/ps</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700/50">
            <div className="text-slate-400 text-xs mb-2">位置坐标</div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-slate-800/50 rounded px-2 py-1 text-center">
                <span className="text-red-400/70">X:</span>{' '}
                <span className="text-slate-300">{selectedAtom.position.x.toFixed(3)}</span>
              </div>
              <div className="bg-slate-800/50 rounded px-2 py-1 text-center">
                <span className="text-green-400/70">Y:</span>{' '}
                <span className="text-slate-300">{selectedAtom.position.y.toFixed(3)}</span>
              </div>
              <div className="bg-slate-800/50 rounded px-2 py-1 text-center">
                <span className="text-blue-400/70">Z:</span>{' '}
                <span className="text-slate-300">{selectedAtom.position.z.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function InfoCard({ icon, label, value, color }: InfoCardProps) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-slate-200 font-mono text-sm font-medium">{value}</div>
    </div>
  );
}

interface VelocityComponentProps {
  label: string;
  value: number;
  color: string;
}

function VelocityComponent({ label, value, color }: VelocityComponentProps) {
  return (
    <div className="bg-slate-800/40 rounded-lg px-2 py-1.5 text-center">
      <span className={`${color} font-medium`}>{label}</span>
      <span className="text-slate-400 text-xs">: </span>
      <span className="text-slate-300 font-mono">{value.toFixed(3)}</span>
    </div>
  );
}

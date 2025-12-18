import { useEffect, useState } from 'react';

export default function SoloModeConfig({ initialConfig = {}, onChange, onStart, disabled = false }) {
  const [config, setConfig] = useState({
    maxPlayers: initialConfig.maxPlayers ?? 4,
    difficulty: initialConfig.difficulty ?? 'medium',
    rounds: initialConfig.rounds ?? 5,
    timePerGuess: initialConfig.timePerGuess ?? 60,
    allowHints: initialConfig.allowHints ?? true,
  });

  useEffect(() => {
    onChange?.(config);
  }, [config, onChange]);

  const updateField = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-transparent p-8" style={{ backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-blue-600">Solo Mode</p>
          <h2 className="text-3xl font-black text-slate-800">Game Configuration</h2>
          <p className="text-slate-500 font-medium">Adjust rules before starting.</p>
        </div>
        <div className="text-4xl">⚙️</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Max players</label>
          <input
            type="number"
            min={1}
            max={12}
            value={config.maxPlayers}
            onChange={(e) => updateField('maxPlayers', Math.max(1, Math.min(12, Number(e.target.value))))}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none shadow-sm"
            disabled={disabled}
          />
          <p className="text-xs text-slate-500">Limit the number of participants (1-12).</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Word difficulty</label>
          <select
            value={config.difficulty}
            onChange={(e) => updateField('difficulty', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none shadow-sm bg-white"
            disabled={disabled}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <p className="text-xs text-slate-500">Choose word complexity for prompts.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Number of rounds</label>
          <input
            type="range"
            min={1}
            max={10}
            value={config.rounds}
            onChange={(e) => updateField('rounds', Number(e.target.value))}
            className="w-full accent-purple-600"
            disabled={disabled}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>1</span>
            <span className="font-semibold text-slate-700">{config.rounds} rounds</span>
            <span>10</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Time per guess (seconds)</label>
          <input
            type="number"
            min={10}
            max={180}
            step={5}
            value={config.timePerGuess}
            onChange={(e) => updateField('timePerGuess', Math.max(10, Math.min(180, Number(e.target.value))))}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none shadow-sm"
            disabled={disabled}
          />
          <p className="text-xs text-slate-500">Set the timer for each guess (10-180 seconds).</p>
        </div>

        <div className="space-y-3 md:col-span-2">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={config.allowHints}
              onChange={(e) => updateField('allowHints', e.target.checked)}
              className="w-5 h-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-blue-500"
              disabled={disabled}
            />
            Allow hints when stuck
          </label>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">Hints</span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Balanced difficulty</span>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">Timer control</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={() => setConfig({ maxPlayers: 4, difficulty: 'medium', rounds: 5, timePerGuess: 60, allowHints: true })}
          className="px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:border-blue-400 hover:bg-blue-50 transition-all"
          disabled={disabled}
        >
          Reset
        </button>
        <button
          onClick={() => onStart?.(config)}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          disabled={disabled}
        >
          Start Solo Game
        </button>
      </div>
    </div>
  );
}
{/* <SoloModeConfig
  initialConfig={{ maxPlayers: 4, difficulty: 'easy', rounds: 5, timePerGuess: 60 }}
  onChange={(cfg) => console.log(cfg)}
  onStart={(cfg) => console.log('start solo', cfg)}
/> */}
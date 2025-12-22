import { useEffect, useState } from 'react';

export default function SoloModeConfig({ initialConfig = {}, onChange, onStart, disabled = false, shareLink, onCopyLink }) {
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
    <div className="w-full max-w-3xl mx-auto bg-slate-800/60 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-slate-700 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-cyan-400">Solo Mode</p>
          <h2 className="text-3xl font-black text-slate-100">Game Configuration</h2>
          <p className="text-slate-300 font-medium">Adjust rules before starting.</p>
        </div>
        <div className="text-4xl">⚙️</div>
      </div>

      {shareLink && (
        <div className="mb-6 p-4 rounded-2xl border-2 border-cyan-500/30 bg-slate-900/40">
          <div className="text-sm font-semibold text-slate-200 mb-2">Room link (share to play together)</div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-900/50 text-slate-100 focus:border-cyan-500 outline-none shadow-sm"
              value={shareLink}
              readOnly
            />
            <button
              onClick={onCopyLink}
              className="px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-60"
              disabled={disabled}
            >
              Copy link
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Share this link to play solo mode together in the same room.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200">Max players</label>
          <input
            type="number"
            min={1}
            max={12}
            value={config.maxPlayers}
            onChange={(e) => updateField('maxPlayers', Math.max(1, Math.min(12, Number(e.target.value))))}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-900/50 text-slate-100 focus:border-cyan-500 outline-none shadow-sm"
            disabled={disabled}
          />
          <p className="text-xs text-slate-400">Limit the number of participants (1-12).</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200">Word difficulty</label>
          <select
            value={config.difficulty}
            onChange={(e) => updateField('difficulty', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-900/50 text-slate-100 focus:border-cyan-500 outline-none shadow-sm"
            disabled={disabled}
          >
            <option value="easy" className="bg-slate-800">Easy</option>
            <option value="medium" className="bg-slate-800">Medium</option>
            <option value="hard" className="bg-slate-800">Hard</option>
          </select>
          <p className="text-xs text-slate-400">Choose word complexity for prompts.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200">Number of rounds</label>
          <input
            type="range"
            min={1}
            max={10}
            value={config.rounds}
            onChange={(e) => updateField('rounds', Number(e.target.value))}
            className="w-full accent-cyan-500"
            disabled={disabled}
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>1</span>
            <span className="font-bold text-slate-100 text-sm">{config.rounds} rounds</span>
            <span>10</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200">Time per guess (seconds)</label>
          <input
            type="number"
            min={10}
            max={180}
            step={5}
            value={config.timePerGuess}
            onChange={(e) => updateField('timePerGuess', Math.max(10, Math.min(180, Number(e.target.value))))}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-900/50 text-slate-100 focus:border-cyan-500 outline-none shadow-sm"
            disabled={disabled}
          />
          <p className="text-xs text-slate-400">Set the timer for each guess (10-180 seconds).</p>
        </div>

        <div className="space-y-3 md:col-span-2">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-200">
            <input
              type="checkbox"
              checked={config.allowHints}
              onChange={(e) => updateField('allowHints', e.target.checked)}
              className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900/50 text-cyan-500 focus:ring-cyan-500"
              disabled={disabled}
            />
            Allow hints when stuck
          </label>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-semibold">Hints</span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-semibold">Balanced difficulty</span>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold">Timer control</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={() => setConfig({ maxPlayers: 4, difficulty: 'medium', rounds: 5, timePerGuess: 60, allowHints: true })}
          className="px-5 py-3 rounded-xl border-2 border-slate-600 text-slate-200 font-semibold hover:border-cyan-400 hover:bg-slate-700 transition-all"
          disabled={disabled}
        >
          Reset
        </button>
        <button
          onClick={() => onStart?.(config)}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
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
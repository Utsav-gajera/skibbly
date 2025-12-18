import { useEffect, useState } from 'react';

export default function TeamModeConfig({ initialConfig = {}, onChange, onStart, disabled = false, shareLink, onCopyLink, onJoinRoom }) {
  const [config, setConfig] = useState({
    playersPerTeam: initialConfig.playersPerTeam ?? 4,
    difficulty: initialConfig.difficulty ?? 'medium',
    rounds: initialConfig.rounds ?? 6,
    timePerGuess: initialConfig.timePerGuess ?? 60,
  });

  useEffect(() => {
    onChange?.(config);
  }, [config, onChange]);

  const updateField = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="w-full max-w-3xl mx-auto bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-transparent p-8"
      style={{
        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Team Mode</p>
          <h2 className="text-3xl font-black text-slate-800">Game Configuration</h2>
          <p className="text-slate-500 font-medium">Tune team rules before starting.</p>
        </div>
        <div className="text-4xl">🤝</div>
      </div>

      {shareLink && (
        <div className="mb-6 p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/60">
          <div className="text-sm font-semibold text-slate-700 mb-2">Room link (share with teammates)</div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none shadow-sm"
              value={shareLink}
              readOnly
            />
            <button
              onClick={onCopyLink}
              className="px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-60"
              disabled={disabled}
            >
              Copy link
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mt-2">
            <p className="text-xs text-slate-500">Anyone opening this link joins your room. You can join first or start after sharing.</p>
            <button
              onClick={onJoinRoom}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm disabled:opacity-60"
              disabled={disabled}
            >
              Join room now
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Players per team</label>
          <input
            type="number"
            min={2}
            max={8}
            value={config.playersPerTeam}
            onChange={(e) => updateField('playersPerTeam', Math.max(2, Math.min(8, Number(e.target.value))))}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none shadow-sm"
            disabled={disabled}
          />
          <p className="text-xs text-slate-500">Set team size (2-8 players).</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Word difficulty</label>
          <select
            value={config.difficulty}
            onChange={(e) => updateField('difficulty', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none shadow-sm bg-white"
            disabled={disabled}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <p className="text-xs text-slate-500">Choose complexity for team prompts.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Number of rounds</label>
          <input
            type="range"
            min={1}
            max={12}
            value={config.rounds}
            onChange={(e) => updateField('rounds', Number(e.target.value))}
            className="w-full accent-indigo-600"
            disabled={disabled}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>1</span>
            <span className="font-semibold text-slate-700">{config.rounds} rounds</span>
            <span>12</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Time per guess (seconds)</label>
          <input
            type="number"
            min={10}
            max={240}
            step={5}
            value={config.timePerGuess}
            onChange={(e) => updateField('timePerGuess', Math.max(10, Math.min(240, Number(e.target.value))))}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none shadow-sm"
            disabled={disabled}
          />
          <p className="text-xs text-slate-500">Timer for each guess (10-240 seconds).</p>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={() => setConfig({ playersPerTeam: 4, difficulty: 'medium', rounds: 6, timePerGuess: 60 })}
          className="px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:border-indigo-400 hover:bg-indigo-50 transition-all"
          disabled={disabled}
        >
          Reset
        </button>
        <button
          onClick={() => onStart?.(config)}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          disabled={disabled}
        >
          Start Team Game
        </button>
      </div>
    </div>
  );
}
{/* <TeamModeConfig
  initialConfig={{ playersPerTeam: 4, difficulty: 'easy', rounds: 8, timePerGuess: 90 }}
  onChange={(cfg) => console.log('team cfg', cfg)}
  onStart={(cfg) => console.log('start team', cfg)}
/> */}
import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../utils/constants';

const ConfigField = ({ label, children, hint }) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-slate-200">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

export default function TeamModeConfig({ initialConfig = {}, onChange, onStart, disabled = false, shareLink, onCopyLink, onJoinRoom, errorMessage }) {
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG.TEAM, ...initialConfig });

  useEffect(() => onChange?.(config), [config, onChange]);

  const updateField = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-800/60 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-slate-700 p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-cyan-400">Team Mode</p>
          <h2 className="text-3xl font-black text-slate-100">Game Configuration</h2>
          <p className="text-slate-300 font-medium">Tune team rules before starting.</p>
        </div>
        <div className="text-4xl">🤝</div>
      </div>

      {shareLink && (
        <div className="mb-6 p-4 rounded-2xl border-2 border-cyan-500/30 bg-slate-900/40">
          <div className="text-sm font-semibold text-slate-200 mb-2">Room link (share with teammates)</div>
          <div className="flex flex-col md:flex-row gap-2">
            <input className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-900/50 text-slate-100 focus:border-cyan-500 outline-none shadow-sm" value={shareLink} readOnly />
            <button onClick={onCopyLink} className="px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-60" disabled={disabled}>Copy link</button>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mt-2">
            <p className="text-xs text-slate-400">Anyone opening this link joins your room. You can join first or start after sharing.</p>
            <button onClick={onJoinRoom} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-700 text-cyan-200 border border-slate-600 hover:border-cyan-400 hover:bg-slate-600 transition-all shadow-sm disabled:opacity-60" disabled={disabled}>Join room now</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <ConfigField label="Players per team" hint="Set team size (2-8 players).">
          <input type="number" min={2} max={8} value={config.playersPerTeam} onChange={(e) => updateField('playersPerTeam', Math.max(2, Math.min(8, Number(e.target.value))))} className="w-full px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-900/50 text-slate-100 focus:border-cyan-500 outline-none shadow-sm" disabled={disabled} />
        </ConfigField>

        <ConfigField label="Word difficulty" hint="Choose complexity for team prompts.">
          <select value={config.difficulty} onChange={(e) => updateField('difficulty', e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-900/50 text-slate-100 focus:border-cyan-500 outline-none shadow-sm" disabled={disabled}>
            {['easy', 'medium', 'hard'].map(d => <option key={d} value={d} className="bg-slate-800">{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </ConfigField>

        <ConfigField label="Number of rounds">
          <input type="range" min={1} max={12} value={config.rounds} onChange={(e) => updateField('rounds', Number(e.target.value))} className="w-full accent-cyan-500" disabled={disabled} />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>1</span>
            <span className="font-bold text-slate-100 text-sm">{config.rounds} rounds</span>
            <span>12</span>
          </div>
        </ConfigField>

        <ConfigField label="Time per guess (seconds)" hint="Timer for each guess (10-240 seconds).">
          <input type="number" min={10} max={240} step={5} value={config.timePerGuess} onChange={(e) => updateField('timePerGuess', Math.max(10, Math.min(240, Number(e.target.value))))} className="w-full px-4 py-3 rounded-xl border-2 border-slate-600 bg-slate-900/50 text-slate-100 focus:border-cyan-500 outline-none shadow-sm" disabled={disabled} />
        </ConfigField>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button onClick={() => setConfig(DEFAULT_CONFIG.TEAM)} className="px-5 py-3 rounded-xl border-2 border-slate-600 text-slate-200 font-semibold hover:border-cyan-400 hover:bg-slate-700 transition-all" disabled={disabled}>Reset</button>
        <button onClick={() => onStart?.(config)} className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all" disabled={disabled}>Start Team Game</button>
      </div>
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
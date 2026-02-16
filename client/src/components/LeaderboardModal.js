import Modal from './Modal';

export default function LeaderboardModal({ isOpen, players, onClose }) {
  const safePlayers = Array.isArray(players) ? players : [];
  const normalized = safePlayers.map((player, index) => ({
    id: player?.id ?? `player-${index}`,
    name: player?.name ?? `Player ${index + 1}`,
    score: Number.isFinite(player?.score) ? player.score : 0
  }));
  const sorted = [...normalized].sort((a, b) => b.score - a.score);
  const podium = sorted.slice(0, 3);
  const others = sorted.slice(3);

  const podiumSlots = [
    { rank: 2, height: 'h-24', shade: 'from-slate-700 to-slate-600', medal: '🥈' },
    { rank: 1, height: 'h-32', shade: 'from-amber-400 to-yellow-300', medal: '🥇' },
    { rank: 3, height: 'h-20', shade: 'from-amber-700 to-orange-600', medal: '🥉' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlay={false}>
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl" />

        <div className="relative">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Game Finished</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Final Leaderboard</h2>
            <p className="mt-2 text-sm text-slate-500">Top players take the podium. Everyone else follows below.</p>
          </div>

          <div className="mt-8 grid grid-cols-3 items-end gap-4">
            {podiumSlots.map((slot, slotIndex) => {
              const entry = podium[slot.rank - 1];
              const delay = `${slotIndex * 80}ms`;
              return (
                <div key={slot.rank} className="flex flex-col items-center podium-rise" style={{ animationDelay: delay }}>
                  <div className={`w-full rounded-2xl border border-slate-200 bg-white/90 p-3 text-center shadow-lg ${entry ? 'podium-pop' : ''}`}>
                    <div className="text-2xl">{slot.medal}</div>
                    <div className="mt-2 text-sm font-bold text-slate-800 truncate">
                      {entry ? entry.name : '—'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{entry ? `${entry.score} pts` : 'No player'}</div>
                  </div>
                  <div className={`mt-3 w-full ${slot.height} rounded-2xl bg-gradient-to-b ${slot.shade} shadow-inner flex items-end justify-center text-white font-black text-lg`}>#{slot.rank}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-500">
              <span>All Players</span>
              <span>{sorted.length} total</span>
            </div>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {others.length > 0 ? (
                others.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm list-rise"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <span className="truncate font-semibold">{player.name}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{player.score} pts</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                  Everyone made the podium.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes podium-rise {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes podium-pop {
          0% {
            transform: scale(0.92);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes list-rise {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .podium-rise {
          animation: podium-rise 0.45s ease-out both;
        }
        .podium-pop {
          animation: podium-pop 0.35s ease-out;
        }
        .list-rise {
          animation: list-rise 0.4s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .podium-rise,
          .podium-pop,
          .list-rise {
            animation: none;
          }
        }
      `}</style>
    </Modal>
  );
}

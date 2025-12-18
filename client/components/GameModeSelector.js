import { useState } from 'react';
import { useRouter } from 'next/router';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export default function GameModeSelector({ onSelectMode }) {
  const router = useRouter();
  const { user } = useUser();
  const [hoveredMode, setHoveredMode] = useState(null);

  const gameModes = [
    {
      id: 'solo',
      title: 'Solo Mode',
      icon: '🎨',
      description: 'Draw freely on your own canvas',
      color: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/50',
      
    },
    {
      id: 'team',
      title: 'Team Mode',
      icon: '👥',
      description: 'Collaborate with friends in real-time',
      color: 'from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-500/50',
    },
    {
      id: 'custom',
      title: 'Custom Mode',
      icon: '⚙️',
      description: 'Create your own game rules',
      color: 'from-orange-500 to-red-500',
      shadowColor: 'shadow-orange-500/50',
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Header Navigation */}
      <header className="relative z-20 bg-white/90 backdrop-blur-2xl shadow-lg border-b-2 border-transparent" style={{ borderImage: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899) 1' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <nav className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-5 py-2 rounded-xl font-semibold text-slate-700 bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="relative px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl overflow-hidden group">
                  <span className="relative z-10">Sign up</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center gap-3 text-slate-700">
                <button
                  type="button"
                  onClick={() => router.push('/home')}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/game')}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  Play
                </button>
                <span className="max-sm:hidden font-semibold">Hi, {user?.firstName || 'Player'}</span>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-12 min-h-[calc(100vh-80px)] flex flex-col justify-center">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Choose Your Game Mode
          </h1>
          <div className="w-32 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-slate-600 font-medium">
            Select how you want to play and start drawing! 🎮
          </p>
        </div>

        {/* Game Mode Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {gameModes.map((mode) => (
            <div
              key={mode.id}
              onMouseEnter={() => setHoveredMode(mode.id)}
              onMouseLeave={() => setHoveredMode(null)}
              onClick={() => onSelectMode(mode.id)}
              className="relative group cursor-pointer"
            >
              {/* Card */}
              <div className={`relative bg-white/90 backdrop-blur-2xl rounded-3xl p-8 transition-all duration-500 transform ${
                hoveredMode === mode.id ? 'scale-105 -translate-y-2' : 'scale-100'
              } shadow-xl hover:shadow-2xl border-2 border-transparent overflow-hidden`}
                style={{ 
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)', 
                  backgroundOrigin: 'border-box', 
                  backgroundClip: 'padding-box, border-box'
                }}
              >
                {/* Icon Circle */}
                <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${mode.color} flex items-center justify-center text-4xl shadow-lg ${mode.shadowColor} transform transition-transform duration-500 ${
                  hoveredMode === mode.id ? 'rotate-12 scale-110' : 'rotate-0 scale-100'
                }`}>
                  {mode.icon}
                </div>

                {/* Title */}
                <h3 className={`text-2xl font-bold mb-3 bg-gradient-to-r ${mode.color} bg-clip-text text-transparent`}>
                  {mode.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 mb-6 font-medium">
                  {mode.description}
                </p>

                

                {/* Button */}
                <button
                  className={`w-full relative px-6 py-3 rounded-xl font-bold bg-gradient-to-r ${mode.color} text-white transition-all duration-300 transform hover:scale-105 shadow-lg ${mode.shadowColor} overflow-hidden group`}
                >
                  <span className="relative z-10">Play Now</span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>

                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${mode.color} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500 -z-10`}></div>
              </div>

              {/* Floating Badge */}
              {mode.id === 'team' && (
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                  POPULAR
                </div>
              )}

              {/* Decorative Elements */}
              <div className={`absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br ${mode.color} rounded-full opacity-50 blur-sm transition-transform duration-500 ${
                hoveredMode === mode.id ? 'scale-150' : 'scale-100'
              }`}></div>
              <div className={`absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-br ${mode.color} rounded-full opacity-50 blur-sm transition-transform duration-500 ${
                hoveredMode === mode.id ? 'scale-150' : 'scale-100'
              }`}></div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-slate-500 font-medium">
            Need help? Check out our{' '}
            <a href="#" className="text-blue-600 hover:text-purple-600 font-bold transition-colors">
              tutorial
            </a>
          </p>
        </div>
      </div>

      {/* Decorative floating elements */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
      <div className="absolute bottom-20 right-20 w-6 h-6 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-1/2 right-40 w-5 h-5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
    </div>
  );
}

import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <header className="w-full bg-white/90 backdrop-blur shadow-sm border-b border-purple-100">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-xl font-semibold text-purple-700 flex items-center gap-2"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 text-white font-bold">
              S
            </span>
            Skibbly
          </button>
          <span className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
            Live
          </span>
        </div>

        {user ? (
          <div className="flex items-center gap-3 text-sm text-gray-700 ml-auto">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-semibold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white">🎨</span>
              <span>Skibbly</span>
            </div>
            <span className="hidden sm:inline text-gray-500">Hi, {user?.name || user?.email || 'Player'}</span>
            <button
              onClick={logout}
              className="h-10 px-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg ring-2 ring-purple-100 hover:ring-purple-200 transition"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm ml-auto">
            <button
              onClick={() => router.push('/login')}
              className="text-purple-700 hover:text-purple-800 px-3 py-2 rounded-lg hover:bg-purple-50"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push('/register')}
              className="bg-purple-700 text-white px-4 py-2 rounded-full hover:bg-purple-800 shadow-sm"
            >
              Sign up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

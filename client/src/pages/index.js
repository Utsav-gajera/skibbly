import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 text-white">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 py-16 flex flex-col gap-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm border border-white/20 backdrop-blur">
              🎨 Multiplayer drawing with secure accounts
            </p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight">
              Draw together. Guess faster. Have fun.
            </h1>
            <p className="text-lg text-white/90 max-w-xl">
              Secure sign-in, instant lobbies, and a canvas that feels great on any device.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {!user ? (
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="bg-white text-purple-700 font-semibold px-6 py-3 rounded-full shadow-lg hover:-translate-y-0.5 transition-transform"
                  >
                    Sign in to play
                  </button>
                  <button
                    onClick={() => router.push('/register')}
                    className="bg-purple-900/30 border border-white/30 text-white font-semibold px-6 py-3 rounded-full hover:bg-purple-900/50 transition"
                  >
                    Create account
                  </button>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => router.push('/home')}
                    className="bg-white text-purple-700 font-semibold px-6 py-3 rounded-full shadow-lg hover:-translate-y-0.5 transition-transform"
                  >
                    Jump back in
                  </button>
                  <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-full px-3 py-2 backdrop-blur">
                    <div className="text-left">
                      <p className="text-sm font-semibold">Welcome back</p>
                      <p className="text-xs text-white/80">{user?.name || user?.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl backdrop-blur">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <p className="font-semibold">Instant Rooms</p>
                <p className="text-white/80 text-sm">Create or join in seconds with secure rooms.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <p className="font-semibold">Live Chat</p>
                <p className="text-white/80 text-sm">Coordinate with your team while you draw.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <p className="font-semibold">Profile-first</p>
                <p className="text-white/80 text-sm">Quick access to account controls.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <p className="font-semibold">Secure by default</p>
                <p className="text-white/80 text-sm">Proxy-enforced routes keep games private.</p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white/10 border border-white/15">
            <p className="text-sm text-white/80 mb-2">Sign-in flow</p>
            <h3 className="text-xl font-semibold">Modal auth that stays in place</h3>
            <p className="text-white/80 text-sm mt-2">Users sign in without losing context; profile options are one tap away.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/10 border border-white/15">
            <p className="text-sm text-white/80 mb-2">Profile</p>
            <h3 className="text-xl font-semibold">Account controls</h3>
            <p className="text-white/80 text-sm mt-2">Manage your profile, sessions, and sign-out.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/10 border border-white/15">
            <p className="text-sm text-white/80 mb-2">Protected pages</p>
            <h3 className="text-xl font-semibold">Automatic gating via proxy</h3>
            <p className="text-white/80 text-sm mt-2">Only `/` and Socket IO stay public; everything else requires auth.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
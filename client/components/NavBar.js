import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';

export default function NavBar() {
  const router = useRouter();
  const { user } = useUser();

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

        <SignedIn>
          <div className="flex items-center gap-3 text-sm text-gray-700 ml-auto">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-semibold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white">🎨</span>
              <span>Skibbly</span>
            </div>
            <span className="hidden sm:inline text-gray-500">Hi, {user?.firstName || 'Player'}</span>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-10 w-10',
                  userButtonTrigger: 'h-11 w-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg ring-2 ring-purple-100 hover:ring-purple-200 transition',
                },
              }}
              afterSignOutUrl="/"
            />
          </div>
        </SignedIn>

        <SignedOut>
            <div className="flex items-center gap-3 text-sm ml-auto">
            <SignInButton mode="modal">
              <button className="text-purple-700 hover:text-purple-800 px-3 py-2 rounded-lg hover:bg-purple-50">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-purple-700 text-white px-4 py-2 rounded-full hover:bg-purple-800 shadow-sm">
                Sign up
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
      </div>
    </header>
  );
}

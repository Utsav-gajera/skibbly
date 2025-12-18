import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';

export default function NavBar() {
  const router = useRouter();
  const { user } = useUser();

  return (
    <header className="w-full bg-white/90 backdrop-blur shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-xl font-semibold text-purple-700"
        >
          Skibbly
        </button>

        <SignedIn>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="hover:text-purple-700"
            >
              Home
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => router.push('/game')}
              className="hover:text-purple-700"
            >
              Play
            </button>
            <span className="text-gray-300">|</span>
            <span className="max-sm:hidden">
              Hi, {user?.firstName || 'Player'}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>

        <SignedOut>
          <div className="flex items-center gap-3 text-sm">
            <SignInButton mode="modal">
              <button className="text-purple-700 hover:text-purple-800">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-purple-700 text-white px-4 py-2 rounded-full hover:bg-purple-800">
                Sign up
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
      </div>
    </header>
  );
}

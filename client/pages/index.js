import { useRouter } from 'next/router';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <header className="flex justify-end items-center p-4 gap-4 h-16">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-white text-purple-600 rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer hover:bg-gray-100 transition">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="bg-purple-700 text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer hover:bg-purple-800 transition">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <SignedOut>
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Welcome to Skibbly! 🎨
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Draw, guess, and have fun with friends!
            </p>
            <SignInButton mode="modal">
              <button className="bg-white text-purple-600 rounded-full font-bold text-lg px-8 py-4 cursor-pointer hover:bg-gray-100 transition shadow-lg">
                Get Started
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Ready to Play! 🎨
            </h1>
            <button
              onClick={() => router.push('/home')}
              className="bg-white text-purple-600 rounded-full font-bold text-lg px-8 py-4 cursor-pointer hover:bg-gray-100 transition shadow-lg"
            >
              Start Drawing
            </button>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
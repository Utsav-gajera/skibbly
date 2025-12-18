import { useState } from 'react';

export default function SignUp({ onSignUp, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && email && password && password === confirmPassword) {
      onSignUp({ name, email, password });
    } else if (password !== confirmPassword) {
      alert('Passwords do not match!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Sign Up Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border-2 border-transparent" style={{ backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
          
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              skibbly
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full mx-auto"></div>
            <p className="mt-4 text-slate-600 font-medium">Join the creative community! 🎨✨</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-transparent outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400"
                  placeholder="👤 Monkey D. Luffy"
                  required
                  style={{ 
                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                    backgroundOrigin: 'border-box', 
                    backgroundClip: 'padding-box, border-box',
                    border: '2px solid transparent'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-transparent outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400"
                  placeholder="📧 your@email.com"
                  required
                  style={{ 
                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                    backgroundOrigin: 'border-box', 
                    backgroundClip: 'padding-box, border-box',
                    border: '2px solid transparent'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-transparent outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400"
                  placeholder="🔒 Create a password"
                  required
                  minLength={6}
                  style={{ 
                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                    backgroundOrigin: 'border-box', 
                    backgroundClip: 'padding-box, border-box',
                    border: '2px solid transparent'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-transparent outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400"
                  placeholder="🔒 Confirm your password"
                  required
                  minLength={6}
                  style={{ 
                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                    backgroundOrigin: 'border-box', 
                    backgroundClip: 'padding-box, border-box',
                    border: '2px solid transparent'
                  }}
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" className="w-4 h-4 mt-1 accent-blue-600 cursor-pointer" required />
              <label className="text-sm text-slate-600">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:text-purple-600 font-semibold">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-600 hover:text-purple-600 font-semibold">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              className="w-full relative px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl overflow-hidden group mt-6"
            >
              <span className="relative z-10">Create Account 🚀</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-slate-200"></div>
            </div>
           
          </div>

         
          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-purple-600 font-bold transition-colors"
              >
                Log in
              </button>
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce"></div>
        <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-1/2 -right-6 w-5 h-5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
}

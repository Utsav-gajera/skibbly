import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to intended page or home
  useEffect(() => {
    if (user && !loading) {
      const returnTo = router.query.returnTo || "/home";
      router.replace(returnTo);
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      // Redirect to intended destination or home
      const returnTo = router.query.returnTo || "/home";
      router.replace(returnTo);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-2xl font-black mb-2">Sign in</h1>
        <p className="text-sm text-slate-400 mb-6">Use your email and password.</p>

        <label className="text-sm font-semibold">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 mb-4 w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-100"
          required
        />

        <label className="text-sm font-semibold">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 mb-4 w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-100"
          required
        />

        {error && <div className="mb-4 text-sm text-rose-300">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 font-bold disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-sm text-slate-400 mt-4">
          No account?{" "}
          <button type="button" onClick={() => router.push("/register")} className="text-cyan-300 font-semibold">Create one</button>
        </p>
      </form>
    </div>
  );
}

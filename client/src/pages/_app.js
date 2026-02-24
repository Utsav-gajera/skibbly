import '../styles/globals.css';
import { AuthGuard, AuthProvider } from '../context/AuthContext';

// Pages that don't require authentication
const publicPages = ['/', '/login', '/register'];

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AuthGuard publicPaths={publicPages}>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );
}

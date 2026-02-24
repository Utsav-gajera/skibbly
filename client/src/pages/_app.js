import '../styles/globals.css';
import { AuthGuard, AuthProvider } from '../context/AuthContext';

// Pages that don't require authentication
const publicPages = ['/', '/login', '/register'];

// Pages that CAN be joined without auth (will redirect to login if not authenticated)
const joinablePages = ['/team', '/solo'];

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AuthGuard publicPaths={publicPages} joinablePaths={joinablePages}>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );
}

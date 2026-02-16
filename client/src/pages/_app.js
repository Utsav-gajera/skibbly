import '../styles/globals.css';
import { AuthGuard, AuthProvider } from '../context/AuthContext';

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

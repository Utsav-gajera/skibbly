import { useRouter } from 'next/router';
import Login from '../../components/Login';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (credentials) => {
    // Here you would typically call your authentication API
    console.log('Login with:', credentials);
    
    // For now, just redirect to the main app
    // In a real app, you'd verify credentials first
    router.push('/');
  };

  const handleSwitchToSignup = () => {
    router.push('/auth/signup');
  };

  return <Login onLogin={handleLogin} onSwitchToSignup={handleSwitchToSignup} />;
}

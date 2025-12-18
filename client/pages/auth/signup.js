import { useRouter } from 'next/router';
import SignUp from '../../components/SignUp';

export default function SignUpPage() {
  const router = useRouter();

  const handleSignUp = (userData) => {
    // Here you would typically call your registration API
    console.log('Sign up with:', userData);
    
    // For now, just redirect to the main app
    // In a real app, you'd create the account first
    router.push('/');
  };

  const handleSwitchToLogin = () => {
    router.push('/auth/login');
  };

  return <SignUp onSignUp={handleSignUp} onSwitchToLogin={handleSwitchToLogin} />;
}

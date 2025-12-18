import { useRouter } from 'next/router';
import GameModeSelector from '../components/GameModeSelector';

export default function HomePage() {
  const router = useRouter();

  const handleSelectMode = (mode) => {
    console.log('Selected mode:', mode);
    
    // Route to the game based on selected mode
    switch (mode) {
      case 'solo':
        router.push('/solo');
        break;
      case 'team':
        router.push('/team');
        break;
      case 'custom':
        router.push('/game?mode=custom');
        break;
      default:
        router.push('/game');
    }
  };

  return <GameModeSelector onSelectMode={handleSelectMode} />;
}

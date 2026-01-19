import { useRouter } from 'next/router';
import GameModeSelector from '../components/GameModeSelector';

export default function HomePage() {
  const router = useRouter();

  const createRoomId = () => `solo-${Math.random().toString(36).slice(2, 8)}`;

  const handleSelectMode = (mode) => {
    console.log('Selected mode:', mode);
    
    // Route to the game based on selected mode
    switch (mode) {
      case 'solo':
        router.push(`/solo?room=${createRoomId()}&host=1`);
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

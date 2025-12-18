import { useRouter } from 'next/router';
import GameModeSelector from '../components/GameModeSelector';

export default function Home() {
  const router = useRouter();

  const handleSelectMode = (mode) => {
    console.log('Selected mode:', mode);
    
    // Route to the game based on selected mode
    router.push(`/game?mode=${mode}`);
  };

  return <GameModeSelector onSelectMode={handleSelectMode} />;
}
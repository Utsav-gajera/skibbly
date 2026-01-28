import { useRouter } from 'next/router';
import GameModeSelector from '../components/GameModeSelector';
import { createRoomId } from '../utils/helpers';

export default function HomePage() {
  const router = useRouter();

  const handleSelectMode = (mode) => {
    const routes = {
      solo: `/solo?room=${createRoomId('solo')}&host=1`,
      team: '/team',
      custom: '/game?mode=custom'
    };
    router.push(routes[mode] || '/game');
  };

  return <GameModeSelector onSelectMode={handleSelectMode} />;
}

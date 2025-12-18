import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import DrawingBoard from '../components/DrawingBoard';
import GroupChat from '../components/GroupChat';
import Modal from '../components/Modal';
import SoloModeConfig from '../components/SoloModeConfig';

// Word pool for the game
const WORD_POOL = [
  'cat', 'dog', 'house', 'tree', 'car', 'sun', 'moon', 'star', 'flower', 'bird',
  'fish', 'boat', 'plane', 'train', 'bike', 'book', 'pen', 'phone', 'computer', 'chair',
  'table', 'cup', 'bottle', 'hat', 'shoe', 'apple', 'banana', 'pizza', 'cake', 'ice cream',
  'guitar', 'piano', 'drum', 'camera', 'clock', 'key', 'door', 'window', 'lamp', 'bed',
  'umbrella', 'rainbow', 'cloud', 'mountain', 'beach', 'ocean', 'river', 'bridge', 'castle', 'rocket',
  'butterfly', 'elephant', 'lion', 'giraffe', 'penguin', 'dolphin', 'turtle', 'frog', 'snake', 'spider'
];

export default function GamePage() {
  const router = useRouter();
  const { mode } = router.query;
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [brushColor, setBrushColor] = useState('#e11d48');
  const [brushWidth, setBrushWidth] = useState(8);
  const [drawMode, setDrawMode] = useState('pencil');
  const [name, setName] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  
  // Word selection states
  const [showWordPopup, setShowWordPopup] = useState(false);
  const [wordPool, setWordPool] = useState([]);
  const [currentWordOptions, setCurrentWordOptions] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [playerCount, setPlayerCount] = useState(1);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      await fetch('/api/socket');
      const socket = io({ path: '/api/socket' });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connected to game mode:', mode);
        setSocketConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setSocketConnected(false);
      });

      // Listen for player count updates
      socket.on('player-count', (count) => {
        console.log('Player count:', count);
        setPlayerCount(count);
        if (count > 0 && wordPool.length === 0) {
          // Generate word pool when we know player count
          generateWordPool(count);
        }
      });

      // Listen for turn changes
      socket.on('your-turn', (data) => {
        console.log('Your turn to select word');
        setIsMyTurn(true);
        selectThreeWords();
      });

      socket.on('word-selected', (data) => {
        console.log('Player selected word:', data);
        setIsMyTurn(false);
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Generate word pool based on player count
  const generateWordPool = (count) => {
    const wordsNeeded = count * 3;
    const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(wordsNeeded, WORD_POOL.length));
    setWordPool(selected);
    setShowWordPopup(true);
  };

  // Select 3 random words from the pool for current turn
  const selectThreeWords = () => {
    if (wordPool.length < 3) {
      console.error('Not enough words in pool');
      return;
    }
    const shuffled = [...wordPool].sort(() => Math.random() - 0.5);
    const threeWords = shuffled.slice(0, 3);
    setCurrentWordOptions(threeWords);
    setShowWordPopup(true);
  };

  // Handle word selection
  const handleWordSelect = (word) => {
    setSelectedWord(word);
    setShowWordPopup(false);
    // Remove selected word from pool
    setWordPool(prev => prev.filter(w => w !== word));
    // Notify other players
    if (socketRef.current) {
      socketRef.current.emit('word-selected', { word, player: name });
    }
    setIsMyTurn(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-slate-800">
      <header className="relative flex items-center justify-between px-8 py-5 bg-white/90 backdrop-blur-2xl shadow-2xl border-b-2 overflow-hidden" style={{ borderImage: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b) 1' }}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-gradient-x"></div>
        
        {/* Decorative orbs */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative flex items-center gap-4 z-10">
          <button
            onClick={() => router.push('/home')}
            className="mr-4 px-4 py-2 rounded-xl font-semibold bg-white/80 text-slate-700 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-md"
          >
            ← Back
          </button>
          <div className="relative">
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
              skibbly
            </h1>
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full shadow-lg"></div>
            {/* Sparkle effect */}
            <div className="absolute -top-2 -right-3 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute -top-2 -right-3 w-3 h-3 bg-yellow-400 rounded-full"></div>
          </div>
          {mode && (
            <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-full shadow-lg">
              {mode.toUpperCase()} MODE
            </span>
          )}
        </div>
        
        <div className="relative flex items-center gap-4 z-10">
          <div className="relative group">
            <input
              className="border-2 border-transparent rounded-xl px-5 py-2.5 focus:border-transparent focus:ring-0 outline-none transition-all duration-300 font-semibold text-slate-700 placeholder:text-slate-400 bg-white shadow-lg hover:shadow-xl"
              placeholder="✨ Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ 
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)', 
                backgroundOrigin: 'border-box', 
                backgroundClip: 'padding-box, border-box',
                border: '2px solid transparent'
              }}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 blur transition-opacity pointer-events-none"></div>
          </div>
          
          {/* User avatar indicator
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/50 hover:scale-110 transition-transform cursor-pointer">
            {name.charAt(0).toUpperCase()}
          </div>

          Test Word Selection Button
          <button
            onClick={() => {
              if (wordPool.length === 0) {
                generateWordPool(3);
              }
              setIsMyTurn(true);
              selectThreeWords();
            }}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            title="Test word selection popup"
          >
            🎲 Test Popup
          </button> */}
        </div>
      </header>

      <main className="grid md:grid-cols-[2fr_1fr] grid-cols-1 gap-0 h-[calc(100vh-80px)]">
        <DrawingBoard 
          socketRef={socketRef}
          brushColor={brushColor}
          brushWidth={brushWidth}
          mode={drawMode}
          setMode={setDrawMode}
          name={name}
          selectedWord={selectedWord}
          onChangeBrushColor={(val) => setBrushColor(val)}
          onChangeBrushWidth={(val) => setBrushWidth(val)}
        />
        <GroupChat 
          socketRef={socketRef}
          name={name}
        />
       
      </main>

      {/* Word Selection Modal */}
      <Modal 
        isOpen={showWordPopup && currentWordOptions.length > 0 && isMyTurn}
        onClose={() => {}}
        closeOnOverlay={false}
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            🎨 Choose Your Word!
          </h2>
          <p className="text-slate-600 font-medium">
            Select one word to draw for this round
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {currentWordOptions.map((word, idx) => (
            <button
              key={idx}
              onClick={() => handleWordSelect(word)}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-2 border-transparent hover:border-purple-400 rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-purple-400/0 group-hover:from-blue-400/10 group-hover:to-purple-400/10 transition-all duration-300"></div>
              <div className="relative">
                <div className="text-4xl mb-2">✨</div>
                <div className="text-xl font-bold text-slate-800 capitalize">
                  {word}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center text-sm text-slate-500 bg-slate-50 rounded-xl p-3">
          <span className="font-semibold">💡 Tip:</span> Choose a word you can draw well!
        </div>
      </Modal>
    </div>
  );
}

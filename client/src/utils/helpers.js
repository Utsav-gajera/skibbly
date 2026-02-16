// Generate random room ID
export const createRoomId = (prefix = 'room') => 
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

// Generate random user name
export const createUserName = () => 
  `User-${Math.floor(Math.random() * 1000)}`;

// Generate session ID
export const createSessionId = () => 
  `tab-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

// Get or create session ID from storage
export const getOrCreateSessionId = (key) => {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = createSessionId();
    sessionStorage.setItem(key, sid);
  }
  return sid;
};

// Deduplicate players by sessionId or id
export const deduplicatePlayers = (players) => 
  players ? Array.from(new Map(players.map(p => [(p.sessionId || p.id), p])).values()) : [];

// Get user display name from auth user object
export const getUserDisplayName = (user, fallback) => 
  user?.fullName || user?.username || user?.firstName || fallback;

import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

export default function DrawingBoard({
  socketRef,
  brushColor,
  brushWidth,
  mode,
  setMode,
  name,
  selectedWord,
  onChangeBrushColor,
  onChangeBrushWidth,
  channel,
  roomId,
  mySocketId,
  currentDrawerId,
  drawerName: drawerNameProp,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null); // canvas area (excludes toolbar)
  const fabricRef = useRef(null);
  const undoStack = useRef([]);
  const isUndoing = useRef(false);
  const [isDrawer, setIsDrawer] = useState(false);
  const isDrawerRef = useRef(false);
  const modeRef = useRef(mode);
  const roomIdRef = useRef(roomId);
  const channelRef = useRef(channel);
  const [drawerName, setDrawerName] = useState('');
  const lastDrawerIdRef = useRef(null);
  const [socketId, setSocketId] = useState(null);
  const socketIdRef = useRef(null); // Declare at top so it's always accessible
  const [socket, setSocket] = useState(null);

  // Keep refs in sync so mount-time handlers always see latest props
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // If parent provides authoritative drawer info, prefer it.
  useEffect(() => {
    if (!mySocketId || !currentDrawerId) {
      console.log('⚠️ [DRAWER_DETECTION] Missing drawer info:', { mySocketId, currentDrawerId, channel });
      return;
    }
    const amDrawer = mySocketId === currentDrawerId || `player-${mySocketId}` === currentDrawerId;
    console.log('🔍 [DRAWER_DETECTION] Checking if I am the drawer:', {
      mySocketId,
      currentDrawerId,
      channel,
      check1_rawMatch: mySocketId === currentDrawerId,
      check2_prefixMatch: `player-${mySocketId}` === currentDrawerId,
      amDrawer
    });
    isDrawerRef.current = amDrawer;
    setIsDrawer(amDrawer);
    if (drawerNameProp) setDrawerName(drawerNameProp);
  }, [mySocketId, currentDrawerId, drawerNameProp, channel]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const areaEl = containerRef.current;
    if (!canvasEl || !areaEl) return;

    const canvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
    });
    fabricRef.current = canvas;
    setupCanvas(canvas);
    setCursor(mode === 'eraser' ? 'eraser' : 'pencil');
    // Start disabled until we know who the drawer is.
    canvas.isDrawingMode = false;
    canvas.selection = false;
    saveHistory();

    canvas.on('path:created', (e) => {
      if (!isDrawerRef.current) {
        console.log('⛔ Path creation blocked: not the drawer', { isDrawer: isDrawerRef.current, mySocketId: socketIdRef.current, channel: channelRef.current });
        const obj = e.path || e.target;
        if (obj) canvas.remove(obj);
        return;
      }
      console.log('✅ Path creation allowed: I am the drawer', { channel: channelRef.current, roomId: roomIdRef.current });
      const obj = e.path || e.target;
      if (obj) obj.erasable = true;
      const payload = obj.toJSON();
      socket?.emit('draw', { payload, channel: channelRef.current, roomId: roomIdRef.current });
      if (!isUndoing.current) {
        saveHistory();
      }
      // IMPORTANT: do NOT broadcast full canvas JSON for every pencil stroke.
      // Remote clients already receive incremental `draw` events.
      // Broadcasting `canvas:json` here can cause the viewer canvas to clear via loadFromJSON.
    });

    canvas.on('object:removed', () => {
      if (!isUndoing.current) {
        // Only broadcast JSON for erase-like operations (object removal).
        // Pencil strokes shouldn't trigger full-canvas sync.
        if (isDrawerRef.current && modeRef.current === 'eraser') {
          broadcastCanvas();
        }
        saveHistory();
      }
    });

    const onResize = () => resizeCanvas(canvas);
    window.addEventListener('resize', onResize);
    onResize();

    // Handlers used by socket listeners (registered in a separate effect)
    const onDraw = (data) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const incomingChannel = data?.channel;
      const incomingRoom = data?.roomId;

      const expectedRoom = roomIdRef.current;
      const expectedChannel = channelRef.current;
      
      console.log('🎨 DrawingBoard onDraw received. Expected room:', expectedRoom, 'channel:', expectedChannel, 'Incoming:', { room: incomingRoom, channel: incomingChannel, hasPayload: !!data?.payload });
      
      // Filter by roomId - only if BOTH are present and different
      if (expectedRoom && incomingRoom && incomingRoom !== expectedRoom) {
        console.log('❌ Filtered draw by roomId mismatch:', expectedRoom, '!==', incomingRoom);
        return;
      }
      
      // Filter by channel - only if BOTH are present and different
      if (expectedChannel && incomingChannel && incomingChannel !== expectedChannel) {
        console.log('❌ Filtered draw by channel mismatch:', expectedChannel, '!==', incomingChannel);
        return;
      }

      console.log('✅ Draw accepted, applying to canvas');
      const payload = data?.payload ?? data;
      
      if (!payload) {
        console.error('No payload in draw data:', data);
        return;
      }

      fabric.util.enlivenObjects([payload], (objects) => {
        if (objects && objects.length > 0) {
          objects.forEach((o) => canvas.add(o));
          canvas.requestRenderAll();
          return;
        }

        // Fallback: manually construct common Fabric object types.
        try {
          if (payload?.type === 'path' && payload?.path) {
            const { path, ...opts } = payload;
            const p = new fabric.Path(path, opts);
            canvas.add(p);
            canvas.requestRenderAll();
            return;
          }

          if (payload?.type === 'line' && Array.isArray(payload?.points)) {
            const { points, ...opts } = payload;
            const l = new fabric.Line(points, opts);
            canvas.add(l);
            canvas.requestRenderAll();
            return;
          }

          console.error('Failed to enliven draw payload (unknown type):', payload?.type);
        } catch (err) {
          console.error('Failed to construct draw payload:', err);
        }
      });
    };

    const onClear = (data) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const incomingChannel = data?.channel ?? data?.payload?.channel;
      const incomingRoom = data?.roomId;
      const fromServer = data?.fromServer;
      const expectedRoom = roomIdRef.current;
      const expectedChannel = channelRef.current;
      if (expectedRoom && incomingRoom && incomingRoom !== expectedRoom) return;
      if (expectedChannel && incomingChannel && incomingChannel !== expectedChannel) return;
      
      console.log('🗑️ Clearing canvas:', fromServer ? '(server turn rotation)' : '(manual clear)');
      canvas.clear();
      setupCanvas(canvas);
      undoStack.current = [];
      saveHistory();
    };

    const onCanvasJson = (data) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const incomingChannel = data?.channel;
      const incomingRoom = data?.roomId;
      const expectedRoom = roomIdRef.current;
      const expectedChannel = channelRef.current;
      if (expectedRoom && incomingRoom && incomingRoom !== expectedRoom) return;
      if (expectedChannel && incomingChannel && incomingChannel !== expectedChannel) return;
      const json = data?.json ?? data;
      if (!json || typeof json !== 'object') return;
      // Guard against invalid payloads that would clear the canvas.
      if (!Array.isArray(json.objects)) return;
      canvas.loadFromJSON(json, () => {
        canvas.requestRenderAll();
      });
    };

    const onDrawerChanged = (data) => {
      lastDrawerIdRef.current = data?.drawerId ?? null;
      const currentSocketId = mySocketId || socketIdRef.current || socket?.id || socketRef.current?.id;
      const amDrawer = data.drawerId === currentSocketId || `player-${currentSocketId}` === data.drawerId;
      console.log('👨‍🎨 Drawer changed event received:', {
        drawerId: data.drawerId,
        drawerName: data.drawerName,
        mySocketId: currentSocketId,
        match: amDrawer,
        bothIds: `${data.drawerId} === ${currentSocketId}`,
        result: amDrawer ? '🎨 I AM DRAWER' : '👀 I AM WATCHING'
      });
      isDrawerRef.current = amDrawer;
      setIsDrawer(amDrawer);
      setDrawerName(data.drawerName || 'Unknown');
      
      if (amDrawer) {
        console.log('✅ You are now the drawer!');
        // Immediately enable drawing mode
        const canvas = fabricRef.current;
        if (canvas) {
          canvas.isDrawingMode = mode !== 'eraser';
          if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          }
          canvas.freeDrawingBrush.color = brushColor;
          canvas.freeDrawingBrush.width = brushWidth;
          console.log('🎨 Drawing mode enabled immediately');
        }
      } else {
        console.log('👀 You are watching:', data.drawerName);
        // Immediately disable drawing mode
        const canvas = fabricRef.current;
        if (canvas) {
          canvas.isDrawingMode = false;
          console.log('⛔ Drawing mode disabled immediately');
        }
      }
      
    };
    // Expose handlers to the socket-binding effect via refs
    handlersRef.current = { onDraw, onClear, onCanvasJson, onDrawerChanged };

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [socket]);

  // Store the latest socket event handlers created during canvas init
  const handlersRef = useRef(null);

  // Resolve the socket instance even if socketRef.current is assigned after mount
  useEffect(() => {
    if (socketRef.current) {
      setSocket(socketRef.current);
      return;
    }

    let cleared = false;
    const intervalId = setInterval(() => {
      if (cleared) return;
      if (socketRef.current) {
        setSocket(socketRef.current);
        clearInterval(intervalId);
      }
    }, 50);

    return () => {
      cleared = true;
      clearInterval(intervalId);
    };
  }, [socketRef]);

  // Bind/unbind socket listeners once we have a socket + handlers
  useEffect(() => {
    if (!socket) return;
    const handlers = handlersRef.current;
    if (!handlers) return;

    socket.on('draw', handlers.onDraw);
    socket.on('clear', handlers.onClear);
    socket.on('canvas:json', handlers.onCanvasJson);
    socket.on('drawer:changed', handlers.onDrawerChanged);

    return () => {
      socket.off('draw', handlers.onDraw);
      socket.off('clear', handlers.onClear);
      socket.off('canvas:json', handlers.onCanvasJson);
      socket.off('drawer:changed', handlers.onDrawerChanged);
    };
  }, [socket]);

  // Keep a ref in sync so mount-time canvas handlers see latest drawer status
  useEffect(() => {
    isDrawerRef.current = isDrawer;
  }, [isDrawer]);

  // If drawer:changed arrived before we knew our socket id, re-check once we have it.
  useEffect(() => {
    const myId = mySocketId || socketIdRef.current || socket?.id || null;
    const lastDrawerId = lastDrawerIdRef.current;
    if (!myId || !lastDrawerId) return;
    const amDrawer = myId === lastDrawerId;
    if (amDrawer !== isDrawerRef.current) {
      isDrawerRef.current = amDrawer;
      setIsDrawer(amDrawer);
    }
  }, [mySocketId, socketId, socket]);

  // Capture socket ID and set up drawer status listener
  useEffect(() => {
    if (!socket) return;
    
    // Capture socket ID IMMEDIATELY if available
    if (socket.id) {
      socketIdRef.current = socket.id;
      setSocketId(socket.id);
      console.log('⚡ Socket ID captured immediately:', socket.id);
    }
    
    // Listen for socket ID from server
    const onSocketId = (data) => {
      socketIdRef.current = data.id;
      setSocketId(data.id);
      console.log('📱 Socket ID received from server:', data.id);
    };
    
    // Listen for drawer status on connect/reconnect
    const onConnect = () => {
      if (socket?.id) {
        socketIdRef.current = socket.id;
        setSocketId(socket.id);
        console.log('🔌 Socket reconnected with ID:', socket.id);
      }
    };
    
    socket.on('socket-id', onSocketId);
    socket.on('connect', onConnect);
    
    // Request socket ID from server if not yet received (fallback for timing issues)
    const requestTimeoutId = setTimeout(() => {
      if (!socketIdRef.current && socket) {
        socket.emit('request-socket-id');
        console.log('📱 Requesting socket ID from server...');
      }
    }, 100);
    
    return () => {
      clearTimeout(requestTimeoutId);
      socket.off('socket-id', onSocketId);
      socket.off('connect', onConnect);
    };
  }, [socket]);

  // React to mode changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const isEraser = mode === 'eraser';
    
    // Always clean up old eraser handlers first
    const erasedObjectsSet = new Set();
    
    const handleMouseDown = (opt) => {
      if (!isDrawerRef.current) {
        console.log('⛔ Only the drawer can make changes');
        return;
      }
      if (!fabric.EraserBrush) {
        const target = opt.target;
        if (target && target !== canvas.backgroundImage) {
          canvas.remove(target);
          broadcastCanvas();
          saveHistory();
        }
      }
    };

    const handleMouseMove = (opt) => {
      if (!isDrawerRef.current) return;
      
      const pointer = canvas.getPointer(opt.e);
      const radius = brushWidth / 2 + 3;
      const objs = canvas.getObjects();

      for (let i = objs.length - 1; i >= 0; i--) {
        const obj = objs[i];
        if (erasedObjectsSet.has(obj)) continue;

        try {
          if (obj.containsPoint(pointer)) {
            erasedObjectsSet.add(obj);
            canvas.remove(obj);
            continue;
          }
        } catch (e) {}

        if (obj.aCoords) {
          const coords = obj.aCoords;
          const minX = Math.min(coords.tl.x, coords.tr.x, coords.br.x, coords.bl.x) - radius;
          const maxX = Math.max(coords.tl.x, coords.tr.x, coords.br.x, coords.bl.x) + radius;
          const minY = Math.min(coords.tl.y, coords.tr.y, coords.br.y, coords.bl.y) - radius;
          const maxY = Math.max(coords.tl.y, coords.tr.y, coords.br.y, coords.bl.y) + radius;

          if (pointer.x >= minX && pointer.x <= maxX && pointer.y >= minY && pointer.y <= maxY) {
            erasedObjectsSet.add(obj);
            canvas.remove(obj);
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (erasedObjectsSet.size > 0) {
        broadcastCanvas();
        saveHistory();
      }
      erasedObjectsSet.clear();
    };

    // Always remove old handlers to prevent duplicates
    canvas.off('mouse:down', handleMouseDown);
    canvas.off('mouse:move', handleMouseMove);
    canvas.off('mouse:up', handleMouseUp);
    
    if (isEraser) {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      setCursor('eraser');
      
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
    } else {
      // Pencil mode
      canvas.isDrawingMode = isDrawer;
      canvas.selection = false;
      
      // Ensure a drawing brush exists
      if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
      setCursor('pencil');
    }

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [mode, brushColor, brushWidth, isDrawer]);

  // React to brush changes when in pencil mode
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || mode === 'eraser') return;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
    }
  }, [brushColor, brushWidth, mode]);

  // Update canvas drawing mode when drawer status changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    console.log('🎨 Drawer status changed. isDrawer:', isDrawer, 'mode:', mode);
    
    if (mode === 'eraser') {
      // Eraser mode handled by the mode effect
      return;
    }
    
    // For pencil mode, enable/disable drawing based on drawer status
    canvas.isDrawingMode = isDrawer;
    canvas.selection = false;
    
    if (isDrawer) {
      console.log('✅ Enabling drawing mode');
      // Ensure brush is set up
      if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
    } else {
      console.log('⛔ Disabling drawing mode');
    }
  }, [isDrawer, mode, brushColor, brushWidth]);

  function setupCanvas(canvas) {
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushWidth;
  }

  function resizeCanvas(canvas) {
    if (!canvas || !containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    const h = containerRef.current.offsetHeight;
    
    if (w === 0 || h === 0) {
      // Retry after a short delay if dimensions are 0
      setTimeout(() => resizeCanvas(canvas), 100);
      return;
    }
    
    // Set canvas element size
    if (canvasRef.current) {
      canvasRef.current.width = w;
      canvasRef.current.height = h;
    }
    
    // Set fabric canvas size
    canvas.setWidth(w);
    canvas.setHeight(h);
    canvas.renderAll();
  }

  function svgCursor(svg) {
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 0 24, crosshair`;
  }

  function getCursor(type) {
    let svg = '';
    if (type === 'pencil') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#0ea5e9" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/><path fill="#020617" d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83l3.75 3.75l1.84-1.83z"/></svg>';
    } else if (type === 'eraser') {
      svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path fill="#64748b" d="M16.24 3.56a2 2 0 0 1 2.83 0l1.37 1.37a2 2 0 0 1 0 2.83L9.6 18.6a2 2 0 0 1-1.42.59H4.83a1 1 0 0 1-.7-.29l-2.25-2.25a1 1 0 0 1 0-1.41L16.24 3.56z"/>
  <path fill="#cbd5f5" d="M6.5 18.5l3 3h6l-3-3h-6z"/>
</svg>
`;
    }
    return svgCursor(svg);
  }

  function setCursor(type) {
    const canvas = fabricRef.current;
    const el = canvas?.upperCanvasEl;
    if (!canvas || !el) return;
    const cursor = getCursor(type);
    el.style.cursor = cursor;
    if (type === 'pencil' || type === 'eraser') {
      canvas.freeDrawingCursor = cursor;
    } else {
      canvas.defaultCursor = cursor;
    }
  }

  function saveHistory() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = canvas.toJSON();
    undoStack.current.push(json);
    if (undoStack.current.length > 50) undoStack.current.shift();
  }

  function applyJSON(json) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.loadFromJSON(json, () => {
      canvas.requestRenderAll();
    });
  }

  function broadcastCanvas() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = canvas.toJSON();
    socket?.emit('canvas:json', { json, channel: channelRef.current, roomId: roomIdRef.current });
  }

  // duplicate resizeCanvas removed

  function enablePencil() {
    setMode('pencil');
  }

  function enableEraser() {
    setMode('eraser');
  }

  function undo() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (undoStack.current.length <= 1) return;
    
    isUndoing.current = true;
    undoStack.current.pop();
    const previous = undoStack.current[undoStack.current.length - 1];
    
    if (previous) {
      canvas.clear();
      canvas.loadFromJSON(previous, () => {
        canvas.requestRenderAll();
        isUndoing.current = false;
      });
    } else {
      canvas.clear();
      setupCanvas(canvas);
      isUndoing.current = false;
    }
    broadcastCanvas();
  }

  function clearCanvas() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    setupCanvas(canvas);
    socket?.emit('clear', { channel: channelRef.current, roomId: roomIdRef.current });
    saveHistory();
  }

  return (
    <section id="canvas-container" className="relative flex flex-col bg-gradient-to-br from-gray-50 to-blue-50" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={containerRef} className="relative flex-1">
        <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0 }} />

        {/* Selected Word Display */}
        {selectedWord && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl rounded-2xl shadow-2xl animate-pulse">
            <span className="mr-2">🎯</span>
            Draw: <span className="uppercase tracking-wide">{selectedWord}</span>
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-3 bg-white/90 backdrop-blur-xl px-4 py-2.5 rounded-t-2xl shadow-xl border border-white/50">
        {/* Drawer Status and Timer */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${isDrawer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isDrawer ? '✏️ Your turn to draw' : `👀 Watching ${drawerName || 'other player'}`}
          </div>
        </div>

        <div className="border-l border-slate-300 h-6"></div>

        <label className="flex items-center gap-2 transition-all hover:scale-[1.02]">
          <span className="text-sm font-semibold text-slate-700">Color</span>
          <input 
            type="color" 
            value={brushColor} 
            onChange={(e) => onChangeBrushColor?.(e.target.value)} 
            disabled={!isDrawer}
            className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>
        <label className="flex items-center gap-2 transition-all hover:scale-[1.02]">
          <span className="text-sm font-semibold text-slate-700">Size</span>
          <input 
            type="range" 
            min="2" 
            max="40" 
            value={brushWidth} 
            onChange={(e) => onChangeBrushWidth?.(parseInt(e.target.value))} 
            disabled={!isDrawer}
            className="w-28 accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-xs font-medium text-slate-500 min-w-[2rem]">{brushWidth}px</span>
        </label>

        <div className="flex items-center gap-2">
          <button 
            onClick={enablePencil}
            disabled={!isDrawer}
            className={`px-3.5 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-[1.03] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'pencil' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/40' 
                : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-400'
            }`}
          >
            🖊 Pencil
          </button>
          <button 
            onClick={enableEraser}
            disabled={!isDrawer}
            className={`px-3.5 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-[1.03] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'eraser' 
                ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-md shadow-slate-500/40' 
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
            }`}
          >
            🧽 Eraser
          </button>
          <button 
            onClick={undo}
            disabled={!isDrawer}
            className="px-3.5 py-2 rounded-lg font-medium bg-white text-slate-700 border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all duration-300 transform hover:scale-[1.03] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ↶ Undo
          </button>
          <button 
            onClick={clearCanvas}
            disabled={!isDrawer}
            className="px-3.5 py-2 rounded-lg font-medium bg-gradient-to-r from-red-500 to-rose-600 text-white border border-transparent hover:from-red-600 hover:to-rose-700 transition-all duration-300 transform hover:scale-[1.03] hover:shadow-md shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </section>
  );
}

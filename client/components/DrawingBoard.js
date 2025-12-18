import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

export default function DrawingBoard({ socketRef, brushColor, brushWidth, mode, setMode, name, selectedWord, onChangeBrushColor, onChangeBrushWidth, channel, roomId }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fabricRef = useRef(null);
  const undoStack = useRef([]);
  const isUndoing = useRef(false);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const canvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
    });
    fabricRef.current = canvas;
    setupCanvas(canvas);
    setCursor(mode === 'eraser' ? 'eraser' : 'pencil');
    canvas.isDrawingMode = mode !== 'eraser';
    saveHistory();

    canvas.on('path:created', (e) => {
      const obj = e.path || e.target;
      if (obj) obj.erasable = true;
      const payload = obj.toJSON();
      socketRef.current?.emit('draw', { payload, channel, roomId });
      if (!isUndoing.current) {
        saveHistory();
      }
      broadcastCanvas();
    });

    canvas.on('object:removed', () => {
      if (!isUndoing.current) {
        broadcastCanvas();
        saveHistory();
      }
    });

    const onResize = () => resizeCanvas(canvas);
    window.addEventListener('resize', onResize);
    onResize();

    // Socket listeners
    const onDraw = (data) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      // Channel filter: if this board has a channel, only accept matching events (or events without channel)
      const incomingChannel = data?.channel;
      const incomingRoom = data?.roomId;
      if (roomId && incomingRoom && incomingRoom !== roomId) return;
      if (channel && incomingChannel && incomingChannel !== channel) return;

      const payload = data?.payload ?? data;
      fabric.util.enlivenObjects([payload], (objects) => {
        objects.forEach((o) => canvas.add(o));
        canvas.requestRenderAll();
      });
    };

    const onClear = (data) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const incomingChannel = data?.channel ?? data?.payload?.channel;
      const incomingRoom = data?.roomId;
      if (roomId && incomingRoom && incomingRoom !== roomId) return;
      if (channel && incomingChannel && incomingChannel !== channel) return;
      canvas.clear();
      setupCanvas(canvas);
    };

    const onCanvasJson = (data) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const incomingChannel = data?.channel;
      const incomingRoom = data?.roomId;
      if (roomId && incomingRoom && incomingRoom !== roomId) return;
      if (channel && incomingChannel && incomingChannel !== channel) return;
      const json = data?.json ?? data;
      canvas.loadFromJSON(json, () => {
        canvas.requestRenderAll();
      });
    };

    socketRef.current?.on('draw', onDraw);
    socketRef.current?.on('clear', onClear);
    socketRef.current?.on('canvas:json', onCanvasJson);

    return () => {
      window.removeEventListener('resize', onResize);
      socketRef.current?.off('draw', onDraw);
      socketRef.current?.off('clear', onClear);
      socketRef.current?.off('canvas:json', onCanvasJson);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // React to mode changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const isEraser = mode === 'eraser';
    
    if (isEraser) {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      setCursor('eraser');
      
      // Set up eraser mouse handlers
      const erasedObjectsSet = new Set();
      
      const handleMouseDown = (opt) => {
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

      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);

      return () => {
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
      };
    } else {
      // Pencil mode
      canvas.isDrawingMode = true;
      canvas.selection = false;
      
      // Ensure a drawing brush exists
      if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
      setCursor('pencil');
    }
  }, [mode, brushColor, brushWidth]);

  // React to brush changes when in pencil mode
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || mode === 'eraser') return;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
    }
  }, [brushColor, brushWidth, mode]);

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
    socketRef.current?.emit('canvas:json', { json, channel, roomId });
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
    socketRef.current?.emit('clear', { channel, roomId });
    saveHistory();
  }

  return (
    <section ref={containerRef} id="canvas-container" className="relative bg-gradient-to-br from-gray-50 to-blue-50" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0 }} />
      
      {/* Selected Word Display */}
      {selectedWord && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl rounded-2xl shadow-2xl animate-pulse">
          <span className="mr-2">🎯</span>
          Draw: <span className="uppercase tracking-wide">{selectedWord}</span>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center gap-4 bg-white/90 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl border border-white/50">
        <label className="flex items-center gap-3 transition-all hover:scale-105">
          <span className="text-sm font-semibold text-slate-700">Color</span>
          <input 
            type="color" 
            value={brushColor} 
            onChange={(e) => onChangeBrushColor?.(e.target.value)} 
            className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          />
        </label>
        <label className="flex items-center gap-3 transition-all hover:scale-105">
          <span className="text-sm font-semibold text-slate-700">Size</span>
          <input 
            type="range" 
            min="2" 
            max="40" 
            value={brushWidth} 
            onChange={(e) => onChangeBrushWidth?.(parseInt(e.target.value))} 
            className="w-32 accent-blue-600"
          />
          <span className="text-xs font-medium text-slate-500 min-w-[2rem]">{brushWidth}px</span>
        </label>

        <div className="flex items-center gap-2">
          <button 
            onClick={enablePencil} 
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
              mode === 'pencil' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50' 
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-400'
            }`}
          >
            🖊 Pencil
          </button>
          <button 
            onClick={enableEraser} 
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
              mode === 'eraser' 
                ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/50' 
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400'
            }`}
          >
            🧽 Eraser
          </button>
          <button 
            onClick={undo} 
            className="px-4 py-2 rounded-xl font-medium bg-white text-slate-700 border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          >
            ↶ Undo
          </button>
          <button 
            onClick={clearCanvas} 
            className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-red-500 to-rose-600 text-white border-2 border-transparent hover:from-red-600 hover:to-rose-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-red-500/50"
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </section>
  );
}

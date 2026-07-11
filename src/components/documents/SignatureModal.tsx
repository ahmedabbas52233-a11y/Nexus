import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { documentAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface SignatureModalProps {
  documentId: number;
  documentName: string;
  onClose: () => void;
  onSigned: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ documentId, documentName, onClose, onSigned }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvas.width,
      y: ((point.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    hasDrawn.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  };

  const handleSave = async () => {
    if (!hasDrawn.current) {
      toast.error('Please draw your signature first');
      return;
    }
    const dataUrl = canvasRef.current!.toDataURL('image/png');
    setSaving(true);
    try {
      const data = await documentAPI.signDocument(documentId, dataUrl);
      if (!data.success) throw new Error(data.message || 'Failed to save signature');
      toast.success('Document signed successfully');
      onSigned();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-gray-900 mb-1">E-sign document</h3>
        <p className="text-sm text-gray-500 mb-4 truncate">{documentName}</p>

        <canvas
          ref={canvasRef}
          width={480}
          height={200}
          className="w-full border border-gray-300 rounded-md cursor-crosshair touch-none bg-white"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />

        <div className="flex justify-between items-center mt-4">
          <Button variant="outline" size="sm" onClick={clear}>Clear</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Save signature</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

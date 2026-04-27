'use client';

import { useState, useEffect } from 'react';
import { Download, AlertCircle, X } from 'lucide-react';

interface Props {
  onExport: () => void;
}

export default function BackupReminder({ onExport }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const REMINDER_INTERVAL = 30 * 60 * 1000; // 30 minutos

  useEffect(() => {
    // Verificar cuándo fue la última vez que se mostró
    const lastSeen = localStorage.getItem('cualidoso_last_reminder');
    const now = Date.now();

    if (!lastSeen || now - parseInt(lastSeen) > REMINDER_INTERVAL) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000); // Aparece 5 segundos después de entrar
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('cualidoso_last_reminder', Date.now().toString());
  };

  const handleExport = () => {
    onExport();
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-up no-print">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center gap-4 max-w-lg w-full">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0" style={{ color: 'var(--accent)' }}>
          <AlertCircle size={20} />
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-bold">¡Protege tu investigación!</h4>
          <p className="text-[11px] opacity-70 leading-tight">
            Tus datos solo viven en este navegador. Descarga un archivo de respaldo para no perder tu trabajo si cambias de equipo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExport}
            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download size={13} /> Respaldar ahora
          </button>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

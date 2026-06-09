import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      // Add a slight delay to not show exactly on load
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
      setShowPrompt(false);
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-slate-800 border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-0.5">Install OMG TV</h3>
            <p className="text-xs text-slate-400 truncate">Add to home screen for quick access</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={handleInstallClick}
              className="text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-900 px-3 py-2 rounded-lg transition-colors"
            >
              Install
            </button>
            <button 
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

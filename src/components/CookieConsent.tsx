import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted/declined cookies
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Show short delay before taking over
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else if (consent === 'accepted') {
      updateGtagConsent('granted');
    }
  }, []);

  const updateGtagConsent = (status: 'granted' | 'denied') => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': status,
        'ad_storage': status,
        'ad_user_data': status,
        'ad_personalization': status
      });
    }
  };

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    updateGtagConsent('granted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    updateGtagConsent('denied');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] p-5 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
          
          <div className="flex gap-4 items-start">
            <div className="bg-cyan-500/10 p-2 rounded-xl text-cyan-400 mt-1">
              <Cookie className="w-6 h-6" />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-slate-100">We value your privacy</h3>
                <button onClick={handleDecline} className="text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                We use cookies to enhance your experience and analyze our traffic. By clicking "Accept", you consent to our use of cookies.
              </p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleDecline}
                  variant="outline"
                  className="h-8 text-xs flex-1 bg-transparent border-white/10 hover:bg-white/5 text-slate-300"
                >
                  Decline
                </Button>
                <Button 
                  onClick={handleAccept}
                  className="h-8 text-xs flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

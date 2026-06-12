import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, X } from 'lucide-react';

interface TermsAgreementModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onClose: () => void;
}

export function TermsAgreementModal({ isOpen, onAgree, onClose }: TermsAgreementModalProps) {
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedResponsibility, setAgreedResponsibility] = useState(false);

  // Reset checkboxes on open
  React.useEffect(() => {
    if (isOpen) {
      setAgreedPrivacy(false);
      setAgreedResponsibility(false);
    }
  }, [isOpen]);

  const handleAgree = () => {
    if (agreedPrivacy && agreedResponsibility) {
      localStorage.setItem('omgtv_terms_agreed', 'true');
      onAgree();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-y-auto p-5 sm:p-8 flex flex-col gap-5 sm:gap-6"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome to OMG TV</h2>
                <p className="text-slate-400 text-sm">
                  Before you begin, please review our community guidelines to ensure a safe and respectful environment for everyone.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-black/20 rounded-2xl p-4 border border-white/5">
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="relative flex items-center justify-center w-6 h-6 shrink-0 mt-0.5">
                  <input 
                    type="checkbox" 
                    className="peer appearance-none w-6 h-6 rounded-md bg-slate-800 border-2 border-slate-600 checked:border-cyan-500 checked:bg-cyan-500 transition-colors focus:ring-0 focus:outline-none"
                    checked={agreedPrivacy}
                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  />
                  <ShieldCheck className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <div className="flex flex-col text-sm">
                  <span className="font-medium text-slate-200 group-hover:text-white transition-colors">I accept the Privacy Policy & Terms of Service</span>
                  <span className="text-slate-500 mt-1">
                    I understand how my data is handled. Read the <a href="/privacy/" target="_blank" className="text-cyan-400 hover:underline">Privacy Policy</a>.
                  </span>
                </div>
              </label>

              <div className="h-px w-full bg-white/5 my-1" />

              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="relative flex items-center justify-center w-6 h-6 shrink-0 mt-0.5">
                  <input 
                    type="checkbox" 
                    className="peer appearance-none w-6 h-6 rounded-md bg-slate-800 border-2 border-slate-600 checked:border-cyan-500 checked:bg-cyan-500 transition-colors focus:ring-0 focus:outline-none"
                    checked={agreedResponsibility}
                    onChange={(e) => setAgreedResponsibility(e.target.checked)}
                  />
                  <ShieldAlert className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <div className="flex flex-col text-sm">
                  <span className="font-medium text-slate-200 group-hover:text-white transition-colors">I am responsible for my own safety</span>
                  <span className="text-slate-500 mt-1">
                    I agree to follow the <a href="/safety/" target="_blank" className="text-cyan-400 hover:underline">Safety Guidelines</a>. I am 18+ and will not share personal details, maintaining my own anonymity and security.
                  </span>
                </div>
              </label>
            </div>

            <Button 
              onClick={handleAgree}
              disabled={!agreedPrivacy || !agreedResponsibility}
              className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              I Agree & Continue
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

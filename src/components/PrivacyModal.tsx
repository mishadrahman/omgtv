import React from 'react';
import { X, Lock, EyeOff, Server, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-10"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Privacy Policy</h2>
          </div>

          <div className="space-y-8 text-slate-300 leading-relaxed">
            <p className="text-sm text-slate-400">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                1. Data We Collect
              </h3>
              <p>
                We do not require you to create an account or provide personal information to use the basic features of our app. We anonymously assign you an ID to facilitate the matchmaking process. 
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-indigo-400" />
                2. Video & Audio Data
              </h3>
              <p>
                Video and audio streams are transmitted securely directly between you and your match using peer-to-peer (WebRTC) technology. We do not record, store, or monitor your video or audio communications.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-green-400" />
                3. Chat Messages
              </h3>
              <p>
                Text messages sent during a session are temporarily routed through our servers to deliver them to your partner. We automatically delete session metadata and chat messages after the session ends.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-400" />
                4. Your Metadata
              </h3>
              <p>
                We may log basic connection metadata (such as IP addresses and timestamps) strictly for the purpose of maintaining service stability, preventing abuse, and enforcing our security policies.
              </p>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

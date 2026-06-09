import React from 'react';
import { X, Shield, AlertTriangle, Eye, ShieldCheck, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SafetyModal({ isOpen, onClose }: SafetyModalProps) {
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Safety Guidelines</h2>
          </div>

          <div className="space-y-8 text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                1. No Inappropriate Content
              </h3>
              <p>
                Strictly no nudity, sexual content, or violence. Any violation of these terms will result in an immediate and permanent ban. Our systems and human moderators are actively looking for violations.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-500" />
                2. No Bullying or Harassment
              </h3>
              <p>
                Treat everyone with respect. Do not insult, threaten, or harass other users. Hate speech, discrimination, and personal attacks are completely unacceptable.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                3. Keep Personal Info Private
              </h3>
              <p>
                Do not share personal information like your full name, phone number, address, social media links, or financial details. We will never ask for your personal information in our app.
              </p>
            </section>
            
            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                4. Report Bad Behavior
              </h3>
              <p>
                If someone makes you uncomfortable, breaks these rules, or behaves inappropriately, please skip them immediately and use the &quot;Report&quot; button. Your reports help keep the community safe.
              </p>
            </section>

            <div className="mt-8 p-6 bg-cyan-950/30 border border-cyan-500/20 rounded-2xl">
              <p className="text-sm text-cyan-200">
                <strong>Remember:</strong> You are in control. If you encounter any situation you do not like, simply click &quot;NEXT&quot; or &quot;STOP&quot; to leave the chat.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

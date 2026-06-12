import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Video, VideoOff, Mic, MicOff, SkipForward, MessageSquare, AlertTriangle, X, Shield, Activity, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { auth, loginAnonymously } from './firebase';
import { useMatchmaking, MatchType } from './hooks/useMatchmaking';
import { useChat } from './hooks/useChat';
import { useLocalVideo } from './hooks/useLocalVideo';
import { useWebRTC } from './hooks/useWebRTC';
import { onAuthStateChanged } from 'firebase/auth';

const SafetyModal = lazy(() => import('./components/SafetyModal').then(module => ({ default: module.SafetyModal })));
const PrivacyModal = lazy(() => import('./components/PrivacyModal').then(module => ({ default: module.PrivacyModal })));
const InstallPrompt = lazy(() => import('./components/InstallPrompt').then(module => ({ default: module.InstallPrompt })));
const CookieConsent = lazy(() => import('./components/CookieConsent').then(module => ({ default: module.CookieConsent })));
const TermsAgreementModal = lazy(() => import('./components/TermsAgreementModal').then(module => ({ default: module.TermsAgreementModal })));

type AppState = 'landing' | 'searching' | 'chat';

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { isSearching, activeSessionId, startSearch, stopSearch, leaveSession } = useMatchmaking();
  const { messages, sessionInfo, sendMessage, strangerId, messagesEndRef } = useChat(activeSessionId);
  const [messageInput, setMessageInput] = useState('');
  
  const [currentMatchType, setCurrentMatchType] = useState<MatchType>('video');

  // Derive app state synchronously
  const appState: AppState = isSearching ? 'searching' : activeSessionId ? 'chat' : 'landing';

  // Local Video Setup
  const isVideoMatch = currentMatchType === 'video';
  const shouldStartMedia = appState !== 'landing' && isVideoMatch;
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const { localVideoRef, localStream, hasVideo, isReady: isLocalVideoReady } = useLocalVideo(shouldStartMedia, isCamOn, isMicOn);
  const [showChatPanel, setShowChatPanel] = useState(true);
  
  const [showSafety, setShowSafety] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [pendingMatchType, setPendingMatchType] = useState<MatchType | null>(null);

  // WebRTC Setup
  const shouldConnectWebRTC = isVideoMatch ? (isLocalVideoReady ? activeSessionId : null) : null;
  const { remoteVideoRef, hasRemoteVideo } = useWebRTC(shouldConnectWebRTC, localStream);
  
  useEffect(() => {
    const bindStream = () => {
      if (localVideoRef.current && localStream && localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(e => console.log('play error', e));
      }
    };
    bindStream();
    const intervalId = setInterval(bindStream, 300);
    return () => clearInterval(intervalId);
  }, [localStream, appState]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await loginAnonymously();
        } catch (err: any) {
          console.error(err);
          setLoginError(err.message || 'Authentication failed. Please check Firebase settings.');
        }
      } else {
        setIsAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Prevent accidental reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (appState !== 'landing') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [appState]);

  // Handle remotely ended session
  useEffect(() => {
    if (appState === 'chat' && sessionInfo?.status === 'ended') {
      const autoNext = async () => {
        await leaveSession();
        await startSearch(currentMatchType);
      };
      autoNext();
    }
  }, [sessionInfo?.status, appState, currentMatchType]);

  const handleStart = async (type: MatchType) => {
    if (!isAuthReady) return;
    
    if (!localStorage.getItem('omgtv_terms_agreed')) {
      setPendingMatchType(type);
      setShowTerms(true);
      return;
    }
    
    setCurrentMatchType(type);
    await startSearch(type);
  };

  const handleTermsAgree = async () => {
    setShowTerms(false);
    if (pendingMatchType) {
      setCurrentMatchType(pendingMatchType);
      await startSearch(pendingMatchType);
      setPendingMatchType(null);
    }
  };

  const handleCancelSearch = async () => {
    await stopSearch();
  };

  const handleNext = async () => {
    if (window.confirm("Are you sure you want to skip to the next person?")) {
      await leaveSession();
      await startSearch(currentMatchType);
    }
  };

  const handleStop = async () => {
    if (window.confirm("Are you sure you want to stop the chat?")) {
      await leaveSession();
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
    }
  };

  return (
    <div className="fixed inset-0 w-full bg-[#05070A] text-slate-100 font-sans overflow-hidden flex flex-col items-center select-none">
      <AnimatePresence mode="wait">
        
        {/* Landing Page */}
        {appState === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-6"
          >
            <div className="fixed top-6 left-6 z-50 flex items-center gap-3">
              <img src="https://i.ibb.co.com/rRBpk1rZ/logo.webp" alt="OMG TV Logo" width="40" height="40" fetchPriority="high" decoding="async" className="w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">OMG TV</span>
            </div>

            <div className="text-center space-y-8 max-w-2xl w-full">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <h1 className="text-4xl sm:text-7xl font-bold tracking-tighter mb-4">
                  Meet random<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                    people instantly.
                  </span>
                </h1>
                <p className="text-slate-400 text-sm sm:text-lg max-w-lg mx-auto px-4">
                  Experience next-generation anonymous video and text chat. No signups, no tracking. Just instant connections.
                </p>
              </motion.div>

              <div className="pt-8 flex flex-col items-center w-full">
                {loginError ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-sm text-center max-w-lg mb-4">
                    <Shield className="w-5 h-5 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold mb-1">Firebase Authentication Required</p>
                    {loginError.includes('admin-restricted-operation') ? (
                      <p>Please open the Firebase Console, go to <strong>Authentication &gt; Sign-in method</strong>, and enable <strong>Anonymous</strong> sign-in.</p>
                    ) : loginError.includes('network-request-failed') ? (
                      <p>Please ensure your app domain is added to <strong>Authorized domains</strong> in the Firebase Auth settings, or check your connection.</p>
                    ) : (
                      <p>{loginError}</p>
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                  <Button 
                    onClick={() => handleStart('text')}
                    disabled={!isAuthReady}
                    className="h-14 sm:h-16 px-8 rounded-full font-bold text-lg bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    <MessageSquare className="w-5 h-5 mr-3 text-cyan-400" />
                    {isAuthReady ? "Just Messaging" : (loginError ? "Unavailable" : "Connecting...")}
                  </Button>

                  <Button 
                    onClick={() => handleStart('video')}
                    disabled={!isAuthReady}
                    className="h-16 sm:h-20 px-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full font-black text-xl tracking-tighter text-white shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Video className="w-6 h-6 mr-3" />
                    {isAuthReady ? "Video Call + Messaging" : (loginError ? "Unavailable" : "Connecting...")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-6 flex gap-6 text-sm text-slate-500">
              <div 
                onClick={() => setShowSafety(true)}
                className="flex items-center gap-2 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <Shield className="w-4 h-4" /> Safety Guidelines
              </div>
              <div 
                onClick={() => setShowPrivacy(true)}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                Privacy Policy
              </div>
            </div>
          </motion.div>
        )}

        {/* Searching Page */}
        {appState === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 w-full flex flex-col items-center justify-center p-6 relative"
          >
            <div className="fixed top-6 left-6 z-50 flex items-center gap-3">
              <img src="https://i.ibb.co.com/rRBpk1rZ/logo.webp" alt="OMG TV Logo" width="40" height="40" decoding="async" className="w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">OMG TV</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
               <div className="w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" />
            </div>
            
            <div className="z-10 flex flex-col items-center space-y-8">
              <div className="w-32 h-32 rounded-full border border-cyan-400/30 flex items-center justify-center bg-cyan-400/5 relative shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/40 animate-[spin_4s_linear_infinite]"></div>
                {isVideoMatch ? (
                    <Video className="w-12 h-12 text-cyan-400 animate-pulse" />
                ) : (
                    <MessageSquare className="w-12 h-12 text-cyan-400 animate-pulse" />
                )}
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-medium mb-2 tracking-tight">Finding someone for you...</h2>
                <p className="text-slate-400">Please wait while we match you with a stranger.</p>
              </div>

              <Button 
                variant="outline" 
                onClick={handleCancelSearch}
                className="mt-8 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full px-8 h-12 transition-all"
                id="btn-cancel-search"
              >
                Cancel Search
              </Button>
            </div>
          </motion.div>
        )}

        {/* Chat Interface */}
        {appState === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 w-full h-full flex flex-col max-w-7xl mx-auto overflow-hidden relative"
          >
            {/* Header Navigation for Chat */}
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-8 bg-black/40 border-b border-white/5 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <img src="https://i.ibb.co.com/rRBpk1rZ/logo.webp" alt="OMG TV Logo" width="40" height="40" decoding="async" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
                <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 hidden sm:block">OMG TV</h1>
              </div>
              <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-widest items-center">
                <span className="hidden sm:inline hover:text-cyan-400 transition-colors cursor-pointer">Safety</span>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] text-green-500 uppercase">Live</span>
                </div>
              </div>
            </motion.header>

            {/* Main Content Split */}
            <main className={`flex-1 flex flex-col sm:flex-row p-2 sm:p-6 gap-2 sm:gap-6 overflow-hidden min-h-0 ${!isVideoMatch ? 'max-w-3xl mx-auto w-full' : ''}`}>
              
              {/* Video Area (Left) - Only show if it's a video match */}
              {isVideoMatch && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                    className={`relative bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 group shadow-2xl flex-none sm:flex-1 ${showChatPanel ? 'h-[40vh] sm:h-auto min-h-[200px]' : 'h-full flex-1'}`}
                  >
                    {!hasRemoteVideo ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 flex flex-col items-center justify-center">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-cyan-400/30 flex items-center justify-center bg-cyan-400/5 relative">
                          <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/20 animate-[spin_4s_linear_infinite]"></div>
                          <Video className="w-8 h-8 sm:w-16 sm:h-16 text-cyan-400 opacity-20" />
                        </div>
                        <p className="mt-4 text-cyan-400/60 font-mono text-[10px] sm:text-xs uppercase tracking-widest">Waiting for Stranger Video...</p>
                      </div>
                    ) : (
                      <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    {/* Overlay Labels */}
                    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex gap-2 z-30">
                      <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></span>
                        LIVE
                      </span>
                      <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-[10px] sm:text-xs font-medium text-slate-300">
                        Stranger {strangerId ? strangerId.substring(0, 4) : '...'}
                      </span>
                    </div>

                    {/* PiP Self View Overlay */}
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-24 sm:w-48 aspect-[3/4] sm:aspect-video bg-slate-900 rounded-xl sm:rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-30">
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                         {!isCamOn ? (
                            <VideoOff className="w-6 h-6 text-slate-600" />
                         ) : (
                            <p className="text-[8px] sm:text-[10px] text-slate-500 uppercase text-center">Camera...</p>
                         )}
                      </div>
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 scale-x-[-1] ${hasVideo && isCamOn ? 'opacity-100' : 'opacity-0'}`}
                      />
                      <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 px-1.5 py-0.5 bg-black/60 rounded-md text-[8px] sm:text-[9px] font-bold text-white z-10">YOU</div>
                      {!isMicOn && (
                         <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 p-0.5 sm:px-2 sm:py-1 bg-red-500/80 rounded-md z-10">
                           <MicOff className="w-3 h-3 text-white" />
                         </div>
                      )}
                    </div>

                    {/* Watermark */}
                    <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 opacity-10 pointer-events-none z-10">
                      <span className="text-xl sm:text-2xl font-black italic">OMG TV</span>
                    </div>
                    
                    {/* Mobile Chat Toggle Button */}
                    <Button 
                       size="icon"
                       variant="ghost" 
                       onClick={() => setShowChatPanel(!showChatPanel)}
                       className={`absolute bottom-4 right-4 z-40 rounded-full w-12 h-12 transition-colors sm:hidden ${showChatPanel ? 'bg-cyan-500/20 text-cyan-400' : 'bg-black/50 text-white border border-white/10'}`}
                       id="btn-toggle-chat"
                    >
                       <MessageSquare className="w-5 h-5" />
                    </Button>
                  </motion.div>
              )}

              {/* Interaction Sidebar/Main Chat */}
              <AnimatePresence>
                {(showChatPanel || !isVideoMatch) && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                    className={`flex flex-col gap-2 sm:gap-6 z-30 min-h-0 shrink ${isVideoMatch ? 'flex-1 sm:flex-none sm:w-80 sm:h-full' : 'w-full flex-1 h-full'}`}
                  >
                    
                    {/* Chat Messages Area */}
                    <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl sm:rounded-3xl flex flex-col p-3 sm:p-4 backdrop-blur-sm overflow-hidden min-h-0 shadow-xl">
                      
                      <div className="flex-1 overflow-y-auto pr-2 pb-2">
                        <div className="flex flex-col space-y-4">
                          <div className="flex flex-col gap-1 pb-2">
                            <span className="text-[10px] font-bold text-cyan-400 uppercase">System</span>
                            <p className="text-sm text-slate-300 italic">You are now talking to a stranger. Say hi!</p>
                          </div>
                          
                          {messages.map((msg) => {
                            const isMe = msg.senderId === auth.currentUser?.uid;
                            return isMe ? (
                              <div key={msg.id} className="flex flex-col gap-1 items-end">
                                <span className="text-[10px] font-bold text-blue-400 uppercase">You</span>
                                <div className="bg-blue-600/20 p-2.5 sm:p-3 rounded-2xl rounded-tr-none border border-blue-500/30">
                                  <p className="text-sm text-blue-50 font-medium break-words max-w-[200px] sm:max-w-xs">{msg.text}</p>
                                </div>
                              </div>
                            ) : (
                              <div key={msg.id} className="flex flex-col gap-1 items-start">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Stranger</span>
                                <div className="bg-slate-800/50 p-2.5 sm:p-3 rounded-2xl rounded-tl-none border border-white/5">
                                  <p className="text-sm break-words max-w-[200px] sm:max-w-xs">{msg.text}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} className="h-4" />
                        </div>
                      </div>
                      
                      {/* Message Input */}
                      <form onSubmit={handleSend} className="mt-2 sm:mt-4 relative shrink-0">
                        <input 
                          type="text" 
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type a message..." 
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-cyan-400/50 transition-all text-white placeholder:text-slate-500" 
                          autoComplete="off"
                        />
                        <button type="submit" disabled={!messageInput.trim()} className="absolute right-2 top-2 p-1.5 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors">
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Control Bar */}
            <motion.footer 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              className="h-20 sm:h-24 px-4 sm:px-8 flex items-center justify-between bg-black/60 border-t border-white/5 backdrop-blur-2xl shrink-0"
            >
              
              {/* Settings Group */}
              <div className="flex items-center gap-2 sm:gap-3 sm:w-[280px]">
                {isVideoMatch && (
                    <>
                        <button 
                        onClick={() => setIsCamOn(!isCamOn)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all ${isCamOn ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
                        >
                        {isCamOn ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                        <button 
                        onClick={() => setIsMicOn(!isMicOn)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all ${isMicOn ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
                        >
                        {isMicOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                    </>
                )}
              </div>

              {/* Primary Action */}
              <div className="flex items-center gap-1 sm:gap-4 justify-center flex-1 sm:flex-none">
                 <button onClick={handleStop} className="group h-10 sm:h-16 px-3 sm:px-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-full font-black text-[10px] sm:text-xl tracking-tighter flex items-center justify-center gap-1 sm:gap-3 shadow-[0_0_20px_rgba(220,38,38,0.3)] sm:shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95 transition-all flex-1 sm:flex-none min-w-0">
                  <span className="truncate">STOP</span>
                  <div className="w-3 h-3 sm:w-6 sm:h-6 bg-white/20 rounded-sm sm:rounded-lg flex items-center justify-center shrink-0">
                     <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-white"></div>
                  </div>
                 </button>
                 <button onClick={handleNext} className="group h-10 sm:h-16 px-3 sm:px-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full font-black text-[10px] sm:text-xl tracking-tighter flex items-center justify-center gap-1 sm:gap-3 shadow-[0_0_20px_rgba(6,182,212,0.3)] sm:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all flex-1 sm:flex-none min-w-0">
                  <span className="truncate">NEXT</span>
                  <SkipForward className="w-3 h-3 sm:w-6 sm:h-6 fill-current shrink-0" />
                 </button>
              </div>

              {/* Utility/Report Group */}
              <div className="hidden sm:flex items-center justify-end gap-3 sm:w-[280px]">
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  REPORT
                </button>
              </div>
            </motion.footer>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Suspense fallback={null}>
        <SafetyModal isOpen={showSafety} onClose={() => setShowSafety(false)} />
        <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
        <InstallPrompt />
        <CookieConsent />
        <TermsAgreementModal 
          isOpen={showTerms} 
          onAgree={handleTermsAgree} 
          onClose={() => setShowTerms(false)} 
        />
      </Suspense>
    </div>
  );
}

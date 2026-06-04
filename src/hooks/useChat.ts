import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ChatMessage, ChatSession } from '../types';
import { OperationType, handleFirestoreError } from '../lib/firebase-utils';

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionInfo, setSessionInfo] = useState<ChatSession | null>(null);
  const [strangerId, setStrangerId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId || !auth.currentUser) {
      setMessages([]);
      setSessionInfo(null);
      setStrangerId(null);
      return;
    }

    const myUid = auth.currentUser.uid;
    const sessionRef = doc(db, 'sessions', sessionId);
    
    // Listen to session info (for 'ended' status)
    const unsubSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ChatSession;
        setSessionInfo(data);
        const otherParticipant = data.participants.find(id => id !== myUid);
        if (otherParticipant) {
          setStrangerId(otherParticipant);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `sessions/${sessionId}`, auth));

    // Listen to messages
    const messagesRef = collection(db, `sessions/${sessionId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach(docSnap => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `sessions/${sessionId}/messages`, auth));

    return () => {
      unsubSession();
      unsubMessages();
    };
  }, [sessionId]);

  const sendMessage = async (text: string) => {
    if (!sessionId || !text.trim() || !auth.currentUser || sessionInfo?.status === 'ended') return;
    
    const messagesRef = collection(db, `sessions/${sessionId}/messages`);
    try {
      await addDoc(messagesRef, {
        senderId: auth.currentUser.uid,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `sessions/${sessionId}/messages`, auth);
    }
  };

  return { messages, sessionInfo, sendMessage, strangerId, messagesEndRef };
}

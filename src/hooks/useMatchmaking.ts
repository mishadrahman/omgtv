import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, limit, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, deleteDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OperationType, handleFirestoreError } from '../lib/firebase-utils';

export type MatchType = 'text' | 'video';

export function useMatchmaking() {
  const [isSearching, setIsSearching] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const unsubscribeQueue = useRef<(() => void) | null>(null);
  const previousMatchUid = useRef<string | null>(null);

  const startSearch = async (matchType: MatchType = 'video') => {
    if (!auth.currentUser) return;
    const myUid = auth.currentUser.uid;
    setIsSearching(true);
    setActiveSessionId(null);

    const queueRef = collection(db, 'queues_v2');
    const q = query(
      queueRef, 
      where('status', '==', 'waiting'),
      where('matchType', '==', matchType),
      limit(20)
    );

    let matchedSuccessfully = false;

    // First, make sure we are in the queue
    const myQueueRef = doc(db, 'queues_v2', myUid);
    try {
      await deleteDoc(myQueueRef); // clear any stuck state
    } catch(e) {}
    
    try {
      await setDoc(myQueueRef, {
        uid: myUid,
        status: 'waiting',
        matchType: matchType,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `queues_v2/${myUid}`, auth);
    }
    
    let unsubGlobalQueue: (() => void) | null = null;
    let unsubMyQueue: (() => void) | null = null;

    let searchActive = true;

    const cleanupAndFinish = (sessionId: string) => {
       if (matchedSuccessfully) return; // Prevent double-triggering
       matchedSuccessfully = true;
       searchActive = false;
       setIsSearching(false);
       setActiveSessionId(sessionId);
       if (unsubGlobalQueue) unsubGlobalQueue();
       if (unsubMyQueue) unsubMyQueue();
       if (unsubscribeQueue.current) unsubscribeQueue.current();
       unsubscribeQueue.current = null;
       deleteDoc(myQueueRef).catch(() => {}); // Clean up our entry
    };

    try {
      // Listen to our own queue document to see if someone else matched us
      unsubMyQueue = onSnapshot(myQueueRef, (docSnap) => {
        if (docSnap.exists() && !matchedSuccessfully) {
          const data = docSnap.data();
          if (data.status === 'matched' && data.sessionId) {
            cleanupAndFinish(data.sessionId);
          }
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, `queues_v2/${myUid}`, auth));

      unsubGlobalQueue = onSnapshot(q, async (snapshot) => {
        if (matchedSuccessfully || !searchActive) return;

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (docSnap.id === myUid || docSnap.id === previousMatchUid.current || data.matchType !== matchType) continue;
          
          const candidateUid = docSnap.id;
          const candidateRef = docSnap.ref;
          
          try {
            const batch = writeBatch(db);
            const sessionRef = doc(collection(db, 'sessions'));
            const newSessionId = sessionRef.id;

            // Pre-create session
            batch.set(sessionRef, {
              participants: [candidateUid, myUid],
              matchType: matchType,
              status: 'active',
              createdAt: serverTimestamp()
            });

            // Try to claim candidate
            batch.update(candidateRef, {
              status: 'matched',
              sessionId: newSessionId
            });

            try {
              await batch.commit();
              // We won the lock!
              previousMatchUid.current = candidateUid;
              cleanupAndFinish(newSessionId);
              break;
            } catch (updateErr) {
              console.warn("Failed to claim candidate:", updateErr);
            }
          } catch (e: any) {
            console.error("Session creation failed:", e);
          }
        }
      }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'queues_v2', auth);
      });

      // Override the main unsubscribe so the component can stop it if user cancels
      unsubscribeQueue.current = () => {
        searchActive = false;
        if (unsubGlobalQueue) unsubGlobalQueue();
        if (unsubMyQueue) unsubMyQueue();
        matchedSuccessfully = true;
      };

    } catch (e) {
      console.error(e);
      setIsSearching(false);
      handleFirestoreError(e, OperationType.LIST, 'queues_v2', auth);
    }
  };

  const stopSearch = async () => {
    if (!auth.currentUser) return;
    setIsSearching(false);
    if (unsubscribeQueue.current) {
      unsubscribeQueue.current();
      unsubscribeQueue.current = null;
    }
    try {
      await deleteDoc(doc(db, 'queues_v2', auth.currentUser.uid));
    } catch (e) {
      console.warn("Could not delete queue entry on stop", e);
    }
  };

  const leaveSession = async () => {
    if (!activeSessionId) return;
    const sid = activeSessionId;
    setActiveSessionId(null);
    try {
      await updateDoc(doc(db, 'sessions', sid), {
        status: 'ended'
      });
    } catch (e) {
      console.warn("Could not mark session as ended", e);
    }
  };

  useEffect(() => {
    return () => {
      if (unsubscribeQueue.current) {
        unsubscribeQueue.current();
      }
      if (auth.currentUser) {
        deleteDoc(doc(db, 'queue', auth.currentUser.uid)).catch(() => {});
      }
    };
  }, []);

  return { isSearching, activeSessionId, startSearch, stopSearch, leaveSession };
}

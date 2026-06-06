import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, limit, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
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

    try {
      const snapshot = await getDocs(q);
      
      let matchedSuccessfully = false;

      // Try to match with someone
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (docSnap.id === myUid || docSnap.id === previousMatchUid.current || data.matchType !== matchType) continue;
        
        const candidateUid = docSnap.id;
        const candidateRef = docSnap.ref;
        const newSessionId = doc(collection(db, 'sessions')).id;
        
        try {
          // pre-create session
          await setDoc(doc(db, 'sessions', newSessionId), {
            participants: [candidateUid, myUid],
            matchType: matchType,
            status: 'active',
            createdAt: serverTimestamp()
          });

          try {
            // try to claim candidate
            await updateDoc(candidateRef, {
              status: 'matched',
              sessionId: newSessionId
            });

            // If we successfully updated the candidate, we won the lock!
            matchedSuccessfully = true;
            previousMatchUid.current = candidateUid;
            setIsSearching(false);
            setActiveSessionId(newSessionId);
            break; // Break out of the loop
          } catch (updateErr) {
            console.warn("Failed to claim candidate (they were likely matched by someone else):", updateErr);
            // Delete the orphaned session as we failed to claim the candidate
            await updateDoc(doc(db, 'sessions', newSessionId), { status: 'ended' }).catch(() => {});
            // Continue the loop to try the next candidate
          }
        } catch (e: any) {
          console.error("Session creation failed:", e);
        }
      }

      if (!matchedSuccessfully) {
        // Nobody found, add ourselves to queue
        const myQueueRef = doc(db, 'queues_v2', myUid);
        
        // Hard-delete any stuck queue entry
        try {
          await deleteDoc(myQueueRef);
        } catch (e) {
          // ignore
        }

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

        // Listen for changes
        if (unsubscribeQueue.current) {
          unsubscribeQueue.current();
          unsubscribeQueue.current = null;
        }

        unsubscribeQueue.current = onSnapshot(myQueueRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'matched' && data.sessionId) {
              // We got matched!
              setIsSearching(false);
              setActiveSessionId(data.sessionId);
              
              // Clean up queue entry
              deleteDoc(myQueueRef).catch(console.error);
              
              if (unsubscribeQueue.current) {
                unsubscribeQueue.current();
                unsubscribeQueue.current = null;
              }
            }
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, `queues_v2/${myUid}`, auth));
      }
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

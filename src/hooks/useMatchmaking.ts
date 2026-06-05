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

    const queueRef = collection(db, 'queue');
    const q = query(
      queueRef, 
      where('status', '==', 'waiting'),
      where('matchType', '==', matchType),
      limit(10)
    );

    try {
      const snapshot = await getDocs(q);
      
      let matchedSuccessfully = false;

      // Try to match with someone using a transaction to avoid race conditions
      for (const docSnap of snapshot.docs) {
        if (docSnap.id === myUid || docSnap.id === previousMatchUid.current) continue;
        
        const candidateUid = docSnap.id;
        const candidateRef = docSnap.ref;
        const newSessionId = doc(collection(db, 'sessions')).id;
        
        try {
          await runTransaction(db, async (transaction) => {
            const candidateDoc = await transaction.get(candidateRef);
            if (!candidateDoc.exists()) {
              throw new Error("Document does not exist!");
            }
            const data = candidateDoc.data();
            if (data.status !== 'waiting') {
              throw new Error("Already matched");
            }
            
            // Candidate is available!
            // Create the session
            const sessionRef = doc(db, 'sessions', newSessionId);
            transaction.set(sessionRef, {
              participants: [candidateUid, myUid],
              matchType: matchType,
              status: 'active',
              createdAt: serverTimestamp()
            });

            // Update candidate
            transaction.update(candidateRef, {
              status: 'matched',
              sessionId: newSessionId
            });
          });

          // If transaction succeeds:
          matchedSuccessfully = true;
          previousMatchUid.current = candidateUid;
          setIsSearching(false);
          setActiveSessionId(newSessionId);
          break; // break out of the loop
        } catch (e) {
          console.log("Transaction failed, candidate taken or error:", e);
          // Try the next candidate
        }
      }

      if (!matchedSuccessfully) {
        // Nobody found, add ourselves to queue
        const myQueueRef = doc(db, 'queue', myUid);
        
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
          handleFirestoreError(e, OperationType.CREATE, `queue/${myUid}`, auth);
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
        }, (err) => handleFirestoreError(err, OperationType.GET, `queue/${myUid}`, auth));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'queue', auth);
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
      await deleteDoc(doc(db, 'queue', auth.currentUser.uid));
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

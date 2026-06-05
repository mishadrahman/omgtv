import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, limit, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OperationType, handleFirestoreError } from '../lib/firebase-utils';

export function useMatchmaking() {
  const [isSearching, setIsSearching] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const unsubscribeQueue = useRef<(() => void) | null>(null);

  const startSearch = async () => {
    if (!auth.currentUser) return;
    const myUid = auth.currentUser.uid;
    setIsSearching(true);
    setActiveSessionId(null);

    const queueRef = collection(db, 'queue');
    const q = query(queueRef, where('status', '==', 'waiting'), limit(5));

    try {
      const snapshot = await getDocs(q);
      let matchUid = null;
      let matchedDocRef = null;

      for (const docSnap of snapshot.docs) {
        if (docSnap.id !== myUid) {
          matchUid = docSnap.id;
          matchedDocRef = docSnap.ref;
          break;
        }
      }

      if (matchUid && matchedDocRef) {
        // Found someone!
        const newSessionId = doc(collection(db, 'sessions')).id;
        
        // 1. Create session
        try {
          await setDoc(doc(db, 'sessions', newSessionId), {
            participants: [matchUid, myUid],
            status: 'active',
            createdAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `sessions/${newSessionId}`, auth);
        }

        // 2. Update their queue entry
        try {
          await updateDoc(matchedDocRef, {
            status: 'matched',
            sessionId: newSessionId
          });
        } catch (e) {
          // If update fails (e.g. they were matched by someone else first, or they deleted it),
          // We can fallback to searching again
          console.warn("Failed to match with user, they might be gone. Retrying...");
          // Cleanup session that was created
          await updateDoc(doc(db, 'sessions', newSessionId), { status: 'ended' });
          // Retry
          return startSearch();
        }

        setIsSearching(false);
        setActiveSessionId(newSessionId);
      } else {
        // Nobody found, add ourselves to queue
        const myQueueRef = doc(db, 'queue', myUid);
        try {
          await setDoc(myQueueRef, {
            uid: myUid,
            status: 'waiting',
            createdAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `queue/${myUid}`, auth);
        }

        // Listen for changes
        unsubscribeQueue.current = onSnapshot(myQueueRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'matched' && data.sessionId) {
              // We got matched!
              setIsSearching(false);
              setActiveSessionId(data.sessionId);
              
              // Clean up queue entry (if security rules allow, else we just leave it or let the matcher do it)
              // We'll let the user delete their own doc since rules allow it.
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
    // Cleanup on unmount
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

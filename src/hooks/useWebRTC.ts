import { useEffect, useRef, useState } from 'react';
import { doc, updateDoc, onSnapshot, collection, addDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export function useWebRTC(sessionId: string | null, localStream: MediaStream | null) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!sessionId || !auth.currentUser) {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      setRemoteStream(null);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      return;
    }

    const myUid = auth.currentUser.uid;
    const sessionDocRef = doc(db, 'sessions', sessionId);

    let isCaller = false;
    let pc: RTCPeerConnection;
    let unsubSession: () => void;
    let unsubCandidates: () => void;

    const initConnection = async () => {
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
        ]
      });
      pcRef.current = pc;

      // Add local tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Determine who is caller and who is callee based on participants array in session
      const snap = await getDoc(sessionDocRef);
      if (!snap.exists()) return;
      const data = snap.data();
      isCaller = data.participants[1] === myUid; // The one who created the session is participants[1]

      const callerCandidatesCollection = collection(sessionDocRef, 'callerCandidates');
      const calleeCandidatesCollection = collection(sessionDocRef, 'calleeCandidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(isCaller ? callerCandidatesCollection : calleeCandidatesCollection, event.candidate.toJSON());
        }
      };

      if (isCaller) {
        // Create Offer
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        };

        await updateDoc(sessionDocRef, { offer });

        // Listen for remote answer
        unsubSession = onSnapshot(sessionDocRef, (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data && data.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
          }
        });

        // Listen for callee candidates
        unsubCandidates = onSnapshot(calleeCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              let data = change.doc.data();
              pc.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });
      } else {
        // Callee logic
        // Listen for remote offer
        unsubSession = onSnapshot(sessionDocRef, async (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data && data.offer) {
            const offerDescription = new RTCSessionDescription(data.offer);
            await pc.setRemoteDescription(offerDescription);

            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);

            const answer = {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            };

            await updateDoc(sessionDocRef, { answer });
          }
        });

        // Listen for caller candidates
        unsubCandidates = onSnapshot(callerCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              let data = change.doc.data();
              pc.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });
      }
    };

    initConnection().catch(console.error);

    return () => {
      if (unsubSession) unsubSession();
      if (unsubCandidates) unsubCandidates();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [sessionId, localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef.current]);

  return { remoteVideoRef, hasRemoteVideo: !!remoteStream };
}

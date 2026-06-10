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
    let pendingCandidates: any[] = [];

    const initConnection = async () => {
      console.log("[WebRTC] initConnection started for session:", sessionId, "isCaller pending...");
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
        ]
      });
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => console.log("[WebRTC] ICE Connection State:", pc.iceConnectionState);
      pc.onconnectionstatechange = () => console.log("[WebRTC] Connection State:", pc.connectionState);

      // Add local tracks
      if (localStream) {
        console.log("[WebRTC] Adding local tracks:", localStream.getTracks().length);
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      } else {
        console.warn("[WebRTC] initConnection called with NO localStream");
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log("[WebRTC] ontrack received event:", event);
        if (event.streams && event.streams[0]) {
          console.log("[WebRTC] Setting remote stream.");
          setRemoteStream(event.streams[0]);
        } else {
          console.log("[WebRTC] creating remote stream from track");
          const stream = new MediaStream([event.track]);
          setRemoteStream(stream);
        }
      };

      // Determine who is caller and who is callee based on participants array in session
      const snap = await getDoc(sessionDocRef);
      if (!snap.exists()) {
         console.warn("[WebRTC] Session does not exist!");
         return;
      }
      const data = snap.data();
      isCaller = data.participants[1] === myUid; // The one who created the session is participants[1]
      console.log("[WebRTC] I am", isCaller ? "CALLER" : "CALLEE");

      const callerCandidatesCollection = collection(sessionDocRef, 'callerCandidates');
      const calleeCandidatesCollection = collection(sessionDocRef, 'calleeCandidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] Sending ICE candidate");
          addDoc(isCaller ? callerCandidatesCollection : calleeCandidatesCollection, event.candidate.toJSON());
        }
      };

      if (isCaller) {
        // Create Offer
        console.log("[WebRTC] Creating offer");
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        };

        await updateDoc(sessionDocRef, { offer });
        console.log("[WebRTC] Offer set in DB");

        // Listen for remote answer
        unsubSession = onSnapshot(sessionDocRef, async (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data && data.answer) {
             console.log("[WebRTC] Received Answer from DB");
            const answerDescription = new RTCSessionDescription(data.answer);
            await pc.setRemoteDescription(answerDescription);
            
            pendingCandidates.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
            pendingCandidates = [];
          }
        });

        // Listen for callee candidates
        unsubCandidates = onSnapshot(calleeCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              let data = change.doc.data();
              if (pc.remoteDescription) {
                pc.addIceCandidate(new RTCIceCandidate(data)).catch(console.error);
              } else {
                pendingCandidates.push(data);
              }
            }
          });
        });
      } else {
        // Callee logic
        // Listen for remote offer
        unsubSession = onSnapshot(sessionDocRef, async (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data && data.offer) {
            console.log("[WebRTC] Received Offer from DB");
            const offerDescription = new RTCSessionDescription(data.offer);
            await pc.setRemoteDescription(offerDescription);

            pendingCandidates.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
            pendingCandidates = [];

            console.log("[WebRTC] Creating Answer");
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);

            const answer = {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            };

            await updateDoc(sessionDocRef, { answer });
            console.log("[WebRTC] Answer set in DB");
          }
        });

        // Listen for caller candidates
        unsubCandidates = onSnapshot(callerCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              let data = change.doc.data();
              if (pc.remoteDescription) {
                pc.addIceCandidate(new RTCIceCandidate(data)).catch(console.error);
              } else {
                pendingCandidates.push(data);
              }
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

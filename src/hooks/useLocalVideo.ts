import { useEffect, useRef, useState } from 'react';

export function useLocalVideo(shouldStart: boolean, isCamOn: boolean, isMicOn: boolean) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    if (!shouldStart) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsReady(false);
      return;
    }

    const startMedia = async () => {
      try {
        const str = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStream = str;
        setStream(str);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = str;
        }
      } catch (err) {
        console.error("Camera access denied or unavailable", err);
      } finally {
        setIsReady(true);
      }
    };
    
    startMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [shouldStart]);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = isCamOn);
      stream.getAudioTracks().forEach(t => t.enabled = isMicOn);
    }
  }, [stream, isCamOn, isMicOn]);

  useEffect(() => {
    // Whenever stream is available and the video element is present, make sure it is assigned
    if (localVideoRef.current && stream && localVideoRef.current.srcObject !== stream) {
        localVideoRef.current.srcObject = stream;
    }
  }, [stream, isReady])

  return { localVideoRef, localStream: stream, hasVideo: !!stream, isReady };
}

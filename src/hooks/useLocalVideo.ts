import { useEffect, useRef, useState } from 'react';

export function useLocalVideo(isCamOn: boolean, isMicOn: boolean) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const startMedia = async () => {
      try {
        const str = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStream = str;
        setStream(str);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = str;
          localVideoRef.current.muted = true; // prevent feedback
        }
      } catch (err) {
        console.error("Camera access denied or unavailable", err);
      }
    };
    startMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = isCamOn);
      stream.getAudioTracks().forEach(t => t.enabled = isMicOn);
    }
  }, [stream, isCamOn, isMicOn]);

  return { localVideoRef, hasVideo: !!stream };
}

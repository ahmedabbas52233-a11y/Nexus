import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

type CallType = 'video' | 'audio';

interface IncomingCall {
  fromUserId: number;
  offer: RTCSessionDescriptionInit;
  callType: CallType;
}

interface VideoCallModalProps {
  socket: Socket | null;
  partnerId: number;
  partnerName: string;
  partnerAvatar: string;
  /** Set when the current user is placing the call */
  outgoingInvite: CallType | null;
  /** Set when the current user is receiving a call */
  incomingCall: IncomingCall | null;
  onClose: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  socket,
  partnerId,
  partnerName,
  partnerAvatar,
  outgoingInvite,
  incomingCall,
  onClose
}) => {
  const [status, setStatus] = useState<'calling' | 'ringing' | 'connecting' | 'connected'>(
    incomingCall ? 'ringing' : 'calling'
  );
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState((outgoingInvite ?? incomingCall?.callType) !== 'audio');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }, []);

  const endCall = useCallback(() => {
    socket?.emit('call:end', { toUserId: partnerId });
    cleanup();
    onClose();
  }, [socket, partnerId, cleanup, onClose]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('call:ice-candidate', { toUserId: partnerId, candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('connected');
    };
    pcRef.current = pc;
    return pc;
  }, [socket, partnerId]);

  // Place an outgoing call as soon as the modal mounts
  useEffect(() => {
    if (!socket || !outgoingInvite) return;
    let cancelled = false;

    (async () => {
      try {
        const pc = createPeerConnection();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: outgoingInvite === 'video',
          audio: true
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:invite', { toUserId: partnerId, offer, callType: outgoingInvite });
      } catch (err) {
        console.error('Failed to start outgoing call:', err);
        onClose();
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, outgoingInvite]);

  // Signaling listeners shared by both call directions
  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }: { fromUserId: number; answer: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setStatus('connected');
    };
    const handleIceCandidate = async ({ candidate }: { fromUserId: number; candidate: RTCIceCandidateInit }) => {
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        pendingCandidates.current.push(candidate);
      }
    };
    const handleReject = () => { cleanup(); onClose(); };
    const handleEnd = () => { cleanup(); onClose(); };

    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:reject', handleReject);
    socket.on('call:end', handleEnd);

    return () => {
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:reject', handleReject);
      socket.off('call:end', handleEnd);
    };
  }, [socket, cleanup, onClose]);

  useEffect(() => cleanup, [cleanup]);

  // Called when the user clicks "Accept" on an incoming call
  const acceptIncoming = async () => {
    if (!socket || !incomingCall) return;
    setStatus('connecting');
    try {
      const pc = createPeerConnection();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.callType === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { toUserId: partnerId, answer });
      setStatus('connected');
    } catch (err) {
      console.error('Failed to accept call:', err);
      onClose();
    }
  };

  const rejectIncoming = () => {
    socket?.emit('call:reject', { toUserId: partnerId });
    cleanup();
    onClose();
  };

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = !micOn));
    setMicOn(!micOn);
  };
  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = !camOn));
    setCamOn(!camOn);
  };

  const statusLabel = { calling: 'Calling…', ringing: 'Incoming call…', connecting: 'Connecting…', connected: '' }[status];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-[80vh] m-auto rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
        {status !== 'connected' ? (
          <div className="flex flex-col items-center text-white">
            <Avatar src={partnerAvatar} alt={partnerName} size="xl" className="mb-4" />
            <h2 className="text-xl font-medium">{partnerName}</h2>
            <p className="text-gray-400 mt-1">{statusLabel}</p>
          </div>
        ) : (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 w-40 h-28 object-cover rounded-md border border-gray-700 bg-black"
        />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-4">
          {status === 'ringing' && incomingCall ? (
            <>
              <Button
                variant="ghost"
                className="rounded-full w-14 h-14 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white"
                onClick={rejectIncoming}
                title="Decline"
              >
                <PhoneOff size={22} />
              </Button>
              <Button
                variant="primary"
                className="rounded-full w-14 h-14 flex items-center justify-center bg-green-600 hover:bg-green-700"
                onClick={acceptIncoming}
                title="Accept"
              >
                <Phone size={22} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="rounded-full w-12 h-12 bg-gray-800 text-white" onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'}>
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </Button>
              <Button variant="ghost" className="rounded-full w-12 h-12 bg-gray-800 text-white" onClick={toggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
                {camOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
              </Button>
              <Button variant="ghost" className="rounded-full w-12 h-12 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white" onClick={endCall} title="End call">
                <PhoneOff size={20} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

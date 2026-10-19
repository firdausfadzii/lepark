import { MultiplayerManager } from "./MultiplayerManager";
import { VoicePeer, VoiceSignalPayload } from "shared";

export interface VoiceError {
  code: string;
  title: string;
  message: string;
  hint?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface VoiceManagerCallbacks {
  onMicStateChange?: (isMicOn: boolean) => void;
  onSpeakingChange?: (sessionId: string, speaking: boolean) => void;
  onLocalSpeakingChange?: (speaking: boolean) => void;
  onMicVolumeChange?: (volume: number) => void;
  onError?: (error: VoiceError | null) => void;
}

export class VoiceManager {
  private multiplayer: MultiplayerManager;
  private callbacks: VoiceManagerCallbacks;

  // WebRTC & Audio state
  public isConnected = false;
  public isMicOn = false;
  public lastError: VoiceError | null = null;
  public localStream: MediaStream | null = null;
  public peers: VoicePeer[] = [];

  // Selected input/output hardware device IDs
  public selectedInputDeviceId: string = "default";
  public selectedOutputDeviceId: string = "default";

  // Master output volume (0.0 to 1.0)
  public masterOutputVolume: number = 1.0;

  private peerConnections = new Map<string, RTCPeerConnection>();
  private peerAudioElements = new Map<string, HTMLAudioElement>();
  private peerVolumes = new Map<string, number>();
  private pendingIceCandidates = new Map<string, any[]>();
  private boundRoom: any = null;

  // Silent track for pre-negotiated bidirectional RTP pipe
  private silentAudioContext: AudioContext | null = null;
  private silentTrack: MediaStreamTrack | null = null;
  private silentStream: MediaStream | null = null;

  // Audio Analysis & Speech Detection
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private isSpeakingLocally = false;
  private speakingTimeout: number | null = null;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
    ],
    iceCandidatePoolSize: 2,
  };

  constructor(
    multiplayer: MultiplayerManager,
    callbacks: VoiceManagerCallbacks = {},
  ) {
    this.multiplayer = multiplayer;
    this.callbacks = callbacks;

    // Load persisted hardware device and volume preferences
    try {
      if (typeof localStorage !== "undefined") {
        this.selectedInputDeviceId =
          localStorage.getItem("lepark_audio_input_id") || "default";
        this.selectedOutputDeviceId =
          localStorage.getItem("lepark_audio_output_id") || "default";
        const savedVol = localStorage.getItem("lepark_output_volume");
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            this.masterOutputVolume = parsed;
          }
        }
      }
    } catch (_) {}

    // Global user-gesture handler to resume blocked audio elements & AudioContexts
    if (typeof window !== "undefined") {
      const unlockListener = () => {
        this.unlockAllAudio();
      };
      window.addEventListener("pointerdown", unlockListener, { passive: true });
      window.addEventListener("keydown", unlockListener, { passive: true });
    }

    // Automatically connect to voice as soon as room is ready or space is changed
    this.multiplayer.onRoomJoined(() => {
      this.connectToVoice();
    });

    this.setupMultiplayerListeners();
  }

  private setupMultiplayerListeners() {
    if (!this.multiplayer.room) return;
    const room = this.multiplayer.room;
    if (this.boundRoom === room) return;
    this.boundRoom = room;

    room.onMessage(
      "VOICE_CHANNEL_STATE",
      async (data: { peers: VoicePeer[] }) => {
        console.log("VoiceManager: Received VOICE_CHANNEL_STATE with peers:", data.peers);
        this.peers = data.peers || [];
        this.isConnected = true;

        // Initiate WebRTC offers to all existing peers in the space
        for (const peer of this.peers) {
          await this.initiatePeerConnection(peer.sessionId, true);
        }
      },
    );

    room.onMessage("VOICE_PEER_JOINED", (peer: VoicePeer) => {
      console.log("VoiceManager: VOICE_PEER_JOINED:", peer.sessionId);
      if (!this.peers.some((p) => p.sessionId === peer.sessionId)) {
        this.peers.push(peer);
      }
    });

    room.onMessage("VOICE_PEER_LEFT", (data: { sessionId: string }) => {
      console.log("VoiceManager: VOICE_PEER_LEFT:", data.sessionId);
      this.cleanupPeer(data.sessionId);
      this.peers = this.peers.filter((p) => p.sessionId !== data.sessionId);
      if (this.callbacks.onSpeakingChange) {
        this.callbacks.onSpeakingChange(data.sessionId, false);
      }
    });

    room.onMessage(
      "VOICE_SIGNAL",
      async (data: { fromSessionId: string; signal: any }) => {
        await this.handleIncomingSignal(data.fromSessionId, data.signal);
      },
    );

    room.onMessage(
      "VOICE_SPEAKING",
      (data: { sessionId: string; speaking: boolean }) => {
        const peer = this.peers.find((p) => p.sessionId === data.sessionId);
        if (peer) {
          peer.speaking = data.speaking;
        }
        if (this.callbacks.onSpeakingChange) {
          this.callbacks.onSpeakingChange(data.sessionId, data.speaking);
        }
      },
    );
  }

  public setMultiplayer(multiplayer: MultiplayerManager) {
    this.multiplayer = multiplayer;
    this.boundRoom = null;
    this.multiplayer.onRoomJoined(() => {
      this.connectToVoice();
    });
    this.setupMultiplayerListeners();
  }

  /**
   * Connect to the space voice mesh
   */
  public connectToVoice() {
    if (!this.multiplayer.room) {
      console.log("VoiceManager: Waiting for multiplayer room before connecting to voice");
      return;
    }
    this.setupMultiplayerListeners();
    console.log("VoiceManager: Sending VOICE_JOIN to server");
    this.multiplayer.room.send("VOICE_JOIN", {});
  }

  /**
   * Produce a silent audio track to keep WebRTC RTP sendrecv pipeline warm
   * even before microphone access is granted or when mic is muted.
   */
  public getOrCreateSilentTrack(): MediaStreamTrack | null {
    if (this.silentTrack && this.silentTrack.readyState === "live") {
      return this.silentTrack;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.silentAudioContext || this.silentAudioContext.state === "closed") {
          this.silentAudioContext = new AudioCtx();
        }
        if (this.silentAudioContext.state === "suspended") {
          this.silentAudioContext.resume().catch(() => {});
        }
        const dst = this.silentAudioContext.createMediaStreamDestination();
        const osc = this.silentAudioContext.createOscillator();
        const gain = this.silentAudioContext.createGain();
        gain.gain.value = 0; // Silent
        osc.connect(gain);
        gain.connect(dst);
        osc.start();
        this.silentStream = dst.stream;
        this.silentTrack = dst.stream.getAudioTracks()[0];
        return this.silentTrack;
      }
    } catch (e) {
      console.warn("VoiceManager: Could not create silent audio track:", e);
    }
    return null;
  }

  /**
   * Resume any suspended AudioContexts and unpause all peer audio elements
   * following browser autoplay gesture requirements.
   */
  public unlockAllAudio() {
    if (this.silentAudioContext && this.silentAudioContext.state === "suspended") {
      this.silentAudioContext.resume().catch(() => {});
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    for (const [_, el] of this.peerAudioElements) {
      if (el.paused) {
        el.play().catch(() => {});
      }
    }
  }

  /**
   * Toggle local microphone On / Off
   */
  public async toggleMic(): Promise<boolean> {
    if (!this.isMicOn) {
      // Turn microphone ON
      try {
        if (typeof window === "undefined" || !navigator) {
          throw new Error("Voice chat is only supported in browser environments.");
        }

        if (
          !window.isSecureContext ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          const isRemoteHost =
            window.location.hostname !== "localhost" &&
            window.location.hostname !== "127.0.0.1";
          const isHttp = window.location.protocol === "http:";

          let actionUrl: string | undefined;
          let actionLabel: string | undefined;

          if (isHttp) {
            actionUrl = window.location.href.replace(/^http:/, "https:");
            actionLabel = "Switch to HTTPS";
          } else if (isRemoteHost) {
            actionUrl = `https://localhost:${window.location.port || "5173"}`;
            actionLabel = "Switch to Localhost";
          }

          const insecureError: VoiceError = {
            code: "INSECURE_CONTEXT",
            title: "Microphone Requires Secure Connection (HTTPS)",
            message: isRemoteHost
              ? `You are accessing Lepark via LAN IP ("${window.location.origin}"). Browsers disable microphone access on non-localhost HTTP addresses.`
              : "Microphone access is not supported or permitted in this browser context.",
            hint: isRemoteHost
              ? isHttp
                ? `To enable microphone on your LAN:\n• Click "Switch to HTTPS" above (or open https://${window.location.host}). When your browser warns about the self-signed certificate, click "Advanced" > "Proceed to site".\n• Alternative (Chrome / Edge with HTTP): Go to chrome://flags/#unsafely-treat-insecure-origin-as-secure, add "${window.location.origin}", set to "Enabled", and relaunch Chrome.\n• On this computer: You can also open https://localhost:${window.location.port || "5173"}.`
                : "Ensure your browser permissions permit microphone access for this origin."
              : "Please check your browser security settings or try Chrome / Edge.",
            actionUrl,
            actionLabel,
          };
          this.notifyError(insecureError);
          return false;
        }

        // Ensure voice mesh connection to room is active
        if (!this.isConnected) {
          this.connectToVoice();
        }

        if (!this.localStream) {
          const audioConstraints: MediaTrackConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          };
          if (
            this.selectedInputDeviceId &&
            this.selectedInputDeviceId !== "default"
          ) {
            audioConstraints.deviceId = { exact: this.selectedInputDeviceId };
          }

          // Multi-stage getUserMedia fallback
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints,
              video: false,
            });
          } catch (firstErr: any) {
            console.warn(
              "Advanced audio constraints failed, retrying with basic constraints:",
              firstErr,
            );
            if (
              firstErr.name === "OverconstrainedError" ||
              firstErr.name === "TypeError" ||
              firstErr.name === "NotReadableError"
            ) {
              const fallbackConstraints: MediaTrackConstraints = {};
              if (
                this.selectedInputDeviceId &&
                this.selectedInputDeviceId !== "default"
              ) {
                fallbackConstraints.deviceId = {
                  exact: this.selectedInputDeviceId,
                };
              }
              try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                  audio: fallbackConstraints,
                  video: false,
                });
              } catch (_) {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                  audio: true,
                  video: false,
                });
              }
            } else {
              throw firstErr;
            }
          }

          this.setupAudioAnalysis(this.localStream);
        } else {
          this.localStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
        }

        // Attach active mic track to all transceivers
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = true;
          for (const [peerId, pc] of this.peerConnections) {
            const transceivers = pc.getTransceivers();
            for (const t of transceivers) {
              if (
                t.sender &&
                (t.receiver.track?.kind === "audio" ||
                  (t.sender.track && t.sender.track.kind === "audio"))
              ) {
                try {
                  t.direction = "sendrecv";
                  await t.sender.replaceTrack(audioTrack);
                  console.log(`VoiceManager: Attached active mic audio track to peer ${peerId}`);
                } catch (e) {
                  console.warn(`replaceTrack error for peer ${peerId}:`, e);
                }
              }
            }
          }
        }

        this.isMicOn = true;
        this.notifyError(null);

        if (this.callbacks.onMicStateChange) {
          this.callbacks.onMicStateChange(true);
        }
        return true;
      } catch (err: any) {
        console.warn("Failed to access microphone:", err);
        const classified = this.classifyMediaError(err);
        this.notifyError(classified);

        this.isMicOn = false;
        if (this.callbacks.onMicStateChange) {
          this.callbacks.onMicStateChange(false);
        }
        return false;
      }
    } else {
      // Turn microphone OFF
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      if (this.isSpeakingLocally) {
        this.setSpeaking(false);
      }
      if (this.callbacks.onMicVolumeChange) {
        this.callbacks.onMicVolumeChange(0);
      }

      // Switch back to silent track so RTP transport stays alive without streaming voice
      const silentTrack = this.getOrCreateSilentTrack();
      for (const [peerId, pc] of this.peerConnections) {
        const transceivers = pc.getTransceivers();
        for (const t of transceivers) {
          if (
            t.sender &&
            (t.receiver.track?.kind === "audio" ||
              (t.sender.track && t.sender.track.kind === "audio"))
          ) {
            try {
              if (silentTrack) {
                await t.sender.replaceTrack(silentTrack);
              } else {
                await t.sender.replaceTrack(null);
              }
              console.log(`VoiceManager: Switched peer ${peerId} to silent audio track`);
            } catch (e) {
              console.warn(`replaceTrack(silent) error for peer ${peerId}:`, e);
            }
          }
        }
      }

      this.isMicOn = false;
      if (this.callbacks.onMicStateChange) {
        this.callbacks.onMicStateChange(false);
      }
      return false;
    }
  }

  // ==========================================
  // Device Selection & Output Switching
  // ==========================================

  public async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === "audioinput");
    } catch (e) {
      console.warn("Failed to enumerate audio inputs:", e);
      return [];
    }
  }

  public async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === "audiooutput");
    } catch (e) {
      console.warn("Failed to enumerate audio outputs:", e);
      return [];
    }
  }

  public async setAudioInputDevice(deviceId: string): Promise<boolean> {
    this.selectedInputDeviceId = deviceId;
    try {
      localStorage.setItem("lepark_audio_input_id", deviceId);
    } catch (_) {}

    if (this.isMicOn) {
      try {
        // Stop current audio tracks
        if (this.localStream) {
          this.localStream.getAudioTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: {
            deviceId:
              deviceId && deviceId !== "default"
                ? { exact: deviceId }
                : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        };

        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.setupAudioAnalysis(this.localStream);

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = true;
          for (const [peerId, pc] of this.peerConnections) {
            const transceivers = pc.getTransceivers();
            const audioTransceiver = transceivers.find(
              (t) =>
                t.receiver.track?.kind === "audio" ||
                (t.sender.track && t.sender.track.kind === "audio"),
            );
            if (audioTransceiver && audioTransceiver.sender) {
              await audioTransceiver.sender.replaceTrack(audioTrack);
              console.log(`VoiceManager: Switched mic input device for peer ${peerId}`);
            }
          }
        }
        return true;
      } catch (err: any) {
        console.error("Failed to switch audio input device:", err);
        const classified = this.classifyMediaError(err);
        this.notifyError(classified);
        return false;
      }
    }
    return true;
  }

  public async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    this.selectedOutputDeviceId = deviceId;
    try {
      localStorage.setItem("lepark_audio_output_id", deviceId);
    } catch (_) {}

    const sinkId = deviceId === "default" ? "" : deviceId;
    for (const [peerId, el] of this.peerAudioElements) {
      if (typeof (el as any).setSinkId === "function") {
        try {
          await (el as any).setSinkId(sinkId);
          console.log(`VoiceManager: Set output sinkId for peer ${peerId}`);
        } catch (err) {
          console.warn(`setSinkId failed on peer ${peerId}:`, err);
        }
      }
    }
    return true;
  }

  /**
   * Play a short, pleasant 2-tone melodic chime to test the chosen speaker/headphone
   */
  public async playTestSound(outputDeviceId?: string): Promise<void> {
    const AudioCtxClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    try {
      const ctx = new AudioCtxClass();
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }
      const dest = ctx.createMediaStreamDestination();
      const now = ctx.currentTime;
      const volScale = Math.max(0.05, this.masterOutputVolume);

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.3 * volScale, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(dest);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: G5 (783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.16);
      gain2.gain.setValueAtTime(0.35 * volScale, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      osc2.connect(gain2);
      gain2.connect(dest);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.58);

      const audioEl = document.createElement("audio");
      audioEl.srcObject = dest.stream;
      const targetSink = outputDeviceId || this.selectedOutputDeviceId;
      if (targetSink && typeof (audioEl as any).setSinkId === "function") {
        try {
          await (audioEl as any).setSinkId(
            targetSink === "default" ? "" : targetSink,
          );
        } catch (_) {}
      }

      await audioEl.play().catch(() => {});

      setTimeout(() => {
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.remove();
        ctx.close().catch(() => {});
      }, 1000);
    } catch (e) {
      console.warn("Could not play audio test sound:", e);
    }
  }

  /**
   * Set volume of a remote peer based on proximity or private zone
   * 0.0 = completely muted, 1.0 = full volume
   */
  public setPeerVolume(peerSessionId: string, volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.peerVolumes.set(peerSessionId, clamped);
    const el = this.peerAudioElements.get(peerSessionId);
    if (el) {
      el.volume = Math.max(0, Math.min(1, clamped * this.masterOutputVolume));
    }
  }

  public setMasterOutputVolume(volume: number) {
    this.masterOutputVolume = Math.max(0, Math.min(1, volume));
    try {
      localStorage.setItem("lepark_output_volume", this.masterOutputVolume.toString());
    } catch (_) {}

    for (const [peerId, el] of this.peerAudioElements) {
      const prox = this.peerVolumes.get(peerId) ?? 1.0;
      el.volume = Math.max(0, Math.min(1, prox * this.masterOutputVolume));
    }
  }

  public getMasterOutputVolume(): number {
    return this.masterOutputVolume;
  }

  public getPeerVolume(peerSessionId: string): number {
    return this.peerVolumes.get(peerSessionId) ?? 1.0;
  }

  /**
   * Leave voice mesh and clean up resources
   */
  public leaveVoice() {
    if (this.multiplayer.room) {
      try {
        this.multiplayer.room.send("VOICE_LEAVE", {});
      } catch (e) {
        // Room may already be closed
      }
    }

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    this.peerAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    this.peerAudioElements.clear();
    this.peerVolumes.clear();
    this.pendingIceCandidates.clear();

    if (this.silentAudioContext) {
      try {
        this.silentAudioContext.close().catch(() => {});
      } catch (_) {}
      this.silentAudioContext = null;
    }
    if (this.silentTrack) {
      this.silentTrack.stop();
      this.silentTrack = null;
    }
    this.silentStream = null;

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.teardownAudioAnalysis();

    this.peers = [];
    this.isMicOn = false;
    this.isConnected = false;
    this.boundRoom = null;
    if (this.callbacks.onMicStateChange) {
      this.callbacks.onMicStateChange(false);
    }
    if (this.callbacks.onMicVolumeChange) {
      this.callbacks.onMicVolumeChange(0);
    }
  }

  /**
   * Initialize or receive peer connection
   */
  private async initiatePeerConnection(
    peerSessionId: string,
    isInitiator: boolean,
  ): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(peerSessionId)) {
      return this.peerConnections.get(peerSessionId)!;
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerSessionId, pc);

    // Audio track to send: active microphone track or pre-warmed silent placeholder track
    const activeTrack =
      this.localStream && this.isMicOn
        ? this.localStream.getAudioTracks()[0]
        : null;
    const trackToSend = activeTrack || this.getOrCreateSilentTrack();
    const streamToSend =
      activeTrack && this.localStream ? this.localStream : this.silentStream;

    // IMPORTANT: Add audio transceiver with "sendrecv" on BOTH initiator and answerer!
    // This pre-negotiates bidirectional audio in SDP so both sides can send audio immediately
    // without renegotiation storms.
    try {
      if (trackToSend && streamToSend) {
        pc.addTransceiver(trackToSend, {
          direction: "sendrecv",
          streams: [streamToSend],
        });
      } else {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      }
    } catch (e) {
      console.warn("addTransceiver error:", e);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.multiplayer.room) {
        this.multiplayer.room.send("VOICE_SIGNAL", {
          targetSessionId: peerSessionId,
          signal: {
            type: "candidate",
            candidate: event.candidate.toJSON
              ? event.candidate.toJSON()
              : event.candidate,
          },
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(
        `VoiceManager: Remote audio track received from peer: ${peerSessionId}, kind: ${event.track.kind}, enabled: ${event.track.enabled}, readyState: ${event.track.readyState}`,
      );
      const stream =
        event.streams && event.streams[0]
          ? event.streams[0]
          : new MediaStream([event.track]);
      this.attachRemoteAudio(peerSessionId, stream);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(
        `VoiceManager: ICE connection state for ${peerSessionId}: ${pc.iceConnectionState}`,
      );
    };

    pc.onconnectionstatechange = () => {
      console.log(
        `VoiceManager: Connection state for ${peerSessionId}: ${pc.connectionState} (ice: ${pc.iceConnectionState})`,
      );
      if (pc.connectionState === "failed") {
        console.warn(`VoiceManager: Connection failed for peer ${peerSessionId}`);
        this.cleanupPeer(peerSessionId);
      } else if (pc.connectionState === "closed") {
        this.cleanupPeer(peerSessionId);
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (this.multiplayer.room) {
          this.multiplayer.room.send("VOICE_SIGNAL", {
            targetSessionId: peerSessionId,
            signal: {
              type: "offer",
              sdp: pc.localDescription?.toJSON
                ? pc.localDescription.toJSON()
                : pc.localDescription,
            },
          });
        }
      } catch (err) {
        console.error(
          "Failed creating WebRTC offer for peer:",
          peerSessionId,
          err,
        );
      }
    }

    return pc;
  }

  /**
   * Handle incoming WebRTC signals (offer, answer, candidate)
   */
  private async handleIncomingSignal(peerSessionId: string, signal: any) {
    if (!signal) return;

    if (signal.type === "offer") {
      let pc = this.peerConnections.get(peerSessionId);
      if (!pc) {
        pc = await this.initiatePeerConnection(peerSessionId, false);
      }

      const sdpInit: RTCSessionDescriptionInit = signal.sdp?.sdp
        ? signal.sdp
        : {
            type: "offer",
            sdp: typeof signal.sdp === "string" ? signal.sdp : signal.sdp?.sdp,
          };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdpInit));

        // ENSURE all audio transceivers are set to "sendrecv" so the answer declares "a=sendrecv"!
        const transceivers = pc.getTransceivers();
        const activeTrack =
          this.localStream && this.isMicOn
            ? this.localStream.getAudioTracks()[0]
            : null;
        const trackToSend = activeTrack || this.getOrCreateSilentTrack();

        for (const t of transceivers) {
          if (
            t.receiver.track?.kind === "audio" ||
            (t.sender.track && t.sender.track.kind === "audio")
          ) {
            t.direction = "sendrecv";
            if (trackToSend && t.sender) {
              await t.sender.replaceTrack(trackToSend).catch(() => {});
            }
          }
        }

        // Drain any pending ICE candidates queued before setRemoteDescription
        await this.drainPendingIceCandidates(peerSessionId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (this.multiplayer.room) {
          this.multiplayer.room.send("VOICE_SIGNAL", {
            targetSessionId: peerSessionId,
            signal: {
              type: "answer",
              sdp: pc.localDescription?.toJSON
                ? pc.localDescription.toJSON()
                : pc.localDescription,
            },
          });
        }
      } catch (err) {
        console.error("Error handling WebRTC offer from peer:", peerSessionId, err);
      }
    } else if (signal.type === "answer") {
      const pc = this.peerConnections.get(peerSessionId);
      if (pc && pc.signalingState !== "closed") {
        const sdpInit: RTCSessionDescriptionInit = signal.sdp?.sdp
          ? signal.sdp
          : {
              type: "answer",
              sdp:
                typeof signal.sdp === "string" ? signal.sdp : signal.sdp?.sdp,
            };
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdpInit));
          // Drain any pending ICE candidates queued before setRemoteDescription
          await this.drainPendingIceCandidates(peerSessionId, pc);
        } catch (err) {
          console.error("Error handling WebRTC answer from peer:", peerSessionId, err);
        }
      }
    } else if (signal.type === "candidate") {
      const candidateData = signal.candidate;
      if (!candidateData) return;

      const pc = this.peerConnections.get(peerSessionId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateData));
        } catch (err) {
          console.warn("Failed to add ICE candidate:", err);
        }
      } else {
        // Queue candidate until setRemoteDescription finishes
        if (!this.pendingIceCandidates.has(peerSessionId)) {
          this.pendingIceCandidates.set(peerSessionId, []);
        }
        this.pendingIceCandidates.get(peerSessionId)!.push(candidateData);
      }
    }
  }

  private async drainPendingIceCandidates(
    peerSessionId: string,
    pc: RTCPeerConnection,
  ) {
    const queue = this.pendingIceCandidates.get(peerSessionId);
    if (queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Failed adding queued ICE candidate:", err);
        }
      }
      this.pendingIceCandidates.delete(peerSessionId);
    }
  }

  /**
   * Attach remote stream to HTML audio element
   */
  private attachRemoteAudio(peerSessionId: string, stream: MediaStream) {
    let audioEl = this.peerAudioElements.get(peerSessionId);
    if (!audioEl) {
      audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      audioEl.style.display = "none";
      document.body.appendChild(audioEl);
      this.peerAudioElements.set(peerSessionId, audioEl);
    }

    const currentVol = this.peerVolumes.has(peerSessionId)
      ? this.peerVolumes.get(peerSessionId)!
      : 1.0;
    audioEl.volume = Math.max(0, Math.min(1, currentVol * this.masterOutputVolume));

    // Apply selected output device sinkId if supported
    if (
      this.selectedOutputDeviceId &&
      this.selectedOutputDeviceId !== "default" &&
      typeof (audioEl as any).setSinkId === "function"
    ) {
      (audioEl as any).setSinkId(this.selectedOutputDeviceId).catch(() => {});
    }

    if (audioEl.srcObject !== stream) {
      audioEl.srcObject = stream;
    }

    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn(`VoiceManager: Autoplay blocked for peer ${peerSessionId}, waiting for user gesture:`, err);
        const resumeAudio = () => {
          audioEl?.play().catch(() => {});
          window.removeEventListener("pointerdown", resumeAudio);
          window.removeEventListener("click", resumeAudio);
          window.removeEventListener("keydown", resumeAudio);
        };
        window.addEventListener("pointerdown", resumeAudio, { once: true });
        window.addEventListener("click", resumeAudio, { once: true });
        window.addEventListener("keydown", resumeAudio, { once: true });
      });
    }
  }

  private cleanupPeer(peerSessionId: string) {
    const pc = this.peerConnections.get(peerSessionId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerSessionId);
    }

    const audioEl = this.peerAudioElements.get(peerSessionId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.peerAudioElements.delete(peerSessionId);
    }

    this.pendingIceCandidates.delete(peerSessionId);
    this.peerVolumes.delete(peerSessionId);
  }

  /**
   * Audio Analysis & Local Speaking Detection
   */
  private setupAudioAnalysis(stream: MediaStream) {
    try {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;

      this.micSource = this.audioCtx.createMediaStreamSource(stream);
      this.micSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || !this.isMicOn) {
          if (this.isSpeakingLocally) {
            this.setSpeaking(false);
          }
          if (this.callbacks.onMicVolumeChange) {
            this.callbacks.onMicVolumeChange(0);
          }
          this.animFrameId = requestAnimationFrame(checkVolume);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength / 255; // 0.0 to 1.0

        if (this.callbacks.onMicVolumeChange) {
          this.callbacks.onMicVolumeChange(avg);
        }

        // Speech threshold
        const SPEAKING_THRESHOLD = 0.045;
        if (avg > SPEAKING_THRESHOLD) {
          if (!this.isSpeakingLocally) {
            this.setSpeaking(true);
          }
          if (this.speakingTimeout !== null) {
            clearTimeout(this.speakingTimeout);
            this.speakingTimeout = null;
          }
        } else if (this.isSpeakingLocally && this.speakingTimeout === null) {
          // Debounce stopping speech by 350ms
          this.speakingTimeout = window.setTimeout(() => {
            this.setSpeaking(false);
            this.speakingTimeout = null;
          }, 350);
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      this.animFrameId = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.warn("Could not setup Web Audio analyser:", err);
    }
  }

  private setSpeaking(speaking: boolean) {
    this.isSpeakingLocally = speaking;

    if (this.callbacks.onLocalSpeakingChange) {
      this.callbacks.onLocalSpeakingChange(speaking);
    }

    if (this.multiplayer && this.multiplayer.room) {
      this.multiplayer.room.send("VOICE_SPEAKING", {
        speaking,
      });
    }
  }

  private teardownAudioAnalysis() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.speakingTimeout !== null) {
      clearTimeout(this.speakingTimeout);
      this.speakingTimeout = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch (e) {}
      this.micSource = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {}
      this.analyser = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
    this.isSpeakingLocally = false;
    if (this.callbacks.onMicVolumeChange) {
      this.callbacks.onMicVolumeChange(0);
    }
  }

  public getLastError(): VoiceError | null {
    return this.lastError;
  }

  private notifyError(error: VoiceError | null) {
    this.lastError = error;
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  private classifyMediaError(err: any): VoiceError {
    const errorName = err?.name || "UnknownError";
    const errorMessage = err?.message || "";

    switch (errorName) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return {
          code: "PERMISSION_DENIED",
          title: "Microphone Access Denied",
          message:
            "Chrome or your operating system blocked access to your microphone.",
          hint: "1. Click the site settings / lock icon (🔒) in Chrome's address bar and set Microphone to 'Allow'.\n2. On macOS, open System Settings > Privacy & Security > Microphone and ensure 'Google Chrome' is toggled ON.\n3. Then click 'Retry Microphone'.",
        };

      case "NotFoundError":
      case "DevicesNotFoundError":
        return {
          code: "DEVICE_NOT_FOUND",
          title: "No Microphone Detected",
          message: "No audio input hardware was found on your computer.",
          hint: "Please connect a microphone or USB/Bluetooth headset and make sure it is recognized in your system sound settings.",
        };

      case "NotReadableError":
      case "TrackStartError":
        return {
          code: "DEVICE_BUSY",
          title: "Microphone In Use or Inaccessible",
          message:
            "Could not start audio input. Another application might have exclusive access to the microphone.",
          hint: "Close any other apps using audio (such as Zoom, Teams, FaceTime, or other browser tabs), or check macOS microphone permissions.",
        };

      case "OverconstrainedError":
        return {
          code: "OVERCONSTRAINED",
          title: "Unsupported Microphone Settings",
          message:
            "The requested audio configuration is not supported by your microphone device.",
          hint: "Try using a standard microphone or check your sound input device settings.",
        };

      case "SecurityError":
        return {
          code: "SECURITY_ERROR",
          title: "Security Policy Restriction",
          message: "Microphone access was blocked by browser security policy.",
          hint: "The page must be served over HTTPS or accessed from http://localhost.",
        };

      default:
        return {
          code: "GENERIC_ERROR",
          title: "Could Not Access Microphone",
          message: errorMessage
            ? `Error: ${errorMessage}`
            : `Browser returned: ${errorName}`,
          hint: "Ensure your microphone is plugged in, permitted in browser settings, and not muted at the system level.",
        };
    }
  }
}

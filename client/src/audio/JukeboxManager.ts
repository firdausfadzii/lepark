import { JukeboxState, JukeboxTrack } from "shared";
import { MultiplayerManager } from "../network/MultiplayerManager";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export type JukeboxTrackChangeCallback = (
  track: JukeboxTrack | null,
  jukebox: JukeboxState | null
) => void;

export class JukeboxManager {
  private multiplayer: MultiplayerManager;
  private player: any = null;
  private isPlayerReady = false;
  private isApiLoading = false;
  private activeJukebox: JukeboxState | null = null;
  private currentTrack: JukeboxTrack | null = null;
  private currentVideoId: string = "";

  private proximityVolume: number = 0.0; // 0.0 to 1.0 from GameScene
  private masterVolume: number = 1.0; // 0.0 to 1.0 from user preferences
  private isMuted: boolean = false;
  private lastSetVolumeInt: number = -1;
  private lastVolumeSetTime: number = 0;

  private onTrackChangeCallbacks: JukeboxTrackChangeCallback[] = [];
  private onTrackErrorCallbacks: ((track: JukeboxTrack | null, message: string, title?: string) => void)[] = [];
  private onAutoplayBlockedCallbacks: (() => void)[] = [];
  private durationReportedTracks = new Set<string>();
  private lastErrorSkipTime: number = 0;

  constructor(multiplayer: MultiplayerManager) {
    this.multiplayer = multiplayer;
    this.initAudioUnlockListeners();
  }

  /**
   * Initializes YouTube IFrame Player API
   */
  public initPlayer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.player && this.isPlayerReady) {
        resolve();
        return;
      }

      if (window.YT && window.YT.Player) {
        this.createYTPlayer(resolve);
        return;
      }

      if (!this.isApiLoading) {
        this.isApiLoading = true;
        const prevOnReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prevOnReady === "function") prevOnReady();
          this.createYTPlayer(resolve);
        };

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }
    });
  }

  private createYTPlayer(onReadyCallback?: () => void) {
    let iframeMount = document.getElementById("youtube-jukebox-iframe");
    if (!iframeMount) {
      let container = document.getElementById("youtube-jukebox-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "youtube-jukebox-container";
        container.style.position = "fixed";
        container.style.bottom = "24px";
        container.style.left = "24px";
        container.style.width = "250px";
        container.style.height = "140px";
        container.style.zIndex = "85";
        container.style.borderRadius = "12px";
        container.style.overflow = "hidden";
        container.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.6)";

        const iframeDiv = document.createElement("div");
        iframeDiv.id = "youtube-jukebox-iframe";
        container.appendChild(iframeDiv);
        document.body.appendChild(container);
      }
    }

    try {
      // Ensure all permission policy attributes (especially compute-pressure and encrypted-media)
      // are injected onto the generated iframe immediately so DRM/monetized audio works
      const parent = document.getElementById("jukebox-player-body") || document.body;
      const observer = new MutationObserver(() => {
        const iframe = parent.querySelector("iframe");
        if (iframe) {
          iframe.setAttribute(
            "allow",
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; compute-pressure"
          );
          iframe.setAttribute("allowfullscreen", "");
        }
      });
      observer.observe(parent, { childList: true, subtree: true });

      const isNumericIp = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const validDomainOrigin =
        !isNumericIp && window.location.hostname.includes(".");

      this.player = new window.YT.Player("youtube-jukebox-iframe", {
        height: "140",
        width: "250",
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 0,
          fs: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          // Only pass origin for localhost or registered domains.
          // Passing a raw LAN IP address causes YouTube's origin parser to reject with Error 150.
          ...(isLocalhost || validDomainOrigin
            ? { origin: window.location.origin }
            : {}),
        },
        events: {
          onReady: () => {
            this.isPlayerReady = true;
            const iframe =
              this.player?.getIframe?.() ||
              document.querySelector("#jukebox-player-body iframe");
            if (iframe) {
              iframe.setAttribute(
                "allow",
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; compute-pressure"
              );
              iframe.setAttribute("allowfullscreen", "");
            }
            this.applyVolume(true);
            if (this.activeJukebox) {
              this.syncPlaybackWithState(this.activeJukebox);
            }
            if (onReadyCallback) onReadyCallback();
          },
          onStateChange: (event: any) => {
            this.handlePlayerStateChange(event.data);
          },
          onError: (event: any) => {
            console.warn("YouTube Jukebox player error code:", event.data);
            this.handlePlayerError(event.data);
          },
        },
      });
    } catch (err) {
      console.error("Failed to initialize YT.Player:", err);
    }
  }

  private handlePlayerError(code: number) {
    let title = "Playback Error";
    let msg = `Playback error (${code})`;
    if (code === 101 || code === 150) {
      title = "Embedding Restricted (Error 150)";
      msg = "The video owner restricted playback in third-party embedded players. Please try another YouTube link (e.g. lyric videos, covers, or audio uploads).";
    } else if (code === 100) {
      title = "Video Unavailable";
      msg = "This video was removed or marked private on YouTube.";
    } else if (code === 2) {
      title = "Invalid Video ID";
      msg = "Invalid YouTube video ID or link.";
    } else if (code === 5) {
      title = "HTML5 Player Error";
      msg = "HTML5 playback failed. Please try another link.";
    }

    this.notifyTrackError(this.currentTrack, msg, title);

    // Only skip if more than 1 track exists in the playlist, debounced by at least 4s
    const now = Date.now();
    if (
      this.activeJukebox &&
      this.activeJukebox.playlist.length > 1 &&
      now - this.lastErrorSkipTime > 4000
    ) {
      this.lastErrorSkipTime = now;
      console.warn("Skipping unplayable YouTube track in Jukebox queue:", this.currentTrack?.title);
      this.multiplayer.skipJukeboxTrack(this.activeJukebox.id);
    }
  }

  private handlePlayerStateChange(state: number) {
    // 1: Playing, 0: Ended
    if (state === 1) {
      // Check and report track duration once playing
      if (this.player && typeof this.player.getDuration === "function") {
        const dur = this.player.getDuration();
        if (dur > 0 && this.activeJukebox && this.currentTrack) {
          if (!this.durationReportedTracks.has(this.currentTrack.id)) {
            this.durationReportedTracks.add(this.currentTrack.id);
            this.multiplayer.reportJukeboxTrackDuration(
              this.activeJukebox.id,
              this.currentTrack.id,
              dur
            );
          }
        }
      }
    } else if (state === 0) {
      // Video ended: advance track if server timer hasn't triggered yet
      if (this.activeJukebox && this.activeJukebox.playlist.length > 0) {
        this.multiplayer.skipJukeboxTrack(this.activeJukebox.id);
      }
    }
  }

  private initAudioUnlockListeners() {
    const unlock = () => {
      if (this.player && typeof this.player.playVideo === "function") {
        try {
          if (this.activeJukebox?.isPlaying && this.currentVideoId) {
            this.player.playVideo();
            this.applyVolume(true);
          }
        } catch {}
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
  }

  /**
   * Called whenever Colyseus room sends updated Jukebox state
   */
  public updateJukeboxState(jukebox: JukeboxState | null) {
    this.activeJukebox = jukebox;

    if (!jukebox || !jukebox.isPlaying || jukebox.playlist.length === 0) {
      this.currentTrack = null;
      this.currentVideoId = "";
      const playerCard = document.getElementById("jukebox-player-card");
      if (playerCard) playerCard.classList.add("hidden");

      if (this.player && this.isPlayerReady) {
        try {
          this.player.pauseVideo();
        } catch {}
      }
      this.notifyTrackChange(null, jukebox);
      return;
    }

    this.syncPlaybackWithState(jukebox);
  }

  private syncPlaybackWithState(jukebox: JukeboxState) {
    if (!jukebox.isPlaying || jukebox.playlist.length === 0) return;

    const track = jukebox.playlist[jukebox.currentTrackIndex];
    if (!track) return;

    this.currentTrack = track;
    this.notifyTrackChange(track, jukebox);

    // Update floating player card visibility and title
    const playerCard = document.getElementById("jukebox-player-card");
    const playerTitle = document.getElementById("jukebox-player-header-title");
    if (playerCard) playerCard.classList.remove("hidden");
    if (playerTitle) playerTitle.textContent = track.title;

    const elapsedSeconds = Math.max(0, (Date.now() - jukebox.trackStartedAt) / 1000);

    if (this.player && this.isPlayerReady) {
      if (this.currentVideoId !== track.youtubeId) {
        this.currentVideoId = track.youtubeId;
        try {
          const startSec = elapsedSeconds > 3 ? Math.floor(elapsedSeconds) : 0;
          this.player.loadVideoById({
            videoId: track.youtubeId,
            startSeconds: startSec,
          });
          this.applyVolume(true);
        } catch (err) {
          console.warn("Failed to load video in Jukebox player:", err);
        }
      } else {
        // Same video, check drift
        try {
          const currentTime = this.player.getCurrentTime?.() || 0;
          if (Math.abs(currentTime - elapsedSeconds) > 4) {
            this.player.seekTo(elapsedSeconds, true);
          }
          if (this.player.getPlayerState?.() !== 1) {
            this.player.playVideo();
          }
        } catch {}
      }
    } else {
      this.initPlayer();
    }
  }

  /**
   * Set proximity volume computed by GameScene (0.0 to 1.0)
   */
  public setProximityVolume(volume: number) {
    this.proximityVolume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  /**
   * Set user master volume preference (0.0 to 1.0)
   */
  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.applyVolume(true);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.applyVolume(true);
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private applyVolume(force = false) {
    if (!this.player || !this.isPlayerReady) return;

    const now = Date.now();
    if (!force && now - this.lastVolumeSetTime < 80) return;

    const effectiveVolume = this.isMuted ? 0 : this.proximityVolume * this.masterVolume;
    const targetInt = Math.max(0, Math.min(100, Math.round(effectiveVolume * 100)));

    if (!force && targetInt === this.lastSetVolumeInt) return;

    this.lastSetVolumeInt = targetInt;
    this.lastVolumeSetTime = now;

    try {
      if (targetInt === 0) {
        if (typeof this.player.mute === "function" && !this.player.isMuted()) {
          this.player.mute();
        }
      } else {
        if (typeof this.player.unMute === "function" && this.player.isMuted()) {
          this.player.unMute();
        }
        if (typeof this.player.setVolume === "function") {
          this.player.setVolume(targetInt);
        }
      }
    } catch {}
  }

  public getActiveJukebox(): JukeboxState | null {
    return this.activeJukebox;
  }

  public getCurrentTrack(): JukeboxTrack | null {
    return this.currentTrack;
  }

  public getEffectiveVolume(): number {
    return this.isMuted ? 0 : this.proximityVolume * this.masterVolume;
  }

  public onTrackChange(callback: JukeboxTrackChangeCallback) {
    this.onTrackChangeCallbacks.push(callback);
    if (this.currentTrack) {
      callback(this.currentTrack, this.activeJukebox);
    }
  }

  public onTrackError(
    callback: (track: JukeboxTrack | null, message: string, title?: string) => void
  ) {
    this.onTrackErrorCallbacks.push(callback);
  }

  private notifyTrackChange(track: JukeboxTrack | null, jukebox: JukeboxState | null) {
    this.onTrackChangeCallbacks.forEach((cb) => {
      try {
        cb(track, jukebox);
      } catch (err) {
        console.error("Error in onTrackChange callback:", err);
      }
    });
  }

  private notifyTrackError(
    track: JukeboxTrack | null,
    message: string,
    title?: string
  ) {
    this.onTrackErrorCallbacks.forEach((cb) => {
      try {
        cb(track, message, title);
      } catch (err) {
        console.error("Error in onTrackError callback:", err);
      }
    });
  }
}

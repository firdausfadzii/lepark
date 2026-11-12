# Lepark 🎮 — Master Architecture & Project Knowledge Base

> **Notice for Future AI Agents & Developers:**  
> This document is the primary source of truth regarding the architecture, technical stack, directory structure, networking protocols, game mechanics, and engineering guidelines of **Lepark**. Read this document carefully before making changes to understand existing conventions, critical invariants, and extension recipes.

---

## 1. Executive Summary & Vision

**Lepark** is a real-time multiplayer 2D virtual space and social MMO built with **Phaser 3**, **Colyseus**, and **TypeScript**. 

* **The Name:** "Lepark" is a portmanteau of *"Lepak"* (Southeast Asian / Malay / Singlish slang for chilling, hanging out, or lounging with friends) and *"Park"* (a shared public space).
* **The Concept:** Think of it as a blend between the cozy, pixel-art aesthetic of *Stardew Valley* / *Habbo Hotel* and the spatial co-presence and interactive meeting mechanics of *Gather.town*.
* **Core Capabilities:**
  1. **Zero-Jitter Pixel-Art Engine:** Client-side prediction and snapshot interpolation (`@geckos.io/snapshot-interpolation`) over a 20 Hz authoritative server tick loop.
  2. **In-Game Collaborative Map Editor:** Real-time map editing supporting floor patterns, solid walls, overlay walls, grid-aligned decorations, and continuous-coordinate freeform props with multi-level Z-layering and collision toggles.
  3. **Acoustic Private Zones:** Customizable rectangular meeting rooms featuring dynamic ambient lighting dimmers and complete acoustic isolation for voice, text, and music.
  4. **Synced YouTube Jukebox:** Collaborative music player with queue management, automatic looping, spatial audio distance rolloff, and YouTube playlist scraping.
  5. **Interactive Minigames:**
     * **TypeRace (Typewriter):** Live multi-user speed-typing duels with live WPM/accuracy tracking and quotes fetched from Monkeytype.
     * **Smoking Game (Ashtray):** Spacebar-mashing challenge with smoke particle effects and cigarette burning visuals.
     * **Chess (Chess Board):** Full 2-player chess board with FEN synchronization, move validation, spectator mode, and pawn promotion powered by `chess.js`.
  6. **Spatial WebRTC Voice & Text Chat:** Peer-to-peer mesh WebRTC voice channels, real-time speaking detection rings, and map/zone/whisper chat tabs with speech bubbles.
  7. **Dual-Mode Resilient Database:** Dockerized PostgreSQL 16 with a seamless, automatic in-memory fallback store if PostgreSQL is offline.

---

## 2. High-Level Architecture

```mermaid
flowchart TB
    subgraph Clients["Connected Clients (Browsers)"]
        UI["HTML5/CSS HUD & Modals<br/>(client/src/main.ts)"]
        Phaser["Phaser 3 GameScene<br/>(client/src/scenes/GameScene.ts)"]
        Voice["VoiceManager (WebRTC Mesh)<br/>(client/src/network/VoiceManager.ts)"]
        JukeAudio["JukeboxManager (YouTube API)<br/>(client/src/audio/JukeboxManager.ts)"]
        NetClient["MultiplayerManager (Colyseus.js)<br/>(client/src/network/MultiplayerManager.ts)"]
        
        UI <--> Phaser
        Phaser <--> NetClient
        UI <--> NetClient
        Phaser --> JukeAudio
        NetClient --> Voice
    end

    subgraph Server["Game Server (Node.js + Colyseus)"]
        ColyRoom["GameRoom (20 Hz Tick Loop)<br/>(server/src/rooms/GameRoom.ts)"]
        ExpressApp["Express REST API (Auth & Spaces)<br/>(server/src/index.ts)"]
        AuthModule["Custom Cryptography (scrypt + JWT)<br/>(server/src/auth.ts)"]
        QuoteSvc["QuoteService (Monkeytype API)<br/>(server/src/services/QuoteService.ts)"]
        YTSvc["YouTube Playlist Scraper<br/>(server/src/services/youtubePlaylist.ts)"]
        DbLayer["Database Abstraction Layer<br/>(server/src/db/index.ts)"]
        
        ExpressApp --> AuthModule
        ExpressApp --> DbLayer
        ColyRoom --> DbLayer
        ColyRoom --> QuoteSvc
        ColyRoom --> YTSvc
    end

    subgraph DataStore["Data Persistence"]
        Postgres[("PostgreSQL 16 Container<br/>(Port 5433)")]
        MemStore[("In-Memory Fallback Store<br/>(Auto-activated if DB offline)")]
    end

    subgraph SharedPkg["Shared Isomorphic Package (shared/)"]
        Types["types.ts & constants.ts"]
        Collision["collision.ts (Pixel & Box Sliding)"]
        Bitmaps["assetBitmaps.ts (Collision Bitmasks)"]
        Schema["schema.ts (Colyseus Schemas)"]
    end

    Phaser -.-> SharedPkg
    NetClient -.-> SharedPkg
    ColyRoom -.-> SharedPkg
    DbLayer -.-> SharedPkg

    NetClient <-->|WebSocket: 20Hz Binary Sync & Messages| ColyRoom
    UI <-->|HTTPS REST Requests| ExpressApp
    Voice <-->|WebRTC P2P Audio Streams (Signaled via WS)| Voice
    DbLayer -->|Connection Pool| Postgres
    DbLayer -.->|Fallback on error| MemStore
```

---

## 3. Technology Stack Matrix

| Component | Technology | Version / Details | Purpose |
| :--- | :--- | :--- | :--- |
| **Monorepo** | npm Workspaces | Node.js v18+ | Monorepo orchestrating `shared`, `server`, and `client` |
| **Frontend Framework** | Phaser 3 | `^3.90.0` | 2D WebGL/Canvas rendering, tilemaps, sprite anims, cameras |
| **Frontend Bundler** | Vite | `^5.1.4` | Dev server with HMR, HTTPS proxying, path aliasing |
| **Frontend Networking** | `colyseus.js` | `^0.15.28` | WebSocket client connected to authoritative game room |
| **Snapshot Interpolation**| `@geckos.io/snapshot-interpolation` | `^1.1.1` | Client-side jitter buffer and entity lerping |
| **Chess Engine** | `chess.js` | `^1.4.0` | Legal move validation, FEN parsing, SAN move history |
| **Voice Chat** | WebRTC (Native) | Mesh Topology | Browser P2P audio with Google/Cloudflare STUN servers |
| **Audio Analysis** | Web Audio API | `AudioContext`, `AnalyserNode` | Real-time speech detection and animated voice ring indicators |
| **Music Streaming** | YouTube IFrame API | `https://www.youtube.com/iframe_api` | Audio playback with spatial rolloff and acoustic zone gating |
| **Backend Runtime** | Node.js + TSX | Node 18+ / `tsx ^4.7.1` | TypeScript execution in development and build scripts |
| **Multiplayer Server**| Colyseus | `^0.15.57` | Authoritative rooms, state schemas, 20 Hz simulation |
| **Web Server** | Express | `^4.19.2` | REST endpoints for auth, profile, and space management |
| **Database** | PostgreSQL | 16-alpine (Docker) | Relational storage for users, spaces, tiles, and chat logs |
| **DB Client** | `pg` (node-postgres) | `^8.11.5` | Connection pool with automatic in-memory fallback |
| **Security & Auth** | Node.js `crypto` | Built-in | `scrypt` password hashing + HMAC-SHA256 JWT tokens |
| **External Content** | Monkeytype Quotes API | Static Raw GitHub JSON | Speed-typing quotes with 25+ hardcoded offline fallbacks |
| **TLS / SSL** | OpenSSL | Self-Signed / Custom | Auto-generates LAN certificates for WebRTC mic permissions |

---

## 4. Repository & Directory Structure

```
lepark/
├── package.json                 # Monorepo root definition & scripts
├── package-lock.json            # Exact dependency lockfile
├── docker-compose.yml           # PostgreSQL 16 Alpine container (host port 5433)
├── README.md                    # User quick-start guide
├── plan.md                      # YouTube Jukebox architectural plan
├── guide.md                     # Master architecture reference for pixel-art MMOs
├── add_asset_guide.md           # Exhaustive guide for adding assets and updating collisions
├── about.md                     # THIS FILE (Comprehensive project documentation)
├── color.css                    # Global CSS variables & color swatches
│
├── docker/
│   └── init.sql                 # Database table DDL & initial index creation
│
├── shared/                      # Isomorphic library compiled to shared/dist/
│   ├── package.json             # Shared module config
│   ├── tsconfig.json            # TypeScript compile options
│   └── src/
│       ├── index.ts             # Barrel exports
│       ├── constants.ts         # Tile size (50px), grid (48x36), speeds, offsets
│       ├── types.ts             # All TypeScript interfaces, payloads, game states
│       ├── schema.ts            # Colyseus PlayerState & GameState schemas
│       ├── collision.ts         # Pixel-level collision, wall sliding, safe spawn logic
│       └── assetBitmaps.ts      # Base64-encoded bitmasks for non-rectangular assets
│
├── server/                      # Authoritative game server
│   ├── package.json             # Server dependencies & scripts (dev, build, start)
│   ├── tsconfig.json            # Server TypeScript configuration
│   ├── .env.example             # Environment variable template
│   └── src/
│       ├── index.ts             # Express server, HTTPS configuration, Colyseus setup
│       ├── auth.ts              # scrypt password hashing & HMAC-SHA256 JWT auth
│       ├── db/
│       │   └── index.ts         # PostgreSQL connection pool + In-Memory fallback store
│       ├── rooms/
│       │   └── GameRoom.ts      # Authoritative room: movement, minigames, chat, sync
│       ├── schema/
│       │   └── GameState.ts     # Room state definition
│       └── services/
│           ├── QuoteService.ts  # Monkeytype quote loader with offline fallbacks
│           └── youtubePlaylist.ts # YouTube playlist scraper (ytInitialData parser)
│
└── client/                      # Frontend web client
    ├── index.html               # Main HTML entrypoint, HUDs, modals, and templates
    ├── package.json             # Client dependencies & scripts
    ├── tsconfig.json            # Client TypeScript configuration
    ├── vite.config.ts           # Vite dev server, HTTPS, reverse proxy & aliases
    ├── .env.example             # Client environment template
    ├── certs/                   # Auto-generated or custom SSL certificates
    ├── public/
    │   └── assets/              # SINGLE SOURCE OF TRUTH for all game assets
    │       ├── floor/           # Floor textures (wood, stone, carpet, grass, marble)
    │       ├── wall/            # Wall textures (solid wood, glass, overlay variants)
    │       ├── decoration/      # Props (jukebox, typewriter, ashtray, chairs, tables)
    │       │   └── chess/       # Chess piece sprites & board
    │       └── sprites/         # Character walking sprites & slime sheet
    └── src/
        ├── main.ts              # Primary UI manager, modals, HUD event listeners (~8.4k lines)
        ├── style.css            # Retro pixel-art UI styling (~192k)
        ├── color.css            # UI color palette
        ├── scenes/
        │   └── GameScene.ts     # Phaser 3 GameScene (~5.5k lines): map, players, collisions, editor
        ├── network/
        │   ├── MultiplayerManager.ts # Colyseus client wrapper & snapshot interpolation
        │   └── VoiceManager.ts       # WebRTC mesh audio, speech detection & zone isolation
        └── audio/
            └── JukeboxManager.ts     # YouTube iframe player, volume rolloff & zone gating
```

---

## 5. Core Systems & Technical Functionality

### 5.1. Continuous Movement, Physics & Anti-Jitter Pipeline

Unlike tile-locked RPGs where players hop discretely from tile to tile, Lepark implements **smooth continuous movement**:

* **World Dimensions:** The world consists of 48 columns $\times$ 36 rows (`GRID_COLS = 48`, `GRID_ROWS = 36`) of 50px $\times$ 50px tiles (`TILE_SIZE = 50`), giving a world size of $2400 \times 1800\text{ px}$.
* **Speed & Tick Rate:** Players move continuously at $260\text{ px/sec}$ (`PLAYER_SPEED = 260`). The server authoritative simulation runs at 20 Hz (`SERVER_TICK_RATE = 20`, 50ms tick).
* **Hitbox & Doorway Clearance:**
  * Player hitbox width: $28\text{ px}$ (`PLAYER_HITBOX_HALF_WIDTH = 14`), perfectly tuned to allow passing through 50px doorway openings with 11px clearance on each side.
  * Feet collision offsets: `PLAYER_FEET_TOP_OFFSET = 15` and `PLAYER_FEET_BOTTOM_OFFSET = 27`. This allows the character's head and torso to overlap the top of walls realistically without clipping through solid obstacles when moving downwards.
* **Sub-Pixel Collision & Sliding:** Implemented in [`shared/src/collision.ts`](file:///f:/lepark/shared/src/collision.ts) via `resolveMovement()`. When a player walks into a wall at an angle, velocity along the free axis is preserved so the character slides smoothly along the wall rather than snagging.
* **Bitmask Collisions:** Non-rectangular props and glass walls utilize 1-bit base64-encoded masks in [`shared/src/assetBitmaps.ts`](file:///f:/lepark/shared/src/assetBitmaps.ts). Only rendered, non-transparent pixels trigger obstacle collisions.

### 5.2. Map Editor & Asset Classification Pipeline

The in-game map editor allows room owners and administrators to construct spaces in real time. Assets fall into 5 distinct categories:

1. **Floor Tiles (`/assets/floor/`):** Rendered on the lowest visual layer. Always passable. Examples: `wood_1`, `stone_1`, `carpet_1`, `grass_1`, `marble_1`.
2. **Solid Wall Tiles (`/assets/wall/`):** Full-block walls. Rendered on the ground layer and accompanied by an `obstacle` tag making the tile impassable. Examples: `wood_wall_1` to `wood_wall_19`, `glass_1`.
3. **Overlay Wall Tiles:** Tiles such as `glass_2`, `glass_3`, `glass_4`, `wood_wall_2` that render on top of characters so that a player walking behind or through an entrance appears partially occluded.
4. **Grid Decorations (`/assets/decoration/`):** Furniture and items placed on discrete grid coordinates. Can be configured as solid or passable.
5. **Freeform Props (Continuous World Coordinates):** Props placed at any pixel coordinate $(X, Y)$ without snapping to the grid (e.g. office chairs, round tables, typewriter, jukebox, ashtray, chess board).
   * **Serialization Format:**  
     `assetKey|color::X,Y::passable/solid::ontop/behind::layer:N`  
     *Example:* `office_chair_1_front|#ff0000::540,320::passable::behind::layer:1`

> [!IMPORTANT]
> **Single Source of Truth:** All assets loaded by Phaser or the HTML UI must exist in `client/public/assets/<category>/`. The root `/assets/` directory is gitignored and deprecated.

### 5.3. Acoustic Private Zones

Private zones provide acoustic isolation for meetings, private conversations, and small-group hangouts:
* **Geometry:** Defined as bounding boxes $(minCol, minRow, maxCol, maxRow)$ via the editor.
* **Ambient Lighting Dimmer:** When a player enters a private zone, `GameScene.ts` executes `drawOutsideDarkness()`, rendering a dark ambient overlay over everything outside that zone while highlighting the room.
* **Acoustic Gating:**
  * **Voice Chat:** Players inside Zone A only connect to and hear peers in Zone A.
  * **Text Chat:** A dedicated "Zone" tab allows sending messages restricted to occupants of the zone.
  * **Jukebox Audio:** Jukeboxes inside a private zone play at 100% volume uniformly inside the zone and 0% outside.

### 5.4. Interactive Entities & Minigames

#### A. YouTube Jukebox
* **Asset:** Dedicated prop (`/assets/decoration/jukebox_1.png`).
* **Playback & Queue:** Authoritative server playlist queue. Automatically loops tracks once finished ($(\text{index} + 1) \bmod N$).
* **Playlist Scraper:** [`server/src/services/youtubePlaylist.ts`](file:///f:/lepark/server/src/services/youtubePlaylist.ts) extracts videos from YouTube playlists by parsing `ytInitialData` without requiring a Google API key.
* **Spatial Audio Rolloff:** In public spaces, audio uses a cosine rolloff (100% volume at 1 tile $\to$ 0% volume at 8 tiles). In private zones, audio is strictly isolated (100% inside, 0% outside).

#### B. TypeRace (Typewriter)
* **Asset:** Dedicated prop (`/assets/decoration/typewriter_1.png`).
* **Game Flow:**
  1. Players approach a typewriter and press `E` or click to open the lobby.
  2. Players click "Ready". Once all are ready, a 3-second countdown starts.
  3. Text quote is retrieved from Monkeytype's quote repository (with offline backups in `QuoteService.ts`).
  4. Real-time typing sync: Each keystroke sends `TYPERACE_PROGRESS` containing characters typed, errors, WPM, and accuracy.
  5. Live leaderboard displays progress bars for all competitors; winners receive podium ranks.

#### C. Smoking Game (Ashtray)
* **Asset:** Dedicated prop (`/assets/decoration/ashtray_1.png`).
* **Game Flow:**
  1. Spacebar-mashing endurance and speed challenge.
  2. Host configures mashes per cigarette (default 50) and match duration (default 60s).
  3. Players mash Spacebar to burn through cigarettes. Animated smoke puff particles (`smoke-puff-container`) and burning progress overlays render in real time.
  4. Tracks mashes-per-second (MPS / CPS), total mashes, and completed cigarettes.

#### D. Chess Game (Chess Board)
* **Asset:** Dedicated prop (`/assets/decoration/chess_board_1.png`) and piece sprites in `/assets/decoration/chess/`.
* **Game Flow:**
  1. 2-player matchmaking lobby with spectator support.
  2. Authoritative move validation on server via `chess.js`.
  3. Automatic board flipping (White at bottom, Black at bottom).
  4. Features: Pawn promotion dialog (Queen/Rook/Bishop/Knight), resignation, draw offers, FEN and SAN move history, check/checkmate/stalemate detection, and rematches.

### 5.5. Spatial WebRTC Voice Chat

* **Mesh Topology:** Peer-to-peer WebRTC connections between all active clients in the same acoustic context (Map or Private Zone).
* **Signaling:** Relayed through Colyseus WebSocket messages (`VOICE_SIGNAL`) carrying SDP offers, answers, and ICE candidates.
* **Speech Detection:** The client analyzes local and remote audio using the Web Audio API (`AnalyserNode`). When audio crosses the speaking threshold, a `VOICE_SPEAKING` packet is dispatched, causing Phaser to render pulsing green rings around the avatar.
* **Hardware Selection:** Users can select microphone inputs and speaker outputs; preferences persist in `localStorage`.

### 5.6. Authentication & Spaces Architecture

* **Authentication:** Lightweight, dependency-free authentication using Node.js native `crypto.scryptSync` (password hashing with 16-byte random salt) and custom HMAC-SHA256 JWT tokens.
* **User Roles:** `user` and `superadmin`.
  * Seeded superadmins: `admin` (`adminpassword123`) and `superadmin` (`adminpassword123`).
* **Space Types:**
  * **Superadmin Directory Spaces:** Public or invitation-only spaces categorized in the Space Directory (e.g. "Town Square", "Hangout Lounges"). Only superadmins can create, rename, or delete these.
  * **Personal Spaces (`user_space_<userId>`):** Every registered user automatically receives a personal space. Owners can configure it as public or private with a username whitelist.
* **Authoritative Space Join Check (`onAuth` in `GameRoom.ts`):** Enforces permissions before a WebSocket connection is admitted.

### 5.7. Resilient Dual-Mode Database Layer

The database manager in [`server/src/db/index.ts`](file:///f:/lepark/server/src/db/index.ts) is engineered with zero-downtime fault tolerance:
* **Primary Store:** PostgreSQL 16 connection pool.
* **Automatic Fallback:** If PostgreSQL is offline, restarting, or unreachable, queries automatically fall back to an internal in-memory data store (`inMemoryUsers`, `inMemorySpaces`, `inMemoryChats`).
* **Auto-Reconnect:** A background timer continually probes PostgreSQL; once re-established, the pool automatically resumes without requiring a server restart.

---

## 6. Network Protocol & Messaging Catalog

### 6.1. Colyseus WebSocket Messages (`GameRoom.ts`)

| Message Name | Direction | Payload Structure | Purpose |
| :--- | :--- | :--- | :--- |
| `PLAYER_INPUT` | C $\to$ S | `{ left: boolean, right: boolean, up: boolean, down: boolean }` | Walking input vector |
| `UPDATE_PROFILE` | C $\to$ S | `{ name: string, color: string }` | Update avatar appearance |
| `UPDATE_AVATARS` | C $\to$ S | `PlayerAvatars \| null` | Update custom uploaded animation frames |
| `PING` / `PONG` | C $\leftrightarrow$ S | `{ seq: number, t: number }` | Real-time latency & packet loss stats |
| `UPDATE_TILES` | C $\to$ S | `{ updates: Record<string, string> }` | Apply map editor tile mutations |
| `UPDATE_PRIVATE_ZONES` | C $\to$ S | `{ zones: PrivateZone[] }` | Update acoustic private zones |
| `SEND_CHAT_MESSAGE` | C $\to$ S | `SendChatMessagePayload` | Send chat text (map, zone, or whisper) |
| `CHAT_MESSAGE` | S $\to$ C | `ChatMessage` | Broadcast chat text to recipient group |
| `JUKEBOX_PLACE` | C $\to$ S | `JukeboxPlacePayload` | Place a new jukebox prop |
| `JUKEBOX_MOVE` | C $\to$ S | `JukeboxMovePayload` | Move existing jukebox to $(X, Y)$ |
| `JUKEBOX_DELETE` | C $\to$ S | `JukeboxDeletePayload` | Remove a jukebox prop |
| `JUKEBOX_ADD_TRACK` | C $\to$ S | `{ jukeboxId: string, urlOrId: string }` | Add single YouTube video to playlist |
| `JUKEBOX_ADD_PLAYLIST` | C $\to$ S | `{ jukeboxId: string, playlistUrlOrId: string }` | Scrape and queue entire YouTube playlist |
| `JUKEBOX_REMOVE_TRACK`| C $\to$ S | `{ jukeboxId: string, trackId: string }` | Remove specific track from queue |
| `JUKEBOX_SKIP_TRACK` | C $\to$ S | `{ jukeboxId: string }` | Skip current playing track |
| `TYPEWRITER_PLACE` | C $\to$ S | `TypewriterPlacePayload` | Place a typewriter prop |
| `TYPERACE_JOIN` | C $\to$ S | `{ typewriterId: string }` | Join TypeRace lobby |
| `TYPERACE_READY` | C $\to$ S | `{ typewriterId: string, ready: boolean }` | Toggle ready status |
| `TYPERACE_PROGRESS` | C $\to$ S | `TypeRaceProgressPayload` | Broadcast typed characters, WPM & accuracy |
| `ASHTRAY_PLACE` | C $\to$ S | `AshtrayPlacePayload` | Place an ashtray prop |
| `SMOKING_GAME_JOIN` | C $\to$ S | `{ ashtrayId: string }` | Join smoking game lobby |
| `SMOKING_GAME_START` | C $\to$ S | `{ ashtrayId: string }` | Start smoking countdown |
| `SMOKING_GAME_MASH` | C $\to$ S | `SmokingGameMashPayload` | Report spacebar mash count |
| `CHESS_BOARD_PLACE` | C $\to$ S | `ChessBoardPlacePayload` | Place a chess board prop |
| `CHESS_JOIN_MATCH` | C $\to$ S | `ChessJoinMatchPayload` | Join/create chess match |
| `CHESS_MOVE` | C $\to$ S | `ChessMovePayload` | Execute chess move (`from`, `to`, `promotion`) |
| `CHESS_RESIGN` | C $\to$ S | `ChessResignPayload` | Resign current match |
| `CHESS_OFFER_DRAW` | C $\to$ S | `ChessOfferDrawPayload` | Offer or accept draw |
| `VOICE_JOIN` | C $\to$ S | *(none)* | Join voice channel for current space/zone |
| `VOICE_LEAVE` | C $\to$ S | *(none)* | Disconnect from voice channel |
| `VOICE_SIGNAL` | C $\leftrightarrow$ S | `VoiceSignalPayload` | Relay WebRTC SDP offer/answer/ICE |
| `VOICE_SPEAKING` | C $\to$ S | `{ speaking: boolean }` | Notify server of local speaking activity |

### 6.2. Express REST API Endpoints (`server/src/index.ts`)

| Endpoint | Method | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | None | Returns server health and database status |
| `/api/players` | `GET` | None | Lists saved player records from database |
| `/api/auth/register` | `POST` | None | Register account (`username`, `password`, `displayName`) |
| `/api/auth/login` | `POST` | None | Login account $\to$ returns JWT token & user object |
| `/api/auth/me` | `GET` | Bearer | Get current authenticated user profile |
| `/api/auth/profile` | `PUT` | Bearer | Update user display name |
| `/api/spaces` | `GET` | Optional | Get directory spaces + user's personal space |
| `/api/spaces` | `POST` | Superadmin | Create new superadmin space |
| `/api/spaces/:id` | `PUT` | Superadmin | Update directory space settings |
| `/api/spaces/:id` | `DELETE` | Superadmin | Delete directory space |
| `/api/spaces/my-space` | `GET` | Bearer | Get personal space for authenticated user |
| `/api/spaces/my-space` | `PUT` | Bearer | Update personal space (name, public/private, whitelist) |
| `/api/spaces/user-space/:id`| `GET` | None | Retrieve user personal space by ID or username |

---

## 7. Critical Invariants & Gotchas

> [!WARNING]
> **Always recompile `shared` when updating shared logic:**  
> The server runs against the compiled code in `shared/dist/`. Whenever you edit any file in `shared/src/`, you **must** run:
> ```bash
> npm run build:shared
> ```
> Failing to do this will cause the server to run outdated schemas or collision rules, causing desyncs between client and server!

> [!IMPORTANT]
> **Port Invariants:**  
> * **PostgreSQL Container:** Maps host port `5433` to container port `5432` in `docker-compose.yml` (configured this way to prevent conflicts with local PostgreSQL instances on port 5432).
> * **Game Server:** Listens on port `2567`.
> * **Vite Dev Server:** Listens on port `5173`.

> [!TIP]
> **HTTPS and WebRTC Microphone Permissions:**  
> Modern browsers block microphone access (`navigator.mediaDevices.getUserMedia`) over unencrypted HTTP (unless on `localhost`). The repository includes an auto-generated SSL certificate generator in both server and client to enable HTTPS over LAN domains (`lan.jomlepark.cc`). Keep `SERVER_HTTPS=true` and `VITE_HTTPS=true` enabled when testing WebRTC audio.

---

## 8. Developer Recipes: Extending Lepark

### Recipe 1: Adding a New Decorative or Wall Asset
1. **Save Asset Image:** Place your PNG in `client/public/assets/<category>/<asset_name>.png`.
2. **Register in Preloader:** In [`client/src/scenes/GameScene.ts`](file:///f:/lepark/client/src/scenes/GameScene.ts), add the asset key to the asset array in `preload()`.
3. **Register in HTML Editor:** In [`client/index.html`](file:///f:/lepark/client/index.html), add the asset card button under the corresponding editor tab.
4. **Configure Collisions (if solid):** If the asset blocks movement, add its key to `WALL_ASSET_KEYS` in [`shared/src/collision.ts`](file:///f:/lepark/shared/src/collision.ts). If it requires a custom sub-pixel collision shape, define its bitmask in [`shared/src/assetBitmaps.ts`](file:///f:/lepark/shared/src/assetBitmaps.ts).
5. **Rebuild Shared Package:** Run `npm run build:shared`.

### Recipe 2: Adding a New Interactive Minigame / Prop
1. **Define State & Payloads:** Add the state interface (e.g. `MyGameState`, `MyGamePlacePayload`) to [`shared/src/types.ts`](file:///f:/lepark/shared/src/types.ts).
2. **Update Space Schema & DB:** Add entity column/field to `Space` in `shared/src/types.ts` and update [`server/src/db/index.ts`](file:///f:/lepark/server/src/db/index.ts).
3. **Handle Server Logic:** In [`server/src/rooms/GameRoom.ts`](file:///f:/lepark/server/src/rooms/GameRoom.ts):
   * Add entity storage map: `private myEntities: Map<string, MyGameState> = new Map();`.
   * Add message handlers for placement, joining, actions, and deletion.
   * Include entities in `getPixelCollisionChecker()` if they are solid obstacles.
4. **Client Network & UI:**
   * Add message dispatchers and listeners in [`client/src/network/MultiplayerManager.ts`](file:///f:/lepark/client/src/network/MultiplayerManager.ts).
   * Create visual sprite and interaction zone in [`client/src/scenes/GameScene.ts`](file:///f:/lepark/client/src/scenes/GameScene.ts).
   * Create HTML modal and event handlers in [`client/index.html`](file:///f:/lepark/client/index.html) and [`client/src/main.ts`](file:///f:/lepark/client/src/main.ts).
5. **Recompile:** Run `npm run build:shared` and restart dev servers.

---

## 9. Quick Start Commands

```bash
# 1. Install dependencies across all workspaces
npm install

# 2. Build the shared library (required before running server)
npm run build:shared

# 3. Start PostgreSQL database container
npm run db:up

# 4. Start backend Colyseus server (in terminal 1)
npm run dev:server

# 5. Start frontend Vite dev server (in terminal 2)
npm run dev:client

# 6. Verify whole monorepo builds cleanly
npm run build
```

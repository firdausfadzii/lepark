# Game Design & Technical Architecture Plan

**Project:** Infinite-Grind Productivity MMORPG (Working Title: *Netherworld Focus*)  
**Client Engine:** Phaser 3 (TypeScript)  
**Multiplayer Backend:** Colyseus (Node.js / TypeScript)  
**Math Library:** `break_infinity.js`

---

## 1. Executive Summary & Core Vision

*Netherworld Focus* combines real-world time management (Pomodoro and deep-work focus blocks) with the infinite, multiplicative progression loops of **Disgaea**. Players earn **Focus Points (FP)** by completing uninterrupted real-world work sessions and spend those points in fast, high-impact bursts to power up **their own personal RPG hero**, reincarnate across multiple classes, dive into procedural Item Worlds inside their gear, subdue and merge stat-boosting Specialists, and push exponentially scaling difficulty sliders.

### The Golden Rule of Design
> **Focus time generates fuel; break time burns fuel.**
>
> The RPG must never incentivize players to stare at the screen during a work timer. Instead of micromanaging an army of NPCs, each player builds **one personal hero** with **4 focused equipment slots** and teams up asynchronously with **3 real players** (from their Focus Squad or the Tavern Mercenary Link) whenever they launch an expedition. All combat math resolves instantaneously on the server during post-session breaks—eliminating slow grid pathfinding and heavy turn-by-turn replay logs while delivering exciting, co-op battle highlights in Phaser 3.

---

## 2. Core Gameplay Loop & State Machine

To protect the user's real-world productivity while delivering deep RPG satisfaction, the game enforces a strict two-state loop managed by the Colyseus room state inside a persistent **Base Camp / Top-Down Survivor Auto-Battle Arena**:

```text
+-------------------------------------------------------------------+
|                     1. STATE: FOCUS_LOCKED                        |
|  - Minimalist Phaser 3 idle scene (your hero + squad at campfire) |
|  - All RPG menus, Item World, Cheat Shop, and Trade are locked    |
|  - Server tracks start timestamp & active Focus Squadmates        |
+---------------------------------+---------------------------------+
                                  |
                                  v (Timer Completes -> Earns FP)
+-------------------------------------------------------------------+
|                     2. STATE: BREAK_REWARD                        |
|  - Designed around the "30-Second Spend" rule & 6-10s battle reel |
|  - Your hero deploys alongside 3 real players' character builds   |
+--------+------------------------+------------------------+--------+
         |                        |                        |
         v                        v                        v
+-----------------+     +------------------+     +------------------+
|  CHEAT SHOP     |     |   ITEM WORLD     |     |  REINCARNATION   |
| - Unlock Stars  |     | - 4 personal     |     | - Reset to Lv. 1 |
| - Tune XP/Drop/ |     |   gear slots     |     | - Master Classes |
|   Mastery rates |     | - Merge & Trade  |     |   & Spend Karma  |
+-----------------+     +------------------+     +------------------+
```

### State Descriptions
1. **`FOCUS_LOCKED` (Active Work Session):**
   * **Minimalist View:** Renders a low-CPU ambient campfire scene where your personal hero studies or rests alongside visiting Focus Squadmates while a subtle countdown timer runs.
   * **Strict Lock vs. Honor Mode:** Players can choose *Strict Lock* (leaving the tab/app for more than $30\text{ seconds}$ forfeits the completion bonus) or *Honor Mode* (allows tab switching for work research at a base $1.0\times$ FP rate).
2. **`BREAK_REWARD` (Post-Session Window):**
   * **Top-Down Survivor Auto-Battle Arena:** Spending FP deploys your hero alongside 3 real allied avatars, running an immediate 10-floor or 50-floor combat simulation on the Colyseus server in $< 5\text{ms}$ and returning lightweight `FloorMilestone` summaries. Phaser 3 uses those milestones to drive a **Vampire Survivors-style top-down auto-battle arena** where your party roams freely in 4 directions (`idle`, `walking`, `melee_swing`), clears incoming monster waves from the arena perimeter, collects magnetized XP/loot orbs, and faces Boss waves with speed toggles (`1x | 2x | 4x | Skip`).
   * **Carryover Bank:** Unspent FP never expires, allowing busy users to accumulate points all day and play during an evening break.

---

## 3. Focus-to-FP Economy & Pacing

### Focus Point (FP) Reward Formula
Focus Points are calculated on the Colyseus server using verified elapsed minutes ($t$):

$$\text{FP}_{\text{earned}} = \left\lfloor (t \times 4) \times M_{\text{complete}} \times M_{\text{streak}} \times M_{\text{squad}} \times M_{\text{first}} \times M_{\text{karma}} \right\rfloor$$

* **Base Rate:** $4\text{ FP}$ per minute ($100\text{ base FP}$ for a 25-minute Pomodoro; $200\text{ base FP}$ for a 50-minute block).
* **Completion Multiplier ($M_{\text{complete}}$):**
  * Full timer completed (Strict Lock): $1.25\times$ ($125\text{ FP}$ for 25 mins).
  * Full timer completed (Honor Mode): $1.00\times$ ($100\text{ FP}$ for 25 mins).
  * Ended early ($t \ge 10\text{ mins}$): $0.75\times$.
  * Ended under 10 minutes ($t < 10\text{ mins}$): $0\times$ (anti-spam threshold).
* **Streak Multiplier ($M_{\text{streak}}$):**
  $$M_{\text{streak}} = 1 + \min(D_{\text{streak}}, 14) \times 0.05 \quad (\text{Caps at } 1.70\times \text{ at 14 days})$$
* **Squad Synergy ($M_{\text{squad}}$):** $1.15\times$ if at least one member of your Focus Squad is actively in a focus session simultaneously.
* **First Spark Bonus ($M_{\text{first}}$):** $2.00\times$ on your first completed session of the calendar day to eliminate startup friction.
* **Focus Efficiency ($M_{\text{karma}}$):** $1 + (0.10 \times U_{\text{focus}})$, unlocked via the Reincarnation Karma tree to keep late-game exponential costs accessible.

### Healthy Productivity Guardrails
* **Soft Daily Cap (Anti-Burnout):** Focus minutes up to $240\text{ mins/day}$ (4 hours) earn $100\%$ FP. Beyond $240\text{ mins/day}$, FP generation drops to $50\%$ (*Fatigued Focus*) to discourage unhealthy overwork.
* **Weekend Streak Shields:** Players automatically receive **2 Freeze Shields** every Monday (max stock of 2). Missing up to two days (such as a weekend) consumes shields rather than resetting $D_{\text{streak}}$ to zero.

### Session-to-Action Pacing Benchmarks

| Player Stage | 25m Pomodoro FP | What 1 Session Buys in the RPG | Pacing Feel |
| :--- | :--- | :--- | :--- |
| **Day 1 (Rank 1 Gear)** | $125\text{ FP}$ | **70 Item World floors** (7 Gatekeeper bosses) *or* instant jump from Lv. 1 to Lv. 22. | Fast, explosive early hooks; unlocks Cheat Shop on Day 1. |
| **Week 2 (Rank 10 Gear)** | $165\text{ FP}$ | **30 Item World floors** + leftover FP to raise Cheat Shop cap by $+1$ Star. | Steady rhythm; 2 to 3 Pomodoros triggers a Reincarnation. |
| **Month 2 (Rank 22 Gear)** | $212\text{ FP}$ | **10 to 20 deep Item World floors** (Floor $100+$) to subdue high-tier Specialists. | High-stakes optimization; tuning Cheat Shop sliders matters. |
| **Endgame (Rank 35+ Gear)** | $212+\text{ FP}$ | **1 deep Carnage Expedition** (Floor $300+$) or massive Karma Reincarnation push. | Long-term prestige grind; Squad synergies become essential. |

---

## 4. The Three Pillars of Infinite Progression

*(Note: Traditional RNG senate/voting mechanics and manual turn-by-turn combat are intentionally excluded to eliminate menu bloat and keep break-time interactions fast and deterministic.)*

### Pillar 1: Single-Hero Reincarnation, Stored Levels & Karma Tree
Hitting the level cap ($L_{\text{cap}} = 9,999$) is not the end—it is the primary engine of permanent stat growth and class customization for your personal hero.
* **Stored Levels:** Reincarnating resets your hero to Level 1 while banking all earned levels into a cumulative pool ($S_{\text{total}}$), permanently increasing Level 1 Base Stats.
* **Cross-Class Mastery:** Upon reincarnating, players can temporarily switch into secondary classes to level up their **6-Star Class Mastery** (gaining permanent aptitude bonuses) and inherit up to **2 Cross-Class Passive Traits** before switching back to their preferred Party Role.
* **Karma Meta-Tree:** Reincarnating awards **Karma** ($K$), which players spend on permanent, deterministic account upgrades:
  * *Equipment Aptitude %* (multiplies all stats gained from your 4 equipped items).
  * *Shop Rank* (unlocks higher base tiers of weapons, armor, class emblems, and accessories up to Rank 30).
  * *Focus Efficiency* (increases FP earned per minute).
  * *Class & Dimensional Unlocks* (unlocks hybrid classes, Carnage Dimension modifiers, and Blacksmith capabilities).

### Pillar 2: Item World & Specialists (Focused 4-Slot Loadout)
Every piece of gear in your 4-slot loadout contains an infinite procedural sequence of floor encounters.
* **Batch Expeditions:** Players spend FP to send their 4-player party through a 10-floor or 50-floor batch inside a selected item. Each cleared floor permanently increases the item's level and base stats.
* **Gatekeepers & Item Gods:** Every 10th floor ($F = 10, 20, 30, \dots$) spawns a Gatekeeper Boss ($+3$ Item Levels and unlocks Shop Ranks). On Floor 100 of Legendary gear, an **Item God** spawns that drops the next Item Rank up (the sole way to obtain endgame Ranks $31\text{–}40$).
* **Subduing & Merging Specialists:** Wild stat spirits inhabit random floors. Defeating them **subdues** them, doubling their stat bonus and allowing players to **merge** two matching Specialists into one stronger resident, transfer them between items, or trade extras with Focus Squadmates.

### Pillar 3: The Cheat Shop
A deterministic slider interface unlocked early in progression that lets players customize difficulty and reward weights before launching expeditions:
* **Enemy Strength Stars ($E_{\text{stars}}$):** Players spend FP to raise their maximum Star Cap ($C_{\text{stars}}$), then freely slide active difficulty between $0$ and $C_{\text{stars}}$ to multiply enemy stats and rewards exponentially.
* **Reward Allocation Sliders:** Players distribute a shared percentage budget (starting at $300\%$ total, expandable via Karma) across **XP Gain**, **Item Drop Rate**, and **Weapon/Class Mastery** (each bounded between $0\%$ and $200\%$).

---

## 5. Single-Avatar Class System & Real-Player Party Synergies

Instead of controlling NPCs, each player chooses **one Active Class** for their personal hero and forms a **4-player asynchronous party** with real community members whenever they enter battle.

### 5.1 Starter Core Archetypes & Cross-Player Synergy Matrix

| Role | Starter Class | Primary Stats | Combat Passive & Stat Hook | Cross-Player Synergy Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **Tank** | **Heavy Knight** | `HP`, `DEF` | **Front Row Anchor:** Intercepts $85\%$ of incoming enemy damage and scales flat mitigation from `DEF`. | **Sunder Guard:** Applies $-35\%$ Enemy `DEF`, boosting allied Physical DPS damage by $1.4\times$. |
| **Physical DPS** | **Warrior** | `ATK`, `SPD` | **Boss & Combo Breaker:** High single-target burst specialist for Floor 10 Gatekeeper Bosses. | **Relentless Follow-Up:** Automatically strikes any enemy hit by a Tank or Mage for $+50\%$ Crit Damage. |
| **Magic / AoE DPS** | **Mage** | `INT`, `HIT` | **Back Row Wave Clearer:** Deals AoE damage across multi-enemy skirmish waves (Floors 1–9). | **Geo-Resonance:** Shatters Geo-Crystals on Turn 1 and converts $15\%$ of AoE damage into party SP/Energy. |
| **Healer / Support** | **Clergy** | `RES`, `INT` | **Expedition Sustain:** Restores party HP after every floor (preventing wipes on 50-floor runs). | **Overheal Ward:** Converts excess healing into an `ATK`/`INT` overshield for both allied DPS players. |

### 5.2 Party Composition Auras
Colyseus evaluates the roles of all 4 real players in the party and applies a global composition aura:
* **Trinity Aura (Balanced Party — at least 1 Tank, 1 Healer, and 2 DPS):** Grants $+25\%$ **All Stats** and $+15\%$ **Cheat Shop Star Efficiency** across the party.
* **Glass Cannon Rush (Unbalanced / All-DPS Party):** Players are never blocked from teaming up with friends of the same class; instead, running 3+ DPS trades defensive safety for $+30\%$ **Burst Damage** and $-20\%$ **Max HP**, encouraging fast floor clears before enemies can retaliate.

### 5.3 Unlockable Hybrid & Utility Classes (Karma Tree)
* **Thief (Utility DPS):** Trades raw combat power for boosted **Specialist Subdue rates** and bonus **Treasure Chest drops** for the entire party inside Item World.
* **Magic Knight (Hybrid Bruiser):** Scales weapon skills off both `ATK` and `INT` simultaneously and triggers **Elemental Link** combos with allied **Mages**.
* **Professor (Pure Buffer):** Casts $2\times$ stat amplification buffs onto allied DPS carries during **Live Co-Op Raid** bursts and Gatekeeper fights.

### 5.4 Class Mastery Stars & Cross-Class Trait Inheritance
* **6 Mastery Stars per Class:** Clearing Item World floors and Raid bosses levels up your hero's active class. Each Mastery Star (up to $6$ stars per class) grants a permanent $+2\%$ **Base Aptitude** bonus to that class's primary stats—persisting even after switching classes.
* **Cross-Class Reincarnation Loop:** When your hero reincarnates back to Level 1, you can temporarily level a secondary class to earn its Mastery Stars and inherit up to **2 Cross-Class Passive Traits** (e.g., a **Clergy** main reincarnating through **Heavy Knight** to inherit *Iron Wall* damage reduction, creating an unkillable battle healer).

### 5.5 Asynchronous Party Sync (Never Blocked by Offline Friends)
1. **Focus Squad Party (Primary):** If you belong to a 4-person Focus Squad, Colyseus automatically deploys your hero alongside your **3 real squadmates' live character snapshots** (matching their current gear, class, skills, and AI rules).
2. **Tavern Mercenary Link (Solo / Partial Squads):** If you play solo or have fewer than 4 members in your squad, empty party slots auto-fill with live snapshots of real players in your Reincarnation bracket who opted into the **"Open Party Pool."**
3. **Mutual Assist Rewards:** Every time you clear a 10-floor Item World batch, the 3 real players whose avatars fought alongside you receive **Assist Karma** and a share of **Class Mastery XP** in their Camp Inbox.

---

## 6. 4-Slot Equipment System, Specialists & Camp Blacksmith

Because each player controls **one personal hero**, gear progression centers on deep vertical investment across **4 personal equipment slots** rather than juggling inventory for an NPC army.

### 6.1 The 4 Personal Equipment Slots & Weapon Types

| Slot | Primary Stats | Gameplay & Build Role |
| :--- | :--- | :--- |
| **1. Weapon** | `ATK` or `INT`, `HIT` | Defines your **Weapon Type** (`SWORD`, `AXE`, `SPEAR`, `BOW`, `STAFF`, `FIST`, or `GUN`), scales with **Weapon Mastery**, and unlocks 3–4 weapon-specific skills for the Top-Down Survivor Auto-Battle Arena. |
| **2. Armor** | `DEF`, `RES`, `HP` | Your primary survivability layer. Heavy Knights scale mitigation off `DEF`; Mages and Clergy rely on `RES` robes to survive magic bosses. |
| **3. Class Emblem** | Class Primary + `Aptitude %` | A role-specific relic (*Vanguard Crest*, *Warlord Banner*, *Archmage Grimoire*, *Saint's Chalice*) that amplifies your **Cross-Player Synergy** potency (e.g., stronger *Sunder Guard* shred or bigger *Overheal Ward* shields). |
| **4. Accessory** | `SPD`, `Crit %`, Utility | Shoes, Orbs, Belts, or Rings that tune turn priority (ensuring your Tank acts before your DPS) and boost critical hit or drop rates. |

* **Cross-Class Weapon Freedom & Weapon Aptitudes:** Any class can equip any of the 7 Weapon Types, though each class has innate **Weapon Aptitudes** (`S` $= 1.30\times$, `A` $= 1.15\times$, `B` $= 1.00\times$, `C` $= 0.85\times$) that multiply stats extracted from that weapon.

### 6.2 Rarity Tiers & Item World Floor Caps

Higher rarity unlocks **deeper Item World floor caps**, **more Specialist sockets**, and **Passive Traits**:

| Rarity | Base Stat Mult | Max Item World Floor | Specialist Sockets | Bonus Mechanics |
| :--- | :--- | :--- | :--- | :--- |
| **Common** *(White)* | $1.00\times$ | Floor **30** | **2** sockets | Cheap to buy in Shop; ideal for harvesting early Specialists. |
| **Rare** *(Blue)* | $1.25\times$ | Floor **60** | **4** sockets | Rolls **1 Passive Trait**; spawns Gatekeeper mid-bosses on Floors 30 and 60. |
| **Legendary** *(Gold)* | $1.60\times$ | Floor **$100+$** *(Infinite in Carnage)* | **6–8** sockets | Rolls **2 Passive Traits**; Floor 100 spawns an **Item God** that drops the next Rank up. |

### 6.3 Item Ranks ($1\text{–}40$) & The Item God Climb Loop
1. **Ranks $1\text{–}30$ (Shop & Standard Drops):** Unlocking higher **Shop Ranks** via Reincarnation Karma lets players spend Focus Points to refresh and purchase Common or Rare gear directly, alongside random Item World drops.
2. **Ranks $31\text{–}40$ (Endgame Item God Climb):** Endgame Ranks ($31\text{–}40$) **cannot be bought in the shop**. To acquire a Rank 31 Legendary Weapon, players must clear all the way to **Floor 100 of a Rank 30 Legendary Weapon** and defeat its **Item God** boss—who is guaranteed to drop the Rank 31 counterpart. This creates a self-sustaining vertical climb: *grind a weapon $\to$ defeat its Item God $\to$ acquire the next tier $\to$ repeat*.

### 6.4 Specialists (Innocents): Living Stat Gems
Every item spawns with 1–3 **Unsubdued Specialists** living inside its Item World floors:
* **Uncapped Stat Specialists:**
  * **Gladiator** (`+ATK`), **Tutor** (`+INT`), **Coach** (`+DEF`), **Physician** (`+RES`), **Dietician** (`+HP`), **Marksman** (`+HIT`), **Sprinter** (`+SPD`).
* **Soft-Capped Grind & Economy Specialists:**
  * **Statistician** (`+XP %`, up to $+300\%$), **Instructor** (`+Weapon/Class Mastery %`, up to $+300\%$), **Broker** (`+FP Efficiency %`, up to $+100\%$), **Collector** (`+Rare/Legendary Drop Rate`).
* **The Subdue $\to$ Merge $\to$ Socket Loop:**
  1. Unsubdued Specialists appear on random floors inside an item's dungeon.
  2. Defeating one **subdues** it, instantly **doubling its level** and unlocking it so it can be moved to your **Specialist Warehouse**.
  3. Merging two subdued Specialists of the same type combines them with a **$10\%$ synergy bonus** ($M_{\text{merged}} = \lfloor (M_1 + M_2) \times 1.10 \rfloor$).
  4. Socket merged Specialists into your main 4-slot loadout—or trade spare ones to Focus Squadmates via the 1-to-1 Squad Barter Board.

### 6.5 Camp Blacksmith (Anti-RNG Protection)
Rare and Legendary gear roll **Passive Traits** (e.g., *Boss Slayer: $+25\%$ DMG vs. Gatekeepers*, *Trinity Conduit: $+10\%$ Party Aura*, *Vampiric Strike: Heal $5\%$ of damage dealt*). To respect players' limited break time and prevent frustrating RNG grinds, the **Camp Blacksmith** offers two deterministic FP sinks:
* **Rarity Fusion:** Feed duplicate copies of the same base item $+$ Focus Points to upgrade its rarity (`Common` $\to$ `Rare` $\to$ `Legendary`), expanding its max Item World floor cap and Specialist sockets without resetting your current Item Level.
* **Trait Transfer:** Spend Focus Points to extract one Passive Trait from a spare item and overwrite a trait slot on your primary gear—eliminating endless random stat rerolling.

---

## 7. Dungeon Encounter Generation & Animated Auto-Battler Design

Because battles resolve mathematically on the server without tilemap pathfinding or heavy replay logs, dungeon generation focuses on **pure PvE encounter archetypes, personal pre-battle stance setup, and client-side co-op choreography**.

### 7.1 Floor Encounter Director (10-Floor Batch Logic)
When a player launches a 10-floor expedition ($F$ to $F+9$), Colyseus rolls each floor's encounter profile:

| Floor Condition | Archetype | Encounter & Simulation Rules |
| :--- | :--- | :--- |
| $F == 100$ *(Legendary)* | **Item God Boss** | Spawns the **Item God** ($4.0\times$ stats). Defeating it grants $+5$ Item Levels and guarantees a drop of the **next Item Rank ($I_{\text{rank}} + 1$)**. |
| $F \pmod{10} == 0$ | **Gatekeeper Boss** | Spawns 1 Gatekeeper Boss ($2.5\times$ stats) + 2 elite guards. Clearing grants $+3$ Item Levels and unlocks the next Shop Rank tier. |
| **Roll** $\le 25\%$ | **Specialist Floor** | Spawns a neutral stat spirit alongside 3–4 enemies. Allies with the `Rush Specialist` AI rule target it first to subdue it before the wave ends. |
| **Roll** $\le 10\%$ | **Mystery Vault / Bounty** | Spawns a **Dimensional Treasure Vault** or **Squad Bounty Beast** that drops bonus Karma shards, high-level Specialists, or a **Squad Care Package** for all squadmates. |
| **Remaining** $65\%$ | **Standard Skirmish** | Spawns 3–6 enemies with 1 active **Geo-Effect** modifier (e.g., `ATK +50%`, `Enemy DEF +25%`, or `Poison 5%/turn`). |

### 7.2 Personal Pre-Battle Control (Stance & AI Rules)
Players configure their own hero's combat behavior during breaks without manual turn-by-turn inputs:
* **Personal Formation Row (`FRONT` vs. `BACK`):**
  * *Front Row:* Absorbs $75\%$ of incoming enemy damage ($85\%$ for **Heavy Knights**); ideal for Tanks and melee bruisers.
  * *Back Row:* Takes $25\%$ of incoming damage and deals $+15\%$ ranged/magic damage; ideal for **Mages** and **Clergy**.
* **Demonic Intelligence (Personal AI Priority Rules):** Toggleable behavioral weights evaluated during the server's turn simulation (and saved on your snapshot when allies summon you into their party):
  * `Rush Specialist`: Prioritizes attacking neutral Specialists before enemy units so they are subdued safely.
  * `Nullify Geo-Effect`: Spends Turn 1 neutralizing enemy-buffing Geo-Effects before trading damage.
  * `Save SP for Boss`: Holds burst skill multipliers until Floor 10's Gatekeeper or Floor 100's Item God.
  * `Trigger Party Combo`: Holds action until an allied Tank or Mage applies a debuff/mark to trigger a Cross-Player Synergy combo.

### 7.3 Top-Down Survivor Auto-Battle Arena & Seeded Wave Choreography (Phaser 3)
Instead of rendering a slow $10 \times 10$ tactical grid or a static side-view lane, Phaser 3 presents a dynamic **Top-Down Survivor Auto-Battle Arena** (inspired by *Vampire Survivors* auto-battlers) driven by per-floor `FloorMilestone` summaries:
* **Arena Layout:**
  * *Dungeon Floor & Braziers:* A top-down stone dungeon arena with flickering corner braziers and a central **Geo-Crystal** altar matching the wave's active Geo-Effect color (shattering in a screen-wide burst if neutralized).
  * *Autonomous 4-Player Party:* **Your personal hero** and **your 3 real party members** roam the arena autonomously using 4-directional `idle`, `walking`, and `melee_swing` animations. Melee classes (`Heavy Knight`, `Warrior`, `Thief`, `Magic Knight`) pursue and cleave incoming monsters with directional `melee_swing` arcs, while ranged/magic/support classes (`Mage`, `Clergy`, `Professor`) auto-kite, fire projectiles/AoE bursts, and heal allies.
  * *Perimeter Monster Waves & Boss Waves:* Each floor spawns a wave of monsters from the outer arena perimeter that swarm inward toward the party. Every 10th floor triggers a **Boss Wave** (Gatekeeper, or Floor 100 Item God) with a dramatic north-edge entrance, wide Boss HP bar, and Synergy Combo cut-in.
* **Three-Tier Wave Pacing:**
  1. **Swarm Wave ($\sim 1.6\text{–}2.4\text{s}$ per standard wave, compressed on 50-floor runs):** Monsters stream in from all sides while your party weaves, slashes, casts, and collects magnetized XP/gold orbs dropped by slain foes.
  2. **Spotlight Capture (Specialist/Mystery waves):** Neutral **Specialist Spirits** or **Bounty Mimics** spawn with the wave; defeating the Specialist triggers a **"SUBDUED!"** capture burst and magnetizes a glowing cyan orb to your hero.
  3. **Boss Wave Showdown (Floor 10 / 100):** The Gatekeeper or Item God drops in with a ground-slam shake and cut-in banner (*Heavy Knight Sunder Guard* $\to$ *Warrior Relentless Follow-Up*), followed by a massive finisher and magnetized victory orb fountain.
* **Playback Speed Controls:** A persistent `1x | 2x | 4x | Skip` toggle lets players customize watch speed to fit their break duration.
* **Phaser 3 "Game Feel" Juice:**
  * *4-Directional `melee_swing` & Slash Arcs:* Melee characters lock into their 4-directional swing animation paired with rotated slash/thrust/impact VFX.
  * *Micro Camera Shake & Tint Flashes:* Trigger subtle screen shake and white/red sprite flashes on crits and heavy impacts.
  * *Logarithmic Damage Numbers:* Scale floating damage text size and gold outlines proportionally to digit count (e.g., `42.5M!` slams onto screen).
  * *Magnetized XP & Loot Orbs:* Defeated monsters pop glowing XP/gold orbs that scatter outward and smoothly magnetize into the hero.

---

## 8. Mathematical Formulas & Scaling Curves

All exponential calculations on the server and client must use `break_infinity.js` (`Decimal`) to avoid JavaScript's `Number.MAX_SAFE_INTEGER` limit ($\approx 9 \times 10^{15}$).

### 8.1 Master Stat & Combat Equations

$$\text{Total Stat} = \left[ \left( \text{BaseStat} \times \text{Lv} \times \text{ClassMult} \right) + \left( \text{GearStat} \times \frac{\text{TotalAptitude}\%}{100} \times \left(1 + \frac{\text{WeaponMastery}}{100}\right) \right) \right] \times M_{\text{party}}$$

* Where $M_{\text{party}} = 1.25$ when the **Trinity Aura** is active ($1.00$ otherwise).

$$\text{Damage} = \max\left(1, \; \left(\text{ATK} \times \text{SkillMult}\right) - \left(\text{DEF}_{\text{eff}} \times 0.5\right)\right) \times \text{CritMult} \times \text{SynergyMult}$$

### 8.2 Reincarnation, Class Mastery & Karma Equations
* **XP Required per Level:**
  $$\text{XP}_{\text{req}}(L) = \left\lfloor 100 \times L^{2.2} \right\rfloor$$

* **Direct FP-to-XP Training Conversion (scaled by Reincarnation count $R$):**
  $$\text{XP}_{\text{gained}}(\text{FP}, R) = \text{FP} \times 50 \times (1.15)^R$$

* **Stored Levels ($S_{\text{total}}$) to Bonus Base Stat Points ($B_{\text{pts}}$):**
  $$\text{B}_{\text{pts}}(S_{\text{total}}) = \left\lfloor 10 \times \left(S_{\text{total}}\right)^{0.65} \right\rfloor$$

* **Karma Earned upon Reincarnation:**
  $$K_{\text{earned}}(L, R, D_{\text{streak}}) = \left\lfloor \left(\frac{L}{10}\right)^{1.4} \times (1 + 0.1 \times R) \times \left(1 + \min(D_{\text{streak}}, 30) \times 0.05\right) \right\rfloor$$

* **Total Equipment Aptitude (Karma Upgrade Rank $U$ + Class Mastery Stars $M_{c}$):**
  $$\text{TotalAptitude}\%(U, M) = 100\% + (5\% \times U) + \sum_{c} \left(2\% \times M_{c}\right) \qquad \text{Cost}_{\text{Karma}}(U) = \left\lfloor 50 \times (1.28)^U \right\rfloor$$

### 8.3 Item World, Rarity & Specialist Equations
* **Item World Enemy Stat Scaling (Item Rank $I_{\text{rank}} \in [1, 40]$, Floor $F$):**
  $$\text{EnemyStat}(I_{\text{rank}}, F) = \text{BaseRankStat}(I_{\text{rank}}) \times (1.045)^F \times \left(1 + 0.25 \times \left\lfloor \frac{F}{10} \right\rfloor\right)$$
  *(Note: Every 10th-floor Gatekeeper Boss receives a $2.5\times$ multiplier; Floor 100 Item Gods receive a $4.0\times$ multiplier.)*

* **Equipment Stat Growth (Item Level $I_{\text{lv}}$, Rarity Multiplier $M_{\text{rarity}} \in \{1.00, 1.25, 1.60\}$, Weapon Aptitude $M_{\text{wep}}$):**
  $$\text{GearStat} = \left[ \text{BaseItemStat} \times M_{\text{rarity}} \times M_{\text{wep}} \times \left(1 + 0.08 \times I_{\text{lv}}\right) \times (1.02)^{\text{BossKills}} \right] + \sum \text{SpecialistBonuses}$$

* **10-Floor Expedition FP Cost:**
  $$\text{FP}_{\text{cost}}(I_{\text{rank}}, F) = \left\lceil 15 \times (1.12)^{I_{\text{rank}}} \times \left(1 + \frac{F}{50}\right) \right\rceil$$

* **Specialist Merging (Levels $M_1$ and $M_2$):**
  $$M_{\text{merged}} = \left\lfloor (M_1 + M_2) \times 1.10 \right\rfloor$$

### 8.4 Cheat Shop Equations
* **Star Cap Unlock Cost:**
  $$\text{FP}_{\text{unlock}}(C_{\text{stars}}) = \left\lfloor 250 \times (1.35)^{C_{\text{stars}}} \right\rfloor$$

* **Active Star Difficulty & Reward Multipliers:**
  $$\text{EnemyStatMult}(E_{\text{stars}}) = (1.22)^{E_{\text{stars}}}$$
  $$\text{RewardMult}(E_{\text{stars}}) = 1 + \left(0.18 \times E_{\text{stars}}\right) + \left(0.015 \times E_{\text{stars}}^2\right)$$

* **Final XP Yield with Slider Allocation:**
  $$\text{FinalXP} = \text{BaseXP} \times \text{RewardMult}(E_{\text{stars}}) \times \frac{\text{Slider}_{\text{XP}}}{100}$$

### 8.5 Progression Sanity-Check Benchmarks

| Stage | Stored Levels ($S$) | Bonus Base Pts | Total Aptitude | Item Floor ($F$) | Cheat Stars | Enemy Mult | Damage Output |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Week 1** | $0$ | $0$ | $104\%$ | $10$ | $0$ | $1.00\times$ | $\approx 450$ |
| **Month 1** | $2,500$ | $1,615$ | $155\%$ | $50$ | $5$ | $2.70\times$ | $\approx 185,000$ |
| **Month 3** | $50,000$ | $11,314$ | $240\%$ | $150$ | $15$ | $19.74\times$ | $\approx 42.5\text{M}$ |
| **Month 6+** | $1,000,000$ | $79,432$ | $380\%$ | $500$ | $30$ | $389.76\times$ | $\approx 18.4\text{B}$ |

---

## 9. Pure PvE Co-Op MMO Systems & Squad Barter (Colyseus)

For v1, all multiplayer interactions are **100% cooperative PvE**—eliminating PvP meta-balancing and ensuring every social feature supports real-world accountability and shared progress:

1. **Asynchronous 4-Player Parties & Assist Karma:**
   * Your personal hero always fights alongside **3 real community avatars** (prioritizing your Focus Squadmates, with empty slots filled via the **Tavern Mercenary Link**).
   * Whenever your party clears an Item World batch, those 3 allied players earn **Assist Karma** and **Class Mastery XP** in their Camp Inbox, giving everyone passive progression even while offline or working.
2. **Focus Squads, Live Ticker & Real-Time "Cheer" Buffs:**
   * Players join a persistent 4–8 player Squad room. Active timers display live status indicators (*"Focusing: 18m left"*).
   * Whenever a member completes a Pomodoro or defeats a **Squad Bounty Beast**, all squadmates receive a passive **Squad Cheer Care Package** ($15\%$ of that session's FP) in their Camp Inbox.
   * During break-time expeditions, a compact **Live Squad Ticker** broadcasts milestones (*"Alex triggered a Sunder Guard Combo with Sarah on Floor 40!"*). Clicking **Cheer** sends a real-time Colyseus signal that drops a glowing aura onto that squadmate's active Auto-Battle Arena, granting an instant $+20\%$ **Crit Damage** surge.
3. **Squad-Exclusive 1-to-1 Barter Board (Squad Member Perk):**
   * **No Global Auction House or Solo 1-to-1 Trade:** Trading is strictly exclusive to members of the same Focus Squad. Because each player builds one dedicated hero archetype (e.g., a **Mage** seeking `INT` *Tutors* while a **Heavy Knight** seeks `DEF` *Coaches*), squadmates naturally rely on each other to optimize gear while preventing multi-account funneling.
   * **Co-Focus Eligibility Gate:** Two squadmates can trade after belonging to the same squad for at least **48 hours** and logging at least **60 shared focus minutes** together.
   * **Asynchronous Break-Mode Barter:** During `BREAK_REWARD`, each member can post up to **2 active 1-to-1 barter offers** (expiring after 72 hours) for **Subdued Specialists**, **Rare/Legendary Equipment**, and **Raid Summoning Keys**. Raw **FP**, **Karma**, and **Stored Levels** remain strictly account-bound.
   * **Rank-Clamping Protection:** Traded equipment dynamically clamps to the recipient's unlocked Shop Rank ($R_{\text{shop}}$) and highest cleared Item World floor ($F_{\text{max}}$), naturally awakening as the recipient progresses:
     $$\text{EffectiveRank} = \min\left(I_{\text{rank}}, \; R_{\text{shop}}\right) \qquad \text{EffectiveItemLevel} = \min\left(I_{\text{lv}}, \; F_{\text{max}}\right)$$
4. **Live Co-Op Raid Stages (Shared Boss Room):**
   * Weekly server-wide super-bosses (e.g., *Overlord Baal*) hosted in a shared Colyseus `RaidRoom`.
   * Up to **16 players** spending FP during the same break window appear in the Auto-Battle Arena simultaneously, watching each other's personal avatars surround and strike the boss in real time while active Tanks and Healers provide shared **Vanguard Shield** and **Inspirational Aura** buffs across the room.

---

## 10. Technical Implementation Guidelines

### Authoritative Server Simulation + Seeded Client Choreography
* **Never trust client timers, trades, or combat math.** When a player starts a Pomodoro, Colyseus records `sessionStartTime` on the server.
* When a player spends FP on an Item World expedition, the Colyseus server fetches the 3 allied player snapshots, resolves the 4-player synergy math across all floors in $< 5\text{ms}$, mutates the authoritative Colyseus Schema, and emits an `ExpeditionResult` containing compact `FloorMilestone` objects to drive the Phaser 3 Top-Down Survivor Auto-Battle Arena animations.

### Reference TypeScript Interfaces & Functions

#### Single Player-Avatar, Equipment & Specialist Schemas
```typescript
export type ClassId =
  | "HEAVY_KNIGHT"
  | "WARRIOR"
  | "MAGE"
  | "CLERGY"
  | "THIEF"
  | "MAGIC_KNIGHT"
  | "PROFESSOR";

export type EquipSlot = "WEAPON" | "ARMOR" | "EMBLEM" | "ACCESSORY";
export type WeaponType = "SWORD" | "AXE" | "SPEAR" | "BOW" | "STAFF" | "FIST" | "GUN";
export type ItemRarity = "COMMON" | "RARE" | "LEGENDARY";
export type PartyAura = "TRINITY_AURA" | "GLASS_CANNON_RUSH" | "STANDARD";

export interface Specialist {
  id: string;
  type:
    | "GLADIATOR"
    | "TUTOR"
    | "COACH"
    | "PHYSICIAN"
    | "DIETICIAN"
    | "MARKSMAN"
    | "SPRINTER"
    | "STATISTICIAN"
    | "INSTRUCTOR"
    | "BROKER"
    | "COLLECTOR";
  level: number;
  subdued: boolean;
}

export interface EquipmentItem {
  itemId: string;
  templateId: string;
  name: string;
  slot: EquipSlot;
  weaponType?: WeaponType; // Defined when slot === "WEAPON"
  rank: number;            // 1 to 40
  rarity: ItemRarity;
  itemLevel: number;       // Increased by clearing Item World floors
  currentFloor: number;    // Current progression inside this item's dungeon
  maxFloor: number;        // 30 (Common), 60 (Rare), 100+ (Legendary)
  bossKills: number;       // Gatekeepers / Item Gods defeated inside
  baseStats: {
    hp: string;            // Serialized break_infinity.js Decimal
    atk: string;
    def: string;
    int: string;
    res: string;
    spd: string;
  };
  specialists: Specialist[];
  maxSpecialistSlots: number;
  passiveTraits: string[]; // e.g., ["BOSS_SLAYER_25", "TRINITY_CONDUIT_10"]
}

export interface PlayerAvatarState {
  playerId: string;
  playerName: string;
  spriteId: string;
  level: number;
  reincarnations: number;
  storedLevels: number;
  activeClass: ClassId;
  battleRow: "FRONT" | "BACK";
  // Tracks mastery stars (0-6) per class for permanent +2% aptitude per star
  classMastery: Record<ClassId, number>;
  // Up to 2 passive traits inherited from secondary classes via Reincarnation
  inheritedPassives: string[];
  // Personal Demonic Intelligence AI toggles
  aiRules: {
    rushSpecialist: boolean;
    nullifyGeoEffect: boolean;
    saveSpForBoss: boolean;
    triggerPartyCombo: boolean;
  };
  // 4 personal equipment slots
  equippedGear: {
    weapon?: EquipmentItem;
    armor?: EquipmentItem;
    emblem?: EquipmentItem;
    accessory?: EquipmentItem;
  };
}

export interface PartyMemberSnapshot {
  playerId: string;
  playerName: string;
  spriteId: string;
  activeClass: ClassId;
  battleRow: "FRONT" | "BACK";
  level: number;
  isSquadmate: boolean; // True if from Focus Squad, false if Tavern Mercenary
  effectiveStats: {
    hp: string;
    atk: string;
    def: string;
    int: string;
    res: string;
    spd: string;
  };
}
```

#### Expedition Summary, Cross-Player Synergies & Live Raid Events
```typescript
export interface SynergyComboTrigger {
  initiatorName: string;
  initiatorClass: ClassId;
  finisherName: string;
  finisherClass: ClassId;
  comboName: string; // e.g., "Sunder Guard -> Relentless Follow-Up"
  bonusDamage: string;
}

export interface FloorMilestone {
  floor: number;
  archetype: "SKIRMISH" | "SPECIALIST" | "MYSTERY" | "GATEKEEPER" | "ITEM_GOD";
  cleared: boolean;
  totalDamage: string; // Serialized break_infinity.js Decimal
  geoBroken: boolean;
  specialistSubdued?: string;
  synergyCombo?: SynergyComboTrigger; // Triggers Dual Team Attack Cut-In
}

export interface ExpeditionResult {
  startFloor: number;
  endFloor: number;
  clearedAll: boolean;
  wipeFloor?: number;
  partyAura: PartyAura;
  alliedParty: PartyMemberSnapshot[]; // The 3 real players who fought beside you
  totalDamageDealt: string;
  xpGained: string;
  karmaGained: number;
  assistKarmaSentPerAlly: number;
  gatekeepersDefeated: number;
  floorSummaries: FloorMilestone[];
  subduedSpecialists: {
    type: string; // e.g., "Gladiator", "Tutor", "Coach", "Statistician"
    newLevel: number;
  }[];
  lootDropped: {
    itemId: string;
    name: string;
    rank: number;
    rarity: ItemRarity;
  }[];
}

// Broadcast event inside Colyseus RaidRoom when any raider spends FP to burst
export interface LiveRaidHitEvent {
  attackerId: string;
  attackerName: string;
  classId: ClassId;
  spriteId: string;
  damageDealt: string;
  isCrit: boolean;
  remainingBossHp: string;
}
```

#### Phaser 3 Top-Down Survivor Auto-Battle Animator (Real-Player Party & Wave Choreography)
```typescript
export class BattleStageAnimator {
  constructor(
    private scene: Phaser.Scene,
    private heroSprite: Phaser.GameObjects.Sprite,
    private allySprites: Phaser.GameObjects.Sprite[] // 3 real squadmate/mercenary sprites
  ) {}

  async playExpedition(floors: FloorMilestone[], speedMult = 1): Promise<void> {
    this.scene.tweens.timeScale = speedMult;

    for (const floor of floors) {
      if (floor.archetype === "GATEKEEPER" || floor.archetype === "ITEM_GOD") {
        await this.playBossShowdown(floor);
      } else if (floor.archetype === "SPECIALIST" && floor.specialistSubdued) {
        await this.playSpecialistCapture(floor);
      } else {
        await this.playQuickWaveBlitz(floor);
      }

      if (!floor.cleared) {
        await this.playPartyWipe(floor.floor);
        break;
      }
    }
  }

  private async playBossShowdown(floor: FloorMilestone): Promise<void> {
    const isItemGod = floor.archetype === "ITEM_GOD";
    this.scene.cameras.main.shake(isItemGod ? 350 : 250, isItemGod ? 0.02 : 0.015);
    const allPartySprites = [this.heroSprite, ...this.allySprites];

    await this.tweenPromise({
      targets: allPartySprites,
      x: "+=140",
      duration: 180,
      yoyo: true,
      ease: "Back.easeOut",
    });

    if (floor.synergyCombo) {
      this.spawnBigDamageText(
        480,
        195,
        `${floor.synergyCombo.initiatorName} x ${floor.synergyCombo.finisherName}: ${floor.synergyCombo.comboName}!`,
        true
      );
    }

    this.scene.cameras.main.flash(120, 255, 240, 200);
    this.spawnBigDamageText(680, 260, floor.totalDamage, true);
    await this.wait(650);
  }

  private async playQuickWaveBlitz(floor: FloorMilestone): Promise<void> {
    await this.tweenPromise({
      targets: this.heroSprite,
      x: "+=110",
      duration: 110,
      yoyo: true,
    });
    this.spawnBigDamageText(680, 300, floor.totalDamage, false);
    await this.wait(220);
  }

  private async playSpecialistCapture(floor: FloorMilestone): Promise<void> {
    this.scene.cameras.main.zoomTo(1.15, 200);
    this.spawnBigDamageText(650, 240, `SUBDUED ${floor.specialistSubdued}!`, true);
    await this.wait(500);
    this.scene.cameras.main.zoomTo(1.0, 200);
  }

  private async playPartyWipe(floorNum: number): Promise<void> {
    this.scene.cameras.main.shake(300, 0.02);
    this.spawnBigDamageText(300, 260, `WIPED ON FLOOR ${floorNum}`, true);
    await this.wait(600);
  }

  private spawnBigDamageText(x: number, y: number, value: string, isMassive: boolean) {
    const label = this.scene.add
      .text(x, y, `${value}!`, {
        fontFamily: "Impact, sans-serif",
        fontSize: isMassive ? "44px" : "28px",
        color: isMassive ? "#FFD700" : "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.scene.tweens.add({
      targets: label,
      y: y - 70,
      scale: isMassive ? 1.25 : 1.0,
      alpha: 0,
      duration: isMassive ? 900 : 500,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private tweenPromise(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({ ...config, onComplete: () => resolve() });
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }
}
```

#### Squad-Only 1-to-1 Barter Offer Schema
```typescript
export interface TradeOffer {
  offerId: string;
  squadId: string;
  senderId: string;
  senderName: string;
  offeredAsset: {
    kind: "SPECIALIST" | "EQUIPMENT" | "RAID_KEY";
    templateId: string;   // e.g., "spec_gladiator" or "wpn_longinus"
    levelOrRank: number;  // Specialist level or Item Rank
    itemLevel?: number;   // Included if kind === "EQUIPMENT"
    rarity: ItemRarity;
  };
  requestedCriteria: {
    kind: "SPECIALIST" | "EQUIPMENT" | "RAID_KEY";
    templateId: string;
    minLevelOrRank: number;
  };
  createdAt: number;
  expiresAt: number;      // Auto-returns item to sender after 72 hours
}
```

#### Big-Number Stat Calculator with Rarity, Rank Clamping, Class Mastery & Party Aura (`break_infinity.js`)
```typescript
import Decimal from "break_infinity.js";

const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  COMMON: 1.0,
  RARE: 1.25,
  LEGENDARY: 1.6,
};

export function calculateTotalStat(
  baseStat: number,
  level: number,
  classMult: number,
  item: EquipmentItem,
  weaponAptitudeMult: number,
  playerMaxShopRank: number,
  playerHighestFloor: number,
  specialistFlatBonus: number,
  karmaAptitudePct: number,
  totalClassMasteryStars: number,
  masteryLevel: number,
  hasTrinityAura: boolean
): Decimal {
  // Clamp traded equipment to recipient's progression milestones
  const effectiveRank = Math.min(item.rank, playerMaxShopRank);
  const effectiveItemLevel = Math.min(item.itemLevel, playerHighestFloor);
  const rankRatio = effectiveRank / Math.max(1, item.rank);
  const rarityMult = RARITY_MULTIPLIERS[item.rarity];

  const effectiveGearStat = new Decimal(item.baseStats.atk)
    .times(rankRatio)
    .times(rarityMult)
    .times(weaponAptitudeMult)
    .times(1 + 0.08 * effectiveItemLevel)
    .times(Math.pow(1.02, item.bossKills))
    .plus(specialistFlatBonus);

  // Combine base 100% + Karma Aptitude + +2% per earned Class Mastery star
  const totalAptitudePct = karmaAptitudePct + totalClassMasteryStars * 2;
  const partyMult = hasTrinityAura ? 1.25 : 1.0;

  const charPart = new Decimal(baseStat).times(level).times(classMult);
  const gearPart = effectiveGearStat
    .times(totalAptitudePct / 100)
    .times(1 + masteryLevel / 100);

  return charPart.plus(gearPart).times(partyMult).floor();
}
```

#### Server-Side Focus Session Validator
```typescript
export interface FocusSession {
  startTime: number;
  targetMinutes: number;
  strictMode: boolean;
}

export function calculateSessionFP(
  session: FocusSession,
  streakDays: number,
  activeSquadmates: number,
  isFirstToday: boolean,
  focusUpgradeRank: number
): number {
  const elapsedMinutes = (Date.now() - session.startTime) / 60000;
  // 10-second network tolerance buffer
  const validMinutes = Math.min(elapsedMinutes + 0.16, session.targetMinutes);

  if (validMinutes < 10) return 0;

  const isCompleted = validMinutes >= session.targetMinutes;
  const completeMult = isCompleted ? (session.strictMode ? 1.25 : 1.0) : 0.75;
  const streakMult = 1 + Math.min(streakDays, 14) * 0.05;
  const squadMult = activeSquadmates > 0 ? 1.15 : 1.0;
  const firstSessionMult = isFirstToday ? 2.0 : 1.0;
  const karmaEfficiencyMult = 1 + focusUpgradeRank * 0.1;

  return Math.floor(
    validMinutes *
      4 *
      completeMult *
      streakMult *
      squadMult *
      firstSessionMult *
      karmaEfficiencyMult
  );
}
```

---

## 11. Development Roadmap

* **Phase 1: Core Loop & Single Player-Avatar Prototype**
  * Build Colyseus room with `FOCUS_LOCKED` and `BREAK_REWARD` state machine.
  * Implement Pomodoro timer, FP bank, single player-avatar creation with starter classes (`Heavy Knight`, `Warrior`, `Mage`, `Clergy`), 4 personal gear slots (`WEAPON`, `ARMOR`, `EMBLEM`, `ACCESSORY`), and Shop Rank $1\text{–}5$.
* **Phase 2: The Infinite Pillars, Equipment Depth & Party Synergy Resolver**
  * Integrate `break_infinity.js` across server and Phaser client.
  * Build the Asynchronous 4-Player Party assembler (Focus Squad snapshots + Tavern Mercenary Link) and server combat simulator supporting **Trinity Aura**, **Cross-Player Synergy Combos**, Geo-Effects, and personal AI rules.
  * Add Gatekeepers, Floor 100 **Item Gods** (unlocking Ranks $31\text{–}40$), Specialist subduing & merging, Camp Blacksmith (**Rarity Fusion** & **Trait Transfer**), single-hero Reincarnation with 6-star Class Mastery, Karma Tree, and Cheat Shop sliders.
* **Phase 3: Phaser 3 Top-Down Survivor Auto-Battle Arena & Visual Juice**
  * Build the persistent Base Camp & Top-Down Survivor Auto-Battle Arena: cozy campfire idle visuals during `FOCUS_LOCKED`, and autonomous 4-directional wave combat (`BattleStageAnimator` with `idle`, `walking`, `melee_swing`, perimeter waves, magnetized orbs, and Boss waves) during `BREAK_REWARD`.
  * Implement hitstop freeze frames, screen shake, **Dual Team Attack Cut-Ins**, logarithmically scaled floating damage numbers, victory chest fountains, and `1x | 2x | 4x | Skip` speed controls.
* **Phase 4: Pure PvE Co-Op MMO Layer & Squad Barter**
  * Launch 8-player Focus Squad rooms, live status indicators, real-time Cheer buffs, and Assist Karma inbox payouts.
  * Implement the Squad-exclusive 1-to-1 Barter Board with the 48h/60m co-focus eligibility gate and Rank-Clamping stat protection.
  * Roll out 16-player Live Co-Op Raid Bosses with Tank/Healer/Buffer raid aura synergies.
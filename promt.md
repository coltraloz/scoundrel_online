# Knight's Dungeon — Clear Rules + Web Build Prompt

## Part 1: The Rules, Rewritten Clearly

### Overview
- Single-player card game. You are a knight clearing a dungeon made from one standard, shuffled 52-card deck.
- You start with **20 lives**. Clear the whole deck to win; lose if your lives reach 0.

### Card Values
- Number cards: face value (2–10).
- Figures: **J = 11, Q = 12, K = 13, A = 14**.

### Suits and What They Do
| Suit | Role | Effect |
|------|------|--------|
| ♠ Spades, ♣ Clubs | **Monsters** | Deal damage equal to their value. Can be fought **with a weapon** (damage reduced, monster stacks on the weapon) or **barehanded** (full damage, monster goes straight to the graveyard). |
| ♥ Hearts | **Healing potions** | Heal that many lives, capped at 20, then go to the graveyard. |
| ♦ Diamonds | **Weapons** | Equip one at a time. |

### Weapons (Diamonds)
- Hold **at most one weapon**. Equipping a new one sends the old weapon **and its whole monster stack** to the graveyard.
- A weapon reduces a monster's damage by its own value (minimum 0 damage).
- **Durability:** a weapon cannot block a monster worth **more than the last monster it defeated**. A brand-new weapon has battled nothing, so it can block anything (durability ∞).
- If the weapon can't block, the "fight with weapon" button is hidden — only the barehanded option remains.
- Fighting barehanded is always allowed. The weapon is untouched and the monster goes straight to the graveyard.
- Battled monsters stack **on top of the weapon** and stay in play until a new weapon is equipped.

### Rooms and Turns
1. **First turn:** deal 4 cards face-up in a line — this is a **room**.
2. Interact with **exactly 3 of the 4 cards** to clear the room. The untouched card stays and becomes the first card of the next room.
3. Interactions:
   - **Use a healing potion** (♥) — heal and discard to graveyard.
   - **Battle a monster** (♠/♣) — choose with weapon or barehanded.
   - **Equip a new weapon** (♦) — old weapon + its stack go to graveyard.
   - **Skip the whole room** — cannot be used twice in a row, and only before making any other action this turn. All 4 cards return to the **bottom of the deck, right to left** (rightmost ends up deepest).
4. After clearing a room, deal **3 new cards** to fill the room back to 4.

### Scoring
- **Death:** score = **negative** sum of monster values left in the deck and room (excluding the last monster fought).
- **Victory:** score = lives remaining.
- **Perfect victory (20 lives):** add the value of the strongest healing potion left in the final room.

---

## Part 2: Steps to Build a Web Page That Plays This Game

### Step 1 — Project setup
1. Create a folder `card_game/web/`.
2. Create `index.html`, `style.css`, `game.js`.
3. Open `index.html` in a browser — no build tools needed.

### Step 2 — HTML layout
1. Header with title, HUD (deck/graveyard counters) and a **How to Play** button.
2. Main area:
   - Room: 4 cards in a row.
   - Action panel: contextual buttons + Skip Room.
   - Weapon panel: weapon card + durability label, stack of monsters beside it.
   - HP panel: a 20-sided die with a pointer that moves to the current HP.
   - Graveyard: visible pile of discarded cards.
   - Adventure log.
3. Modals: How to Play (rules) and game over / victory (score + Play Again).

### Step 3 — Model the cards (`game.js`)
1. Build a 52-card deck with suits `['S','C','H','D']`, ranks `['2'..'10','J','Q','K','A']`, numeric values J=11…A=14.
2. State object:
   ```js
   state = {
     deck: [], room: [], graveyard: [],
     lives: 20,
     weapon: null,        // { card, lastMonsterValue }, Infinity = can block anything
     weaponStack: [],     // monsters stacked on the weapon, in play
     actionsThisRoom: 0, skippedLastTurn: false,
     gameOver: false, won: false, score: null, lastMonsterFought: null
   }
   ```
3. Fisher–Yates shuffle; `newGame()` resets everything.

### Step 4 — Room flow
1. Deal 4 cards to the room.
2. Each interaction removes one card and increments `actionsThisRoom`.
3. When the room has 1 card left (3 interactions done), it clears: reset action count, then deal 3 more cards (or win if the deck is empty).
4. `skipRoom()` validates (no prior action, not twice in a row), returns all 4 cards to the deck tail in right-to-left order, and deals a new room.

### Step 5 — Card actions
1. **Potion:** `lives = Math.min(20, lives + value)`; discard to graveyard.
2. **Battle:** choose with weapon or barehanded. With weapon: damage = `max(0, value - weapon.value)` only if `value <= weapon.lastMonsterValue`; monster stacks on weapon and updates durability. Barehanded: full damage, monster goes to graveyard, weapon unchanged.
3. **Equip:** old weapon + its `weaponStack` go to graveyard; new weapon starts with `lastMonsterValue = Infinity` and empty stack.

### Step 6 — Win / lose and scoring
1. Death: `lives <= 0` → score = negative sum of monster values in `deck + room`.
2. Victory: deck empty and room cleared → score = lives (+ strongest ♥ left in final room if lives === 20).
3. Show the score in the modal.

### Step 7 — Styling
1. Medieval dungeon theme: stone walls, wood banner, gold accents, serif fonts.
2. Parchment cards with hover lift; newly dealt cards animate in.
3. Stacked cards overlap with vertical offset; **only newly added cards animate** (track IDs so clicking doesn't restart animations).
4. HP d20 pointer rotates smoothly to the current HP value.
5. Responsive layout for narrow screens.

### Step 8 — Polish
1. Action log.
2. Damage shake / heal pulse on the HP die.
3. How to Play button with the full rules.
4. Cap visible stack piles at 5 cards with a "+N more" indicator.

### Step 9 — Testing checklist
- [ ] 52 cards total; room always refills to 4 after a clear.
- [ ] Exactly 3 interactions clear a room; 4th card carries over.
- [ ] Skip restrictions and right-to-left deck order.
- [ ] Potion never heals above 20.
- [ ] Weapon blocks only monsters ≤ durability; fresh weapon blocks anything; unblockable monsters show only the barehanded button.
- [ ] Equipping discards old weapon + stack; stack piles cap at 5 visible cards.
- [ ] Death score is negative; perfect-victory bonus correct.
- [ ] Clicking cards does not restart stack animations.
- [ ] How to Play modal shows the rules and closes correctly.

### Step 10 — Optional extras
- Save/load with `localStorage`, sound effects, difficulty modes, deployment to GitHub Pages.

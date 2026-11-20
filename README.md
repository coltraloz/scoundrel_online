# Scoundrel

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
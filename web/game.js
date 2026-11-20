'use strict';

/* ------------------------------------------------------------------ *
 *  Constants
 * ------------------------------------------------------------------ */

const SUITS = ['S', 'C', 'H', 'D'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_SYMBOL = { S: '♠', C: '♣', H: '♥', D: '♦' };

const isMonster = card => card.suit === 'S' || card.suit === 'C';
const isPotion  = card => card.suit === 'H';
const isWeapon  = card => card.suit === 'D';

const ROOM_SIZE = 4;          // cards visible in a room
const DEAL_PER_ROOM = 3;      // new cards dealt after clearing a room
const MAX_LIVES = 20;

/* ------------------------------------------------------------------ *
 *  State
 * ------------------------------------------------------------------ */

let state = null;
let selected = null;          // index of the selected card in the room
let fightBarehanded = false;  // fight without the equipped weapon
let prevRoomIds = new Set();  // cards already on screen (skip deal animation for them)
let prevStackIds = new Set(); // cards already animated in the weapon stack
let prevGraveIds = new Set(); // cards already animated in the graveyard
let fx = null;                // transient visual effect: 'damage' | 'heal' | 'equip'

function newGame() {
  state = {
    deck: shuffle(buildDeck()),
    room: [],
    graveyard: [],
    lives: MAX_LIVES,
    weapon: null,             // { card, lastMonsterValue } — Infinity = can block anything
    weaponStack: [],          // monsters piled on the equipped weapon (in play)
    actionsThisRoom: 0,
    skippedLastTurn: false,
    gameOver: false,
    won: false,
    score: null,
    lastMonsterFought: null
  };
  selected = null;
  fightBarehanded = false;
  prevRoomIds = new Set();
  prevStackIds = new Set();
  prevGraveIds = new Set();
  fx = null;
  clearLog();
  log('You enter the dungeon. 20 lives. Clear it all.');
  dealToRoom();
  render();
}

/* ------------------------------------------------------------------ *
 *  Deck helpers
 * ------------------------------------------------------------------ */

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({ suit, rank: RANKS[i], value: i + 2, id: suit + RANKS[i] });
    }
  }
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Fill the room up to ROOM_SIZE from the top of the deck. */
function dealToRoom() {
  while (state.room.length < ROOM_SIZE && state.deck.length > 0) {
    state.room.push(state.deck.shift());
  }
}

/* ------------------------------------------------------------------ *
 *  Actions
 * ------------------------------------------------------------------ */

/** Can the current weapon block this monster? */
function canBlock(card) {
  return state.weapon !== null && card.value <= state.weapon.lastMonsterValue;
}

function selectCard(index) {
  if (state.gameOver) return;
  if (selected === index) {
    clearSelection();   // clicking the selected card again deselects it
  } else {
    selected = index;
    fightBarehanded = false;
  }
  render();
}

function clearSelection() {
  selected = null;
  fightBarehanded = false;
}

/** Choose how to fight a monster, then perform the action. */
function fightSelected(barehanded) {
  fightBarehanded = barehanded;
  performSelected();
}

function performSelected() {
  if (selected === null || state.gameOver) return;
  const card = state.room[selected];
  if (!card) { clearSelection(); render(); return; }

  if (isPotion(card)) usePotion(card);
  else if (isMonster(card)) battle(card, fightBarehanded);
  else if (isWeapon(card)) equip(card);

  if (state.gameOver) { render(); return; }

  finishInteraction();
}

function usePotion(card) {
  const before = state.lives;
  state.lives = Math.min(MAX_LIVES, state.lives + card.value);
  state.graveyard.push(card);
  fx = 'heal';
  log(`Used ${label(card)} — healed ${state.lives - before} (now ${state.lives}/${MAX_LIVES}).`);
  consumeCard();
}

function battle(card, barehanded) {
  const armed = state.weapon !== null && !barehanded;
  const blocks = armed && canBlock(card);

  let damage = card.value;
  if (blocks) damage = Math.max(0, damage - state.weapon.card.value);

  state.lives -= damage;
  state.lastMonsterFought = card;

  if (armed) {
    state.weaponStack.push(card);          // monster stacks on the weapon, stays in play
    state.weapon.lastMonsterValue = card.value;
  } else {
    state.graveyard.push(card);
  }

  const blockText = blocks
    ? `weapon absorbed ${card.value - damage} (weapon: ${label(state.weapon.card)})`
    : barehanded && state.weapon
      ? 'fought barehanded (weapon ignored)'
      : armed
        ? 'weapon could NOT block this'
        : 'no weapon equipped';

  fx = damage > 0 ? 'damage' : 'block';
  log(`Battled ${label(card)} — took ${damage} damage ( ${blockText} ). Lives: ${Math.max(0, state.lives)}/${MAX_LIVES}.`);

  consumeCard();

  if (state.lives <= 0) {
    state.lives = 0;
    endGame(false);
  }
}

function equip(card) {
  if (state.weapon) {
    state.graveyard.push(state.weapon.card, ...state.weaponStack);
    log(`Equipped ${label(card)}, replacing ${label(state.weapon.card)} + ${state.weaponStack.length} defeated monster(s) → graveyard.`);
  } else {
    log(`Equipped ${label(card)}.`);
  }
  state.weapon = { card, lastMonsterValue: Infinity }; // fresh weapon blocks anything
  state.weaponStack = [];
  fx = 'equip';
  consumeCard();
}

/** Remove the selected card from the room (it was already sent to its destination). */
function consumeCard() {
  state.room.splice(selected, 1);
  state.actionsThisRoom++;
  clearSelection();
}

/** After each interaction: check for room clear / refill / win. */
function finishInteraction() {
  if (state.room.length > 1) { render(); return; }

  // Room cleared (1 carry-over card left)
  state.skippedLastTurn = false;
  state.actionsThisRoom = 0;

  if (state.deck.length === 0) {
    endGame(true);
    render();
    return;
  }

  dealToRoom();
  log('Room cleared — 3 new cards dealt.');
  render();
}

/** Skip: return all 4 room cards to the bottom of the deck (right to left). */
function skipRoom() {
  if (state.gameOver) return;
  if (state.actionsThisRoom !== 0) { log('Cannot skip: you already acted this turn.'); render(); return; }
  if (state.skippedLastTurn) { log('Cannot skip twice in a row.'); render(); return; }

  state.deck.push(...[...state.room].reverse()); // rightmost card ends up deepest
  state.room = [];
  state.skippedLastTurn = true;
  clearSelection();
  dealToRoom();
  log('Skipped the room — cards returned to the bottom of the deck.');
  render();
}

/* ------------------------------------------------------------------ *
 *  End of game & scoring
 * ------------------------------------------------------------------ */

function endGame(won) {
  state.gameOver = true;
  state.won = won;

  if (won) {
    state.score = state.lives;
    let detail = `Lives remaining: ${state.lives}.`;
    if (state.lives === MAX_LIVES) {
      const hearts = state.room.filter(isPotion);
      if (hearts.length > 0) {
        const bonus = Math.max(...hearts.map(c => c.value));
        state.score += bonus;
        detail += ` Perfect run bonus: +${bonus} (strongest potion left: ${label(hearts.reduce((a, b) => b.value > a.value ? b : a))}).`;
      }
    }
    log(`Dungeon cleared! Score: ${state.score}.`);
    showModal('🏆 Dungeon Cleared!', state.score, detail);
  } else {
    const remaining = [...state.deck, ...state.room]
      .filter(isMonster)
      .reduce((sum, c) => sum + c.value, 0);
    state.score = -remaining;   // dying always gives a negative score
    log(`You fell in the dungeon. Score: ${state.score}.`);
    showModal('💀 You Died', state.score, `Negative sum of monsters left in the deck and room: -${remaining}.`);
  }
}

function showModal(title, score, detail) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-score').textContent = `Score: ${score}`;
  document.getElementById('modal-detail').textContent = detail;
  document.getElementById('modal').hidden = false;
}

/* ------------------------------------------------------------------ *
 *  HP d20 die
 * ------------------------------------------------------------------ */

/** Place the numbers 1–20 around the die face once, at load time. */
function initD20() {
  const numbersEl = document.getElementById('d20-numbers');
  let html = '';
  for (let i = 1; i <= 20; i++) {
    const angle = -90 + (i - 1) * 18;
    html += `<span class="d20-num" style="transform: translate(-50%, -50%) rotate(${angle}deg) translateY(-70px) rotate(${-angle}deg)">${i}</span>`;
  }
  numbersEl.innerHTML = html;
}

/* ------------------------------------------------------------------ *
 *  Logging
 * ------------------------------------------------------------------ */

const logLines = [];

function log(msg) {
  logLines.unshift(msg);
  if (logLines.length > 20) logLines.pop();
}

function clearLog() {
  logLines.length = 0;
}

/* ------------------------------------------------------------------ *
 *  Rendering
 * ------------------------------------------------------------------ */

function label(card) {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

function render() {
  // HUD
  document.getElementById('deck-hud').textContent = `🃏 Deck: ${state.deck.length}`;
  document.getElementById('grave-hud').textContent = `🪦 Graveyard: ${state.graveyard.length}`;

  // HP d20: pointer moves to the current life value, color reddens as HP drops
  const hpValue = document.getElementById('d20-value');
  const hpRatio = (MAX_LIVES - state.lives) / MAX_LIVES; // 0 = full, 1 = empty
  const hpColor = `hsl(${Math.round(45 * (1 - hpRatio))}, ${Math.round(55 + 35 * hpRatio)}%, ${Math.round(65 - 15 * hpRatio)}%)`;
  hpValue.textContent = state.lives;
  hpValue.style.color = hpColor;
  hpValue.style.textShadow = `0 0 10px ${hpColor}`;
  const hpPointer = document.getElementById('d20-pointer');
  hpPointer.style.transform =
    `translate(-50%, -100%) rotate(${-90 + (state.lives - 1) * 18}deg)`;
  hpPointer.style.background = `linear-gradient(0deg, ${hpColor}, #fff3c4)`;
  hpPointer.style.boxShadow = `0 0 8px ${hpColor}`;

  // Weapon panel
  const slot = document.getElementById('weapon-slot');
  if (state.weapon) {
    const w = state.weapon;
    slot.className = '';
    slot.innerHTML = cardHTML(w.card, -1, false);
    if (fx === 'equip') flash(slot, 'fx-equip');
  } else {
    slot.className = 'empty';
    slot.textContent = 'No weapon equipped';
  }

  // Stacked monsters on the weapon — overlapping full cards, newest on top
  const stackEl = document.getElementById('weapon-stack');
  if (state.weaponStack.length > 0) {
    const durability = state.weapon.lastMonsterValue === Infinity
      ? '∞'
      : state.weapon.lastMonsterValue;
    stackEl.innerHTML =
      `<span class="durability-label">Durability: ${durability}</span>` +
      pileHTML(state.weaponStack, 'stack-pile', prevStackIds);
  } else {
    stackEl.innerHTML = '';
  }
  prevStackIds = new Set(state.weaponStack.map(c => c.id));

  // Room
  const roomEl = document.getElementById('room');
  roomEl.innerHTML = state.room
    .map((card, i) => cardHTML(card, i, i === selected, !prevRoomIds.has(card.id)))
    .join('');
  prevRoomIds = new Set(state.room.map(c => c.id));

  const turnInfo = document.getElementById('turn-info');
  turnInfo.textContent = `— interact with ${Math.max(0, state.room.length - 1)} more to clear`;

  // Action buttons
  const actionsEl = document.getElementById('actions');
  actionsEl.innerHTML = '';

  if (!state.gameOver && selected !== null && state.room[selected]) {
    const card = state.room[selected];

    if (isPotion(card)) {
      actionsEl.appendChild(button(`Use ${label(card)} (+${card.value} HP)`, 'heal', performSelected));
    } else if (isMonster(card)) {
      if (state.weapon && canBlock(card)) {
        const withWeapon = `Use weapon (${Math.max(0, card.value - state.weapon.card.value)} damage)`;
        actionsEl.appendChild(button(withWeapon, 'battle', () => fightSelected(false)));
        actionsEl.appendChild(button(`Barehanded (${card.value} damage)`, 'danger', () => fightSelected(true)));
      } else {
        actionsEl.appendChild(button(`Barehanded (${card.value} damage)`, 'danger', () => fightSelected(false)));
      }
    } else if (isWeapon(card)) {
      actionsEl.appendChild(button(`Equip ${label(card)} (value ${card.value})`, 'equip', performSelected));
    }
  }

  // Skip button
  const skipBtn = document.getElementById('skip-btn');
  const canSkip = !state.gameOver && state.actionsThisRoom === 0 && !state.skippedLastTurn;
  skipBtn.disabled = !canSkip;
  skipBtn.title = state.skippedLastTurn
    ? 'Cannot skip twice in a row'
    : state.actionsThisRoom > 0
      ? 'Cannot skip after acting this turn'
      : 'Return all 4 cards to the bottom of the deck';

  // Log
  document.getElementById('log').innerHTML =
    logLines.map(line => `<li>${line}</li>`).join('');

  // Graveyard pile
  const graveEl = document.getElementById('grave-pile');
  if (state.graveyard.length > 0) {
    graveEl.innerHTML = pileHTML(state.graveyard, 'grave', prevGraveIds, false) +
      `<span class="grave-count">${state.graveyard.length} cards</span>`;
  } else {
    graveEl.innerHTML = '<span class="grave-empty">Empty</span>';
  }
  prevGraveIds = new Set(state.graveyard.map(c => c.id));

  // One-shot visual effects (damage / heal / block / equip)
  if (fx === 'damage') flash(hpValue, 'fx-damage');
  else if (fx === 'heal') flash(hpValue, 'fx-heal');
  else if (fx === 'block') flash(document.getElementById('weapon-slot'), 'fx-block');
  fx = null;
}

function cardHTML(card, index, isSelected, isNew = false) {
  const cls = [
    'card',
    `suit-${card.suit}`,
    isSelected ? 'selected' : '',
    index === -1 ? 'static' : '',
    isNew ? 'deal' : ''
  ].filter(Boolean).join(' ');
  const attrs = index >= 0 ? `data-index="${index}"` : '';
  return `<div class="${cls}" ${attrs}>
    <span class="rank">${card.rank}</span>
    <span class="suit">${SUIT_SYMBOL[card.suit]}</span>
  </div>`;
}

/**
 * Render a list of cards as an overlapping pile of full cards.
 * Only newly added cards animate — existing ones keep their position so
 * clicking a card doesn't restart the whole pile animation.
 */
function pileHTML(cards, cls, prevIds, showMore = true) {
  const MAX_VISIBLE = 5;
  const shown = cards.slice(-MAX_VISIBLE);
  const hidden = cards.length - shown.length;
  const step = 22; // enough to see the rank + suit of each card in the stack
  const height = (shown.length - 1) * step + 92 + (hidden > 0 && showMore ? 22 : 0);
  let html = `<div class="pile ${cls}" style="height:${height}px">`;
  shown.forEach((card, i) => {
    const isNew = !prevIds.has(card.id);
    html += `<div class="card pile-card suit-${card.suit}${isNew ? ' pile-new' : ''}" style="top:${i * step}px" title="${label(card)} (${card.value})">
      <span class="rank">${card.rank}</span>
      <span class="suit">${SUIT_SYMBOL[card.suit]}</span>
    </div>`;
  });
  if (hidden > 0 && showMore) {
    html += `<span class="pile-more" style="top:${(shown.length - 1) * step + 96}px">+${hidden} more</span>`;
  }
  html += '</div>';
  return html;
}

/** Trigger a one-shot CSS animation on an element. */
function flash(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // restart the animation
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 600);
}

function button(text, kind, onClick) {
  const btn = document.createElement('button');
  btn.className = `action-btn ${kind}`;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

/* ------------------------------------------------------------------ *
 *  Wiring
 * ------------------------------------------------------------------ */

initD20();

document.getElementById('room').addEventListener('click', e => {
  const el = e.target.closest('[data-index]');
  if (!el) return;
  selectCard(Number(el.dataset.index));
});

document.getElementById('skip-btn').addEventListener('click', skipRoom);
document.getElementById('howto-btn').addEventListener('click', () => {
  document.getElementById('howto-modal').hidden = false;
});
document.getElementById('howto-close-btn').addEventListener('click', () => {
  document.getElementById('howto-modal').hidden = true;
});
document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('modal').hidden = true;
  newGame();
});

newGame();

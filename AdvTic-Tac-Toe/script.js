const SCORE_KEY = 'attt_scores_v2';

const WIN_LINES = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8], 
  [0,4,8], [2,4,6]
];

let history = [];
let future  = [];

let scores = loadScores();

let state = null;


function loadScores() {
  try {
    const s = localStorage.getItem(SCORE_KEY);
    return s ? JSON.parse(s) : { X: 0, O: 0 };
  } catch {
    return { X: 0, O: 0 };
  }
}

function saveScores() {
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  } catch {}
}

function freshState() {
  return {
    // cells[bigIdx][smallIdx] = '' | 'X' | 'O'
    cells: Array.from({ length: 9 }, () => Array(9).fill('')),
    // bigWinner[bigIdx] = '' | 'X' | 'O'
    bigWinner: Array(9).fill(''),
    currentPlayer: 'X',
    activeBig: null,
    gameOver: false,
    megaWinner: ''
  };
}


function checkWinner(arr) {
  for (const [a, b, c] of WIN_LINES) {
    if (arr[a] && arr[a] === arr[b] && arr[b] === arr[c]) {
      return arr[a];
    }
  }
  return null;
}

function isFull(arr) {
  return arr.every(x => x !== '');
}

function deepClone(s) {
  return JSON.parse(JSON.stringify(s));
}


function handleClick(big, small) {
  if (state.gameOver) return;
  if (state.cells[big][small] !== '') return;

  if (state.activeBig !== null) {
    const forcedFull = isFull(state.cells[state.activeBig]);
    if (!forcedFull && big !== state.activeBig) return;
  }

  history.push(deepClone(state));
  future = [];

  state.cells[big][small] = state.currentPlayer;

  if (!state.bigWinner[big]) {
    const miniWinner = checkWinner(state.cells[big]);
    if (miniWinner) {
      state.bigWinner[big] = miniWinner;
    }
  }

  const megaW = checkWinner(state.bigWinner);
  if (megaW) {
    state.megaWinner = megaW;
    state.gameOver = true;
    scores[megaW]++;
    saveScores();
    render();
    showResult(megaW, false);
    return;
  }

  const allFull = state.cells.every(b => isFull(b));
  if (allFull) {
    state.gameOver = true;
    render();
    showResult(null, true);
    return;
  }

  const nextBig  = small;
  const nextFull = isFull(state.cells[nextBig]);
  state.activeBig = nextFull ? null : nextBig;

  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';

  render();
}


function render() {
  const megaBoard = document.getElementById('megaBoard');
  megaBoard.innerHTML = '';

  for (let big = 0; big < 9; big++) {
    const miniDiv = document.createElement('div');
    miniDiv.className = 'mini-board';
    miniDiv.dataset.big = big;

    // Won overlay (big X or O drawn over the mini board)
    const overlay = document.createElement('div');
    overlay.className = 'board-won-overlay';
    overlay.textContent = state.bigWinner[big] || '';
    miniDiv.appendChild(overlay);

    // Highlight active board(s)
    if (!state.gameOver) {
      if (state.activeBig === null) {
        const hasCells = state.cells[big].some(c => c === '');
        if (hasCells) miniDiv.classList.add('active-board');
      } else if (state.activeBig === big) {
        const hasCells = state.cells[big].some(c => c === '');
        if (hasCells) miniDiv.classList.add('active-board');
      }
    }

    // Won styling
    if (state.bigWinner[big] === 'X')      miniDiv.classList.add('won-x');
    else if (state.bigWinner[big] === 'O') miniDiv.classList.add('won-o');

    // Build the 9 cells
    for (let small = 0; small < 9; small++) {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.textContent = state.cells[big][small];

      // Already taken
      if (state.cells[big][small]) {
        cell.classList.add('taken');
        cell.classList.add(state.cells[big][small] === 'X' ? 'x-mark' : 'o-mark');
        cell.disabled = true;
      }

      // Determine if this cell is clickable right now
      const isAllowed = (() => {
        if (state.gameOver) return false;
        if (state.cells[big][small] !== '') return false;
        if (state.activeBig === null) return true;
        if (state.activeBig === big) return true;
        // Forced board is full → allow anywhere
        return isFull(state.cells[state.activeBig]);
      })();

      if (!isAllowed) cell.disabled = true;

      cell.addEventListener('click', () => handleClick(big, small));
      miniDiv.appendChild(cell);
    }

    megaBoard.appendChild(miniDiv);
  }

  // ── Turn indicator ──
  const ts = document.getElementById('turnSymbol');
  ts.textContent = state.currentPlayer;
  ts.className = 'turn-symbol ' + state.currentPlayer;

  const tm = document.getElementById('turnMsg');
  if (state.gameOver) {
    tm.textContent = state.megaWinner
      ? ` — ${state.megaWinner} wins!`
      : ' — Draw!';
  } else if (state.activeBig !== null) {
    const forcedFull = isFull(state.cells[state.activeBig]);
    tm.textContent = forcedFull
      ? ' — play anywhere!'
      : ` — play in board #${state.activeBig + 1}`;
  } else {
    tm.textContent = ' — play anywhere!';
  }

  // ── Score cards ──
  document.getElementById('scoreXval').textContent = scores.X;
  document.getElementById('scoreOval').textContent = scores.O;

  document.getElementById('scoreX').className =
    'score-card' + (state.currentPlayer === 'X' && !state.gameOver ? ' active-x' : '');
  document.getElementById('scoreO').className =
    'score-card' + (state.currentPlayer === 'O' && !state.gameOver ? ' active-o' : '');

  // ── Undo / Redo button states ──
  document.getElementById('undoBtn').disabled = history.length === 0;
  document.getElementById('redoBtn').disabled = future.length === 0;
}

// ─────────────────────────────────────────
// RESULT BANNER
// ─────────────────────────────────────────

function showResult(winner, isDraw) {
  const banner = document.getElementById('resultBanner');
  const title  = document.getElementById('resultTitle');
  const sub    = document.getElementById('resultSub');
  const emoji  = document.getElementById('resultEmoji');

  if (isDraw) {
    emoji.textContent   = '🤝';
    title.textContent   = 'DEAD DRAW!';
    title.className     = '';
    sub.textContent     = 'An incredible match — no winner this time!';
  } else {
    emoji.textContent   = winner === 'X' ? '🔥' : '💎';
    title.textContent   = `PLAYER ${winner} WINS!`;
    title.className     = winner === 'X' ? 'x-win' : 'o-win';
    sub.textContent     = `Brilliant strategy! Player ${winner} conquers the board.`;
  }

  banner.classList.add('show');
}

// ─────────────────────────────────────────
// NEW GAME
// ─────────────────────────────────────────

function newGame() {
  history = [];
  future  = [];
  state   = freshState();
  document.getElementById('resultBanner').classList.remove('show');
  render();
}

// ─────────────────────────────────────────
// UNDO / REDO
// ─────────────────────────────────────────

function undo() {
  if (history.length === 0) return;
  future.push(deepClone(state));
  state = history.pop();
  render();
}

function redo() {
  if (future.length === 0) return;
  history.push(deepClone(state));
  state = future.pop();
  render();
}

// ─────────────────────────────────────────
// THEME TOGGLE
// ─────────────────────────────────────────

let isDark = true;

function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '🌙' : '☀️';
}

// ─────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────

document.getElementById('newGameBtn').addEventListener('click', newGame);
document.getElementById('resetBtn').addEventListener('click', newGame);

document.getElementById('resultNewGame').addEventListener('click', newGame);
document.getElementById('resultClose').addEventListener('click', () => {
  document.getElementById('resultBanner').classList.remove('show');
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

document.getElementById('themeBtn').addEventListener('click', toggleTheme);

document.getElementById('rulesBtn').addEventListener('click', () => {
  document.getElementById('rulesModal').classList.add('show');
});
document.getElementById('closeRules').addEventListener('click', () => {
  document.getElementById('rulesModal').classList.remove('show');
});
document.getElementById('rulesModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('rulesModal')) {
    document.getElementById('rulesModal').classList.remove('show');
  }
});

document.getElementById('scoreResetBtn').addEventListener('click', () => {
  scores = { X: 0, O: 0 };
  saveScores();
  render();
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault();
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
    e.preventDefault();
    redo();
  }
});

// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────

newGame();
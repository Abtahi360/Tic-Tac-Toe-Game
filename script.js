/* ============================================================
   Tic Tac Toe - Game Logic (Vanilla JavaScript)
   Features: PvP, PvC (unbeatable minimax AI), scoreboard,
   win/draw detection, winning-line highlight, sound FX
   generated via WebAudio API (no external assets needed).
   ============================================================ */

(() => {
  'use strict';

  // ---------- DOM references ----------
  const menuScreen   = document.getElementById('menu-screen');
  const gameScreen   = document.getElementById('game-screen');
  const boardEl      = document.getElementById('board');
  const turnText     = document.getElementById('turn-text');
  const scoreXEl     = document.getElementById('score-x');
  const scoreOEl     = document.getElementById('score-o');
  const scoreDEl     = document.getElementById('score-d');
  const scoreXCard   = document.getElementById('score-x-card');
  const scoreOCard   = document.getElementById('score-o-card');
  const labelO       = document.getElementById('label-o');
  const restartBtn   = document.getElementById('restart-btn');
  const resetBtn     = document.getElementById('reset-btn');
  const backBtn      = document.getElementById('back-btn');
  const soundBtn     = document.getElementById('sound-btn');
  const modeButtons  = document.querySelectorAll('.mode-btn');
  const modal        = document.getElementById('modal');
  const modalTitle   = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalBtn     = document.getElementById('modal-btn');

  // ---------- Game state ----------
  const state = {
    board: Array(9).fill(''),    // empty string means open cell
    currentPlayer: 'X',          // 'X' always starts
    mode: 'pvp',                 // 'pvp' or 'pvc'
    gameOver: false,
    scores: { X: 0, O: 0, D: 0 },
    soundOn: true,
  };

  // All winning index combinations on a 3x3 board
  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
    [0, 4, 8], [2, 4, 6],              // diagonals
  ];

  // ---------- Sound (WebAudio - generated, no files needed) ----------
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  /**
   * Play a short tone.
   * @param {number} freq     frequency in Hz
   * @param {number} duration in seconds
   * @param {string} type     oscillator type
   * @param {number} volume   0..1
   */
  function tone(freq, duration = 0.12, type = 'sine', volume = 0.15) {
    if (!state.soundOn) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  const sounds = {
    click: () => tone(520, 0.08, 'triangle', 0.18),
    win:   () => {
      // little ascending arpeggio
      [523, 659, 784, 1046].forEach((f, i) =>
        setTimeout(() => tone(f, 0.18, 'sine', 0.22), i * 110)
      );
    },
    draw:  () => {
      tone(300, 0.2, 'sawtooth', 0.15);
      setTimeout(() => tone(220, 0.25, 'sawtooth', 0.15), 180);
    },
  };

  // ---------- Screen navigation ----------
  function showScreen(screen) {
    [menuScreen, gameScreen].forEach(s => s.classList.remove('active'));
    // tiny timeout ensures fade animation retriggers
    requestAnimationFrame(() => screen.classList.add('active'));
  }

  // ---------- Build board cells ----------
  function buildBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.index = i;
      cell.setAttribute('aria-label', `Cell ${i + 1}`);
      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    }
  }

  // ---------- Turn indicator & score cards ----------
  function updateTurnUI() {
    if (state.gameOver) return;
    const name = state.currentPlayer === 'X'
      ? 'Player X'
      : (state.mode === 'pvc' ? 'Computer' : 'Player O');
    turnText.textContent = `${name}'s turn`;
    turnText.style.color = state.currentPlayer === 'X' ? '#4b8afe' : '#ff6fa3';

    scoreXCard.classList.toggle('active', state.currentPlayer === 'X');
    scoreOCard.classList.toggle('active', state.currentPlayer === 'O');
  }

  function updateScoreUI() {
    scoreXEl.textContent = state.scores.X;
    scoreOEl.textContent = state.scores.O;
    scoreDEl.textContent = state.scores.D;
  }

  // ---------- Cell click handler ----------
  function onCellClick(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (state.gameOver) return;
    if (state.board[idx] !== '') return;      // already filled
    // In PvC block clicks while it's the computer's turn
    if (state.mode === 'pvc' && state.currentPlayer === 'O') return;

    makeMove(idx, state.currentPlayer);

    // If game continues and PvC mode, let computer play
    if (!state.gameOver && state.mode === 'pvc' && state.currentPlayer === 'O') {
      boardEl.classList.add('locked');
      setTimeout(() => {
        const aiIdx = bestMove(state.board, 'O');
        if (aiIdx !== -1) makeMove(aiIdx, 'O');
        boardEl.classList.remove('locked');
      }, 420); // small delay so it feels natural
    }
  }

  // ---------- Make a move ----------
  function makeMove(idx, player) {
    state.board[idx] = player;
    const cell = boardEl.children[idx];
    cell.textContent = player;
    cell.classList.add('filled', player.toLowerCase());
    sounds.click();

    const winInfo = checkWinner(state.board);
    if (winInfo) {
      endGame(winInfo);
      return;
    }
    if (state.board.every(c => c !== '')) {
      endGame({ winner: 'D', line: [] });
      return;
    }
    // Switch player
    state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
    updateTurnUI();
  }

  // ---------- Check for winner ----------
  function checkWinner(b) {
    for (const line of WIN_LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        return { winner: b[a], line };
      }
    }
    return null;
  }

  // ---------- End game: highlight, score, modal ----------
  function endGame({ winner, line }) {
    state.gameOver = true;
    boardEl.classList.add('locked');

    if (winner === 'D') {
      state.scores.D++;
      sounds.draw();
      showModal("It's a Draw!", "No winner this round — try again!");
    } else {
      state.scores[winner]++;
      line.forEach(i => boardEl.children[i].classList.add('win'));
      sounds.win();
      const name = winner === 'X'
        ? 'Player X'
        : (state.mode === 'pvc' ? 'Computer' : 'Player O');
      showModal(`${name} Wins!`, `Congratulations, ${name} took the round 🎉`);
    }
    updateScoreUI();
    scoreXCard.classList.remove('active');
    scoreOCard.classList.remove('active');
    turnText.textContent = winner === 'D' ? "It's a draw" : `${winner} wins!`;
  }

  // ---------- Restart round (keep scores) ----------
  function restartRound() {
    state.board = Array(9).fill('');
    state.currentPlayer = 'X';
    state.gameOver = false;
    boardEl.classList.remove('locked');
    [...boardEl.children].forEach(cell => {
      cell.className = 'cell';
      cell.textContent = '';
    });
    updateTurnUI();
    hideModal();
  }

  // ---------- Reset scores ----------
  function resetScores() {
    state.scores = { X: 0, O: 0, D: 0 };
    updateScoreUI();
    restartRound();
  }

  // ---------- Modal helpers ----------
  function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    setTimeout(() => modal.classList.add('show'), 500); // delay so players see the win highlight
  }
  function hideModal() {
    modal.classList.remove('show');
  }

  // ============================================================
   // AI (Minimax) - unbeatable computer opponent
   // ============================================================

  /**
   * Find the best move for `player` on the given board.
   * Returns the cell index (0..8) or -1 if no moves.
   */
  function bestMove(board, player) {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = player;
        const score = minimax(board, 0, false, player);
        board[i] = '';
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }

  /**
   * Minimax recursive evaluator.
   * Scores: AI win = 10 - depth, loss = depth - 10, draw = 0.
   */
  function minimax(board, depth, isMaximizing, aiPlayer) {
    const humanPlayer = aiPlayer === 'O' ? 'X' : 'O';
    const result = checkWinner(board);
    if (result) {
      if (result.winner === aiPlayer)    return 10 - depth;
      if (result.winner === humanPlayer) return depth - 10;
    }
    if (board.every(c => c !== '')) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
          board[i] = aiPlayer;
          best = Math.max(best, minimax(board, depth + 1, false, aiPlayer));
          board[i] = '';
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
          board[i] = humanPlayer;
          best = Math.min(best, minimax(board, depth + 1, true, aiPlayer));
          board[i] = '';
        }
      }
      return best;
    }
  }

  // ---------- Mode selection ----------
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;   // 'pvp' or 'pvc'
      labelO.textContent = state.mode === 'pvc' ? 'Computer' : 'Player O';
      sounds.click();
      restartRound();
      updateScoreUI();
      // reset scores when choosing new mode
      state.scores = { X: 0, O: 0, D: 0 };
      updateScoreUI();
      showScreen(gameScreen);
    });
  });

  // ---------- Button events ----------
  restartBtn.addEventListener('click', () => { sounds.click(); restartRound(); });
  resetBtn.addEventListener('click',   () => { sounds.click(); resetScores(); });
  modalBtn.addEventListener('click',   () => { sounds.click(); restartRound(); });
  backBtn.addEventListener('click',    () => {
    sounds.click();
    hideModal();
    showScreen(menuScreen);
  });

  soundBtn.addEventListener('click', () => {
    state.soundOn = !state.soundOn;
    soundBtn.textContent = state.soundOn ? '🔊' : '🔇';
    if (state.soundOn) sounds.click();
  });

  // Close modal if overlay clicked (but not modal content)
  modal.addEventListener('click', e => {
    if (e.target === modal) hideModal();
  });

  // ---------- Init ----------
  buildBoard();
  updateTurnUI();
  updateScoreUI();
})();

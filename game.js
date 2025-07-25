const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- DOM要素 ---
const titleScreen = document.getElementById("title-screen");
const gameContainer = document.getElementById("game-container");
const modeAButton = document.getElementById("mode-a");
const modeBButton = document.getElementById("mode-b");
const difficultySelectionScreen = document.getElementById('difficulty-selection-screen');
const puyoSelectionScreen = document.getElementById('puyo-selection-screen');

// --- 定数 ---
const COLS = 6;
const ROWS = 12;
const BLOCK_SIZE = 40;

// 難易度ごとの落下速度(ミリ秒)
const GAME_SPEEDS = {
    easy: 600,
    normal: 400,
    hard: 250
};

const ALL_PUYO_IMAGES = [
    { id: 'puyo_red', src: 'puyo1.jpg' }, { id: 'puyo_green', src: 'puyo2.jpg' },
    { id: 'puyo_blue', src: 'puyo3.jpg' }, { id: 'puyo_yellow', src: 'puyo4.jpg' },
    { id: 'puyo_purple', src: 'puyo5.jpg' }, { id: 'puyo_cyan', src: 'puyo6.jpg' },
    { id: 'puyo_orange', src: 'puyo7.jpg' }, { id: 'puyo_pink', src: 'puyo8.jpg' },
    { id: 'puyo_white', src: 'puyo9.jpg' }, { id: 'puyo_black', src: 'puyo10.jpg' },
];

// ゲーム内背景画像
const GAME_BACKGROUND_IMAGE_SRC = 'game_background.jpg';
const GAME_BACKGROUND_IMAGE = new Image();
GAME_BACKGROUND_IMAGE.src = GAME_BACKGROUND_IMAGE_SRC;


// --- グローバル変数 ---
let PUYO_TYPES = [];
let PUYO_IMAGE_MAP = {};
const IMAGES = {};
let selectedPuyos = [];
let field = [];
let currentPiece = null;
let score = 0;
let gameOver = false;
let isProcessing = false;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let gameLoopTimeoutId = null;
let selectedMode = '';
let gameSpeed = GAME_SPEEDS.normal;

// --- Bモード関連の関数 ---
function setupPuyoSelection() {
    const container = document.getElementById('puyo-choices-container');
    container.innerHTML = '';
    ALL_PUYO_IMAGES.forEach(puyo => {
        const item = document.createElement('div');
        item.className = 'puyo-choice-item';
        item.dataset.puyoId = puyo.id;
        item.dataset.puyoSrc = puyo.src;
        const img = document.createElement('img');
        img.src = puyo.src;
        const arrow = document.createElement('div');
        arrow.className = 'selection-arrow';
        arrow.textContent = '↓';
        item.appendChild(img);
        item.appendChild(arrow);
        container.appendChild(item);
    });
}
function resetPuyoSelection() {
    selectedPuyos = [];
    document.querySelectorAll('.puyo-choice-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.getElementById('confirmation-popup').style.display = 'none';
}
function handlePuyoChoiceClick(e) {
    const targetItem = e.target.closest('.puyo-choice-item');
    if (!targetItem) return;
    const puyoId = targetItem.dataset.puyoId;
    const isSelected = targetItem.classList.contains('selected');
    if (isSelected) {
        targetItem.classList.remove('selected');
        selectedPuyos = selectedPuyos.filter(id => id !== puyoId);
    } else {
        if (selectedPuyos.length < 5) {
            targetItem.classList.add('selected');
            selectedPuyos.push(puyoId);
        }
    }
    if (selectedPuyos.length === 5) {
        document.getElementById('confirmation-popup').style.display = 'flex';
    }
}

// --- ゲーム開始・初期化の関数 ---
function startBModeGame() {
    PUYO_TYPES = [...selectedPuyos];
    PUYO_IMAGE_MAP = {};
    document.querySelectorAll('.puyo-choice-item.selected').forEach(item => {
        PUYO_IMAGE_MAP[item.dataset.puyoId] = item.dataset.puyoSrc;
    });
    puyoSelectionScreen.style.display = 'none';
    document.getElementById('confirmation-popup').style.display = 'none';
    gameContainer.style.display = 'flex';
    loadImages(() => {
        displayImages();
        restartGame();
    });
}

function startAModeGame() {
    PUYO_TYPES = ["puyo_red", "puyo_green", "puyo_blue", "puyo_yellow", "puyo_purple"];
    PUYO_IMAGE_MAP = {
        puyo_red: "puyo1.jpg", puyo_green: "puyo2.jpg", puyo_blue: "puyo3.jpg",
        puyo_yellow: "puyo4.jpg", puyo_purple: "puyo5.jpg",
    };
    titleScreen.style.display = "none";
    gameContainer.style.display = 'flex';
    loadImages(() => {
        displayImages();
        restartGame();
    });
}

function loadImages(callback) {
  let loaded = 0;
  Object.keys(IMAGES).forEach(key => delete IMAGES[key]);
  const total = Object.keys(PUYO_IMAGE_MAP).length;
  if (total === 0) { callback(); return; }
  for (const puyoType in PUYO_IMAGE_MAP) {
    const img = new Image();
    img.src = PUYO_IMAGE_MAP[puyoType];
    img.onload = () => { IMAGES[puyoType] = img; loaded++; if (loaded === total) callback(); };
    img.onerror = () => { console.error(`画像の読み込みに失敗しました: ${PUYO_IMAGE_MAP[puyoType]}`); loaded++; if (loaded === total) callback(); }
  }
}

function restartGame() {
    if (gameLoopTimeoutId) {
        clearTimeout(gameLoopTimeoutId);
    }
    score = 0;
    updateScoreDisplay();
    initField();
    draw();
    gameOver = false;
    isProcessing = false;
    gameLoop();
}

// --- ゲームのコアロジック関数 ---
async function handleClearingAndFalling() {
    isProcessing = true;
    let chainCount = 0;
    while (true) {
        dropBlocks();
        draw();
        const clearedGroups = clearBlocks();
        if (clearedGroups.length === 0) { break; }
        for (const clearedCount of clearedGroups) {
            chainCount++;
            const baseScore = 100 + (Math.max(0, clearedCount - 4)) * 20;
            const chainBonus = (chainCount > 1) ? chainCount * 100 : 0;
            const totalAddedScore = baseScore + chainBonus;
            score += totalAddedScore;
            updateScoreDisplay();
            showScorePopup(totalAddedScore);
        }
        draw();
        await sleep(300);
    }
    isProcessing = false;
}

async function gameLoop() {
  if (gameOver) return;
  if (isProcessing) {
      gameLoopTimeoutId = setTimeout(gameLoop, 100);
      return;
  }
  if (!currentPiece) {
    currentPiece = newPiece();
    if (isGameOver()) {
        gameOver = true; document.getElementById("status").textContent = "ゲームオーバー！"; draw(); return;
    }
  } else {
    if (canPieceMove(0, 1)) {
        currentPiece.pivot.y++;
    } else {
        fixPiece();
        await handleClearingAndFalling();
    }
  }
  draw();
  if (!gameOver) {
      gameLoopTimeoutId = setTimeout(gameLoop, gameSpeed);
  }
}

function clearBlocks() {
  const groupsToClear = [];
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (field[y][x] && !visited[y][x]) {
        const puyoType = field[y][x];
        const group = floodFill(x, y, puyoType, visited);
        if (group.length >= 4) {
          groupsToClear.push(group);
        }
      }
    }
  }
  if (groupsToClear.length > 0) {
    const clearedCounts = [];
    groupsToClear.forEach(group => {
        clearedCounts.push(group.length);
        group.forEach(([gx, gy]) => {
            field[gy][gx] = null;
        });
    });
    return clearedCounts;
  }
  return [];
}

function floodFill(x, y, puyoType, visited) {
    const queue = [[x, y]];
    const group = [];
    if (visited[y][x] || !field[y] || field[y][x] !== puyoType) return [];
    visited[y][x] = true;
    group.push([x, y]);
    let head = 0;
    while(head < queue.length) {
        const [cx, cy] = queue[head++];
        for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS &&
                field[ny][nx] === puyoType && !visited[ny][nx]) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
                group.push([nx, ny]);
            }
        }
    }
    return group;
}

function showScorePopup(amount) {
    const container = document.getElementById("score-popup-container");
    const popup = document.createElement("p");
    popup.textContent = `+${amount}`;
    popup.className = "score-popup";
    container.appendChild(popup);
    setTimeout(() => { popup.remove(); }, 1500);
}

function newPiece() {
    const piece = {
        pivot: { x: Math.floor(COLS / 2) - 1, y: 0, puyoType: PUYO_TYPES[Math.floor(Math.random() * PUYO_TYPES.length)] },
        mobile: { dx: Math.random() < 0.5 ? 1 : 0, dy: 0, puyoType: PUYO_TYPES[Math.floor(Math.random() * PUYO_TYPES.length)] },
    };
    if (piece.mobile.dx === 0) { piece.mobile.dy = 1; }
    return piece;
}

function fixPiece() {
    if (!currentPiece) return;
    const { pivot, mobile } = currentPiece;

    if (pivot.y >= 0 && pivot.y < ROWS) {
        field[pivot.y][pivot.x] = pivot.puyoType;
    }

    const mobileY = pivot.y + mobile.dy;
    const mobileX = pivot.x + mobile.dx;
    if (mobileY >= 0 && mobileY < ROWS) {
        field[mobileY][mobileX] = mobile.puyoType;
    }
    
    currentPiece = null;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (GAME_BACKGROUND_IMAGE.complete && GAME_BACKGROUND_IMAGE.naturalHeight !== 0) {
        ctx.drawImage(GAME_BACKGROUND_IMAGE, 0, 0, canvas.width, canvas.height);
    }
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (field[y][x]) drawBlock(x, y, field[y][x]);
        }
    }
    if (currentPiece) drawPiece();
}

function drawPiece() {
    if (!currentPiece) return;
    const { pivot, mobile } = currentPiece;
    drawBlock(pivot.x, pivot.y, pivot.puyoType);
    drawBlock(pivot.x + mobile.dx, pivot.y + mobile.dy, mobile.puyoType);
}

function drawBlock(x, y, puyoType) {
    if (y < 0) return;
    const img = IMAGES[puyoType];
    if (img) {
        ctx.drawImage(img, x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    } else {
        ctx.fillStyle = 'grey';
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
}

function displayImages() {
    const area = document.getElementById("image-display-area");
    area.innerHTML = '';
    for (const puyoType in IMAGES) {
        area.appendChild(IMAGES[puyoType].cloneNode());
    }
}

function updateScoreDisplay() {
    document.getElementById("score-display").textContent = score;
}

function canPieceMove(dx, dy) {
    if (!currentPiece) return false;
    const { pivot, mobile } = currentPiece;
    return canMove(pivot.x + dx, pivot.y + dy) && canMove(pivot.x + mobile.dx + dx, pivot.y + mobile.dy + dy);
}

function rotatePiece() {
    if (!currentPiece || isProcessing) return;
    const { pivot, mobile } = currentPiece;
    const { dx, dy } = mobile;
    let next_dx = dy; let next_dy = -dx;
    if (canMove(pivot.x + next_dx, pivot.y + next_dy)) {
        mobile.dx = next_dx; mobile.dy = next_dy;
    }
    draw();
}

function isGameOver() { return field[0][Math.floor(COLS / 2) - 1] || field[0][Math.floor(COLS / 2)]; }

function initField() {
    field = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    gameOver = false;
    currentPiece = null;
    document.getElementById("status").textContent = "";
}

function canMove(x, y) { return x >= 0 && x < COLS && y < ROWS && (y < 0 || field[y][x] === null); }

function dropBlocks() {
    for (let x = 0; x < COLS; x++) {
        for (let y = ROWS - 2; y >= 0; y--) {
            if (field[y][x] && !field[y + 1][x]) {
                let dropY = y;
                while (dropY + 1 < ROWS && !field[dropY + 1][x]) {
                    field[dropY + 1][x] = field[dropY][x];
                    field[dropY][x] = null; dropY++;
                }
            }
        }
    }
}

function setupControls() {
    document.getElementById("left").addEventListener("click", () => { if (!isProcessing && currentPiece && canPieceMove(-1, 0)) currentPiece.pivot.x--; draw(); });
    document.getElementById("right").addEventListener("click", () => { if (!isProcessing && currentPiece && canPieceMove(1, 0)) currentPiece.pivot.x++; draw(); });
    document.getElementById("down").addEventListener("click", () => { if (!isProcessing && currentPiece && canPieceMove(0, 1)) currentPiece.pivot.y++; draw(); });
    document.getElementById("rotate").addEventListener("click", rotatePiece);
    document.getElementById("reset").addEventListener("click", restartGame);
}

document.addEventListener("keydown", (e) => {
    if (gameOver || isProcessing || !currentPiece) return;
    if (e.key === "ArrowLeft") { if (canPieceMove(-1, 0)) currentPiece.pivot.x--; }
    else if (e.key === "ArrowRight") { if (canPieceMove(1, 0)) currentPiece.pivot.x++; }
    else if (e.key === "ArrowDown") { if (canPieceMove(0, 1)) currentPiece.pivot.y++; }
    else if (e.key === "ArrowUp") { rotatePiece(); }
    else if (e.key.toLowerCase() === "r") { restartGame(); }
    draw();
});

// --- イベントリスナーと初期化 ---
modeAButton.addEventListener("click", () => {
    selectedMode = 'A';
    titleScreen.style.display = 'none';
    difficultySelectionScreen.style.display = 'flex';
});
modeBButton.addEventListener("click", () => {
    selectedMode = 'B';
    titleScreen.style.display = 'none';
    difficultySelectionScreen.style.display = 'flex';
});

document.getElementById('easy-btn').addEventListener('click', () => handleDifficultySelect('easy'));
document.getElementById('normal-btn').addEventListener('click', () => handleDifficultySelect('normal'));
document.getElementById('hard-btn').addEventListener('click', () => handleDifficultySelect('hard'));

function handleDifficultySelect(difficulty) {
    gameSpeed = GAME_SPEEDS[difficulty];
    difficultySelectionScreen.style.display = 'none';
    if (selectedMode === 'A') {
        startAModeGame();
    } else if (selectedMode === 'B') {
        setupPuyoSelection();
        resetPuyoSelection();
        puyoSelectionScreen.style.display = 'flex';
    }
}

document.getElementById('puyo-choices-container').addEventListener('click', handlePuyoChoiceClick);
document.getElementById('reset-selection-btn').addEventListener('click', resetPuyoSelection);
document.getElementById('confirm-yes-btn').addEventListener('click', startBModeGame);
document.getElementById('confirm-no-btn').addEventListener('click', () => {
    document.getElementById('confirmation-popup').style.display = 'none';
    if (selectedPuyos.length === 5) {
        const lastSelectedId = selectedPuyos.pop();
        const itemToDeselect = document.querySelector(`.puyo-choice-item[data-puyo-id="${lastSelectedId}"]`);
        if(itemToDeselect) itemToDeselect.classList.remove('selected');
    }
});

setupControls();
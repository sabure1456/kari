const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas.getContext("2d");

// --- DOM要素 ---
const titleScreen = document.getElementById("title-screen");
const gameContainer = document.getElementById("game-container");
const modeRenButton = document.getElementById("mode-ren");
const modeFriendsButton = document.getElementById("mode-friends");
const difficultySelectionScreen = document.getElementById('difficulty-selection-screen');
const puyoSelectionScreen = document.getElementById('puyo-selection-screen');
const backToTitleBtn = document.getElementById('back-to-title-btn');
const gameOverPopup = document.getElementById('game-over-popup');
const gameOverText = document.getElementById('game-over-text');
const gameOverRetryBtn = document.getElementById('game-over-retry-btn');
const gameOverTitleBtn = document.getElementById('game-over-title-btn');

// --- サウンド定義 ---
const SOUNDS = {
    titleBGM: new Audio('audio/title_bgm.mp3'),
    renModeBGM: new Audio('audio/mode_ren_bgm.mp3'),
    friendsModeBGM: new Audio('audio/mode_friends_bgm.mp3'),
    clear: new Audio('audio/puyo_clear.mp3'),
    gameOver: new Audio('audio/game_over.mp3'),
    click: new Audio('audio/click.mp3'),
    land: new Audio('audio/puyo_falled.mp3')
};
SOUNDS.titleBGM.loop = true;
SOUNDS.renModeBGM.loop = true;
SOUNDS.friendsModeBGM.loop = true;

// --- ▼ ここからボリューム設定▼ ---
// BGMの音量を設定
SOUNDS.titleBGM.volume = 0.1;
SOUNDS.renModeBGM.volume = 0.03;
SOUNDS.friendsModeBGM.volume = 0.03;

// 効果音の音量を設定
SOUNDS.clear.volume = 0.2;
SOUNDS.gameOver.volume = 0.2;
SOUNDS.click.volume = 0.05;
SOUNDS.land.volume = 0.2;
// --- ▲ ここまでボリューム設定▲ ---

// --- 定数 ---
const COLS = 6;
const ROWS = 12;
const BLOCK_SIZE = 80;
const GAME_SPEEDS = { easy: 600, normal: 400, hard: 250 };
const REN_MODE_IMG_PATH = 'images/puyo_ren/';
const FRIENDS_MODE_IMG_PATH = 'images/puyo_friends/';
const REN_MODE_IMAGES = [
    { id: 'puyo_a_1', src: 'puyo_ren1.png', name: 'レンちゃん１' },
    { id: 'puyo_a_2', src: 'puyo_ren2.png', name: 'レンちゃん２' },
    { id: 'puyo_a_3', src: 'puyo_ren3.png', name: 'レンちゃん３' },
    { id: 'puyo_a_4', src: 'puyo_ren4.png', name: 'レンちゃん４' },
    { id: 'puyo_a_5', src: 'puyo_ren5.png', name: 'レンちゃん５' },
];
const FRIENDS_MODE_CHOICES = [
    { id: 'puyo_b_01', src: 'puyo_friends_an.png' , name:'アンちゃん'}, 
    { id: 'puyo_b_02', src: 'puyo_friends_gen.png', name:'ゲンちゃん'},
    { id: 'puyo_b_03', src: 'puyo_friends_mon.png', name:'もんちゃん'},
    { id: 'puyo_b_04', src: 'puyo_friends_katura.png', name:'カツラレン'},
    { id: 'puyo_b_05', src: 'puyo_friends_baby.png', name:'ベビーレン'},
    { id: 'puyo_b_06', src: 'puyo_friends_shougakusei.png', name:'小学生レン'}, 
    { id: 'puyo_b_07', src: 'puyo_friends_harumi.png', name:'はるみさん'},
    { id: 'puyo_b_08', src: 'puyo_friends_mother.png', name:'母ちゃん'}, 
    { id: 'puyo_b_09', src: 'puyo_friends_niityan.png', name:'兄ちゃん'},
    { id: 'puyo_b_10', src: 'puyo_friends_Ssensei.png', name:'S先生　'},
];
const REN_MODE_BACKGROUND_SRC = 'images/background/game_background_ren.png';
const FRIENDS_MODE_BACKGROUND_SRC = 'images/background/game_background_friends.png';

// --- グローバル変数 ---
let currentGameBackgroundImage = new Image();
let PUYO_TYPES = [];
let PUYO_IMAGE_MAP = {};
const IMAGES = {};
let selectedPuyos = [];
let field = [];
let currentPiece = null;
let nextPiece = null;
let score = 10000;
let gameOver = false;
let isProcessing = false;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let gameLoopTimeoutId = null;
let selectedMode = '';
let gameSpeed = GAME_SPEEDS.normal;
let isAudioUnlocked = false;

// --- ▼ ここから変更 ▼ ---
// --- サウンド制御関数 ---
// 最初の操作で音声を有効化し、タイトルBGMを再生
function unlockAudio() {
    if (isAudioUnlocked) return;
    isAudioUnlocked = true;

    // タイトルBGMの再生のみ行う（これで音声全体が有効化される）
    playSound(SOUNDS.titleBGM);

    // このリスナーは一度しか実行されないように解除
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
}

function playSound(sound) {
    if (!isAudioUnlocked && sound.loop) return; // BGMは有効化されるまで再生しない
    sound.currentTime = 0;
    sound.play().catch(e => {}); // AbortErrorは無視して良い
}
function stopAllBGM() {
    Object.values(SOUNDS).forEach(sound => {
        if (sound.loop) {
            sound.pause();
        }
    });
}
// --- ▲ ここまで変更 ▲ ---

// ゲームオーバー時のポップアップを表示する
function showGameOverPopup() {
    stopAllBGM();
    playSound(SOUNDS.gameOver);

    // ▼▼▼ この部分を変更 ▼▼▼
    // 新しいテキスト要素にスコアを含んだ文章を設定
    document.getElementById('final-score-text').innerHTML = `食べた量は<span class="score-highlight">${score}g</span>でした！`;
    // ▲▲▲ この部分を変更 ▲▲▲

    gameOverPopup.style.display = 'flex';
    resizeGameOverPopup();
}

// タイトル画面に戻る
function goBackToTitle() {
    if (gameLoopTimeoutId) {
        clearTimeout(gameLoopTimeoutId);
    }
    gameOver = true;
    stopAllBGM();
    playSound(SOUNDS.titleBGM);
    difficultySelectionScreen.style.display = 'none';
    puyoSelectionScreen.style.display = 'none';
    gameContainer.style.display = 'none';
    gameOverPopup.style.display = 'none';
    backToTitleBtn.style.display = 'none';
    titleScreen.style.display = 'flex';
}

// 友達モード: ぷよ選択画面の選択肢をHTMLに生成する
function setupPuyoSelection() {
    const container = document.getElementById('puyo-choices-container');
    container.innerHTML = '';
    FRIENDS_MODE_CHOICES.forEach(puyo => {
        const item = document.createElement('div');
        item.className = 'puyo-choice-item';
        item.dataset.puyoId = puyo.id;
        item.dataset.puyoSrc = puyo.src;
        const img = new Image();
        img.src = FRIENDS_MODE_IMG_PATH + puyo.src;
        const nameEl = document.createElement('p');
        nameEl.className = 'puyo-name';
        nameEl.textContent = puyo.name;
        item.appendChild(img);
        item.appendChild(nameEl);
        container.appendChild(item);
    });
}

// 友達モード: ぷよの選択状態をすべてリセットする
function resetPuyoSelection() {
    selectedPuyos = [];
    document.querySelectorAll('.puyo-choice-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.getElementById('confirmation-popup').style.display = 'none';
}

// 友達モード: ぷよ選択のクリックイベントを処理する
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
// 友達モード: 選択されたぷよでゲームを開始する
function startFriendsModeGame() {
    stopAllBGM();
    playSound(SOUNDS.friendsModeBGM);
    currentGameBackgroundImage.src = FRIENDS_MODE_BACKGROUND_SRC;
    PUYO_TYPES = [...selectedPuyos];
    PUYO_IMAGE_MAP = {};
    document.querySelectorAll('.puyo-choice-item.selected').forEach(item => {
        PUYO_IMAGE_MAP[item.dataset.puyoId] = FRIENDS_MODE_IMG_PATH + item.dataset.puyoSrc;
    });
    puyoSelectionScreen.style.display = 'none';
    document.getElementById('confirmation-popup').style.display = 'none';
    gameContainer.style.display = 'flex';
    backToTitleBtn.style.display = 'none';
    loadImages(() => {
        displayImages();
        restartGame();
    });
}

// レンモード: 事前定義されたぷよでゲームを開始する
function startRenModeGame() {
    stopAllBGM();
    playSound(SOUNDS.renModeBGM);
    currentGameBackgroundImage.src = REN_MODE_BACKGROUND_SRC;
    PUYO_TYPES = REN_MODE_IMAGES.map(puyo => puyo.id);
    PUYO_IMAGE_MAP = REN_MODE_IMAGES.reduce((map, puyo) => {
        map[puyo.id] = REN_MODE_IMG_PATH + puyo.src;
        return map;
    }, {});
    titleScreen.style.display = "none";
    gameContainer.style.display = 'flex';
    backToTitleBtn.style.display = 'none';
    loadImages(() => {
        displayImages();
        restartGame();
    });
}

// ゲームで使用するぷよの画像を読み込む
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

// ゲームの状態を初期化し、新しいゲームを開始する
function restartGame() {
    resizeGameLayout()
    if (gameLoopTimeoutId) {
        clearTimeout(gameLoopTimeoutId);
    }
    score = 9999990;
    updateScoreDisplay();
    initField();
    nextPiece = newPiece();
    draw();
    drawNextPiece();
    gameOver = false;
    isProcessing = false;
    gameLoop();
}

// --- ゲームのコアロジック関数 ---
// ぷよの消滅、落下、連鎖処理を管理する
async function handleClearingAndFalling() {
    isProcessing = true;
    let chainCount = 0;
    while (true) {
        dropBlocks();
        draw();
        const clearedGroups = clearBlocks();
        if (clearedGroups.length === 0) { break; }
        
        playSound(SOUNDS.clear);

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

// ゲームのメインループ（ぷよの自然落下などを制御）
async function gameLoop() {
  if (gameOver) return;
  if (isProcessing) {
      gameLoopTimeoutId = setTimeout(gameLoop, 100);
      return;
  }
  if (!currentPiece) {
    await handleClearingAndFalling();
    currentPiece = nextPiece;
    nextPiece = newPiece();
    drawNextPiece();
    if (isGameOver()) {
        gameOver = true;  
        draw(); 
        showGameOverPopup(); 
        return;
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

// 消せるぷよのグループを探し、消去してその結果を返す
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

// 同じ種類の隣接ぷよグループを探索する（連結判定）
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

// スコア加算時にアニメーションを表示する
function showScorePopup(amount) {
    const container = document.getElementById("score-popup-container");
    const popup = document.createElement("p");
    popup.textContent = `+${amount}`;
    popup.className = "score-popup";
    container.appendChild(popup);
    setTimeout(() => { popup.remove(); }, 1500);
}

// 新しいぷよのペア（ピース）を生成する
function newPiece() {
    const piece = {
        pivot: { x: Math.floor(COLS / 2) - 1, y: 0, puyoType: PUYO_TYPES[Math.floor(Math.random() * PUYO_TYPES.length)] },
        mobile: { dx: Math.random() < 0.5 ? 1 : 0, dy: 0, puyoType: PUYO_TYPES[Math.floor(Math.random() * PUYO_TYPES.length)] },
    };
    if (piece.mobile.dx === 0) { piece.mobile.dy = 1; }
    return piece;
}

// 落下しきったぷよを盤面に固定する
function fixPiece() {
    if (!currentPiece) return;
    playSound(SOUNDS.land);
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

// ゲーム画面のすべて（背景、盤面、操作中のぷよ）を描画する
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (currentGameBackgroundImage.complete && currentGameBackgroundImage.naturalHeight !== 0) {
        ctx.drawImage(currentGameBackgroundImage, 0, 0, canvas.width, canvas.height);
    }
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (field[y][x]) drawBlock(ctx, x, y, field[y][x]);
        }
    }
    if (currentPiece) drawPiece();
}

// NEXT表示を描画する
function drawNextPiece() {
    if (!nextPiece) return;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    const { pivot, mobile } = nextPiece;
    
    // nextCanvas専用のブロックサイズを、現在のキャンバス幅を元に動的に計算
    const nextBlockSize = nextCanvas.width / 2; // 140px / 2 = 70px

    // 新しいブロックサイズを基準にぷよの描画位置を計算
    const pivotX = (nextCanvas.width - (Math.abs(mobile.dx) + 1) * nextBlockSize) / 2;
    const pivotY = (nextCanvas.height - (Math.abs(mobile.dy) + 1) * nextBlockSize) / 2;
    const mobileX = pivotX + mobile.dx * nextBlockSize;
    const mobileY = pivotY + mobile.dy * nextBlockSize;

    // ぷよを新しいサイズで描画
    const pivotImg = IMAGES[pivot.puyoType];
    if (pivotImg) {
        nextCtx.drawImage(pivotImg, pivotX, pivotY, nextBlockSize, nextBlockSize);
    }
    
    const mobileImg = IMAGES[mobile.puyoType];
    if (mobileImg) {
        nextCtx.drawImage(mobileImg, mobileX, mobileY, nextBlockSize, nextBlockSize);
    }
}

// 操作中のぷよ（2個1組）を描画する
function drawPiece() {
    if (!currentPiece) return;
    const { pivot, mobile } = currentPiece;
    drawBlock(ctx, pivot.x, pivot.y, pivot.puyoType);
    drawBlock(ctx, pivot.x + mobile.dx, pivot.y + mobile.dy, mobile.puyoType);
}

// ぷよ1個を描画する
function drawBlock(targetCtx, x, y, puyoType) {
    if (y < 0) return;
    const img = IMAGES[puyoType];
    if (img) {
        targetCtx.drawImage(img, x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    } else {
        targetCtx.fillStyle = 'grey';
        targetCtx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
}

// ゲーム画面左に使用中のぷよ画像一覧を表示する
function displayImages() {
    const area = document.getElementById("image-display-area");
    area.innerHTML = '';

    // レンモードと友達モードのぷよ定義を一時的に結合して名前を検索しやすくする
    const allPuyoData = [...REN_MODE_IMAGES, ...FRIENDS_MODE_CHOICES];

    // 現在ゲームで使われているぷよの種類（PUYO_TYPES）を元にリストを生成
    PUYO_TYPES.forEach(puyoId => {
        // IDを元に、名前を含むぷよの全データを検索
        const puyoData = allPuyoData.find(p => p.id === puyoId);
        if (!puyoData || !IMAGES[puyoId]) return;

        // 画像と名前を囲むコンテナを作成
        const itemContainer = document.createElement('div');
        itemContainer.className = 'image-list-item';

        // 画像を作成
        const img = IMAGES[puyoId].cloneNode();

        // 名前を表示するspanを作成
        const nameSpan = document.createElement('span');
        nameSpan.className = 'image-list-name';
        nameSpan.textContent = puyoData.name;

        itemContainer.appendChild(img);
        itemContainer.appendChild(nameSpan);
        area.appendChild(itemContainer);
    });
}
// スコア表示を更新する
function updateScoreDisplay() {
    document.getElementById("score-display").textContent = score + "g";
}

// 操作中のぷよ全体が指定方向に移動可能か判定する
function canPieceMove(dx, dy) {
    if (!currentPiece) return false;
    const { pivot, mobile } = currentPiece;
    return canMove(pivot.x + dx, pivot.y + dy) && canMove(pivot.x + mobile.dx + dx, pivot.y + mobile.dy + dy);
}

// 操作中のぷよを回転させる
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

// ゲームオーバー条件を満たしているか判定する
function isGameOver() { return field[0][Math.floor(COLS / 2) - 1] || field[0][Math.floor(COLS / 2)]; }

// ゲーム盤面を空の状態で初期化する
function initField() {
    field = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    gameOver = false;
    currentPiece = null;
}

// 指定された座標が移動可能か（壁や他のぷよがないか）判定する
function canMove(x, y) { return x >= 0 && x < COLS && y < ROWS && (y < 0 || field[y][x] === null); }

// 宙に浮いているぷよをすべて下に落とす
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

// 画面上の操作ボタンにイベントリスナーを設定する
function setupControls() {
    document.getElementById("left").addEventListener("click", () => { if (!isProcessing && currentPiece && canPieceMove(-1, 0)) currentPiece.pivot.x--; draw(); });
    document.getElementById("right").addEventListener("click", () => { if (!isProcessing && currentPiece && canPieceMove(1, 0)) currentPiece.pivot.x++; draw(); });
    document.getElementById("down").addEventListener("click", () => { if (!isProcessing && currentPiece && canPieceMove(0, 1)) currentPiece.pivot.y++; draw(); });
    document.getElementById("rotate").addEventListener("click", rotatePiece);
    document.getElementById("reset").addEventListener("click", restartGame);
}

// キーボード入力のイベントリスナー
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
modeRenButton.addEventListener("click", () => {
    selectedMode = 'ren';
    titleScreen.style.display = 'none';
    difficultySelectionScreen.style.display = 'flex';
    backToTitleBtn.style.display = 'inline-block';
});
modeFriendsButton.addEventListener("click", () => {
    selectedMode = 'friends';
    titleScreen.style.display = 'none';
    difficultySelectionScreen.style.display = 'flex';
    backToTitleBtn.style.display = 'inline-block';
});

document.getElementById('easy-btn').addEventListener('click', () => handleDifficultySelect('easy'));
document.getElementById('normal-btn').addEventListener('click', () => handleDifficultySelect('normal'));
document.getElementById('hard-btn').addEventListener('click', () => handleDifficultySelect('hard'));

function handleDifficultySelect(difficulty) {
    gameSpeed = GAME_SPEEDS[difficulty];
    difficultySelectionScreen.style.display = 'none';
    if (selectedMode === 'ren') {
        startRenModeGame();
    } else if (selectedMode === 'friends') {
        setupPuyoSelection();
        resetPuyoSelection();
        puyoSelectionScreen.style.display = 'flex';
    }
}

document.getElementById('puyo-choices-container').addEventListener('click', handlePuyoChoiceClick);
document.getElementById('reset-selection-btn').addEventListener('click', resetPuyoSelection);
document.getElementById('confirm-yes-btn').addEventListener('click', startFriendsModeGame);
document.getElementById('confirm-no-btn').addEventListener('click', () => {
    document.getElementById('confirmation-popup').style.display = 'none';
    if (selectedPuyos.length === 5) {
        const lastSelectedId = selectedPuyos.pop();
        const itemToDeselect = document.querySelector(`.puyo-choice-item[data-puyo-id="${lastSelectedId}"]`);
        if(itemToDeselect) itemToDeselect.classList.remove('selected');
    }
});

backToTitleBtn.addEventListener('click', goBackToTitle);
gameOverTitleBtn.addEventListener('click', goBackToTitle); // タイトルへ戻るボタン
document.getElementById('ingame-back-to-title-btn').addEventListener('click', goBackToTitle);
gameOverRetryBtn.addEventListener('click', () => { // おかわりボタン
    gameOverPopup.style.display = 'none';
    
    // 現在のモードのBGMを再生し直す
    stopAllBGM();
    if (selectedMode === 'ren') {
        playSound(SOUNDS.renModeBGM);
    } else if (selectedMode === 'friends') {
        playSound(SOUNDS.friendsModeBGM);
    }

    restartGame();
});

// 全てのボタンにクリック音を設定
// ...

document.querySelectorAll('.btn-effect').forEach(button => {
    button.addEventListener('click', () => {
        playSound(SOUNDS.click);
    });
});

setupControls();

// 最初の操作で音声を有効化するリスナーを追加
document.addEventListener('click', unlockAudio);
document.addEventListener('keydown', unlockAudio);

/* game.js の resizeGameLayout 関数を以下のように書き換える */

function resizeGameLayout() {
  const gameContainer = document.getElementById('game-container');

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  const baseWidth = 700; 
  const baseHeight = 800; 

  // ▼▼▼ ここの計算から余白(- 40)を削除 ▼▼▼
  const availableWidth = windowWidth;
  const availableHeight = windowHeight;

  const scaleBasedOnHeight = availableHeight / baseHeight;
  const scaleBasedOnWidth = availableWidth / baseWidth;

  const scale = Math.min(scaleBasedOnHeight, scaleBasedOnWidth);

  gameContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
}


function resizeGameOverPopup() {
    const popupContent = document.querySelector('#game-over-popup .popup-content');
    if (!popupContent) return;

    // --- 1. ポップアップの基本設定 ---
    // ポップアップの基本となる形（アスペクト比）と文字サイズを定義します。
    const BASE_WIDTH = 520;      // 基本の横幅 (px)
    const BASE_HEIGHT = 480;     // 基本の縦幅 (px)
    const BASE_FONT_SIZE = 6;   // 拡縮率100%の時の基本フォントサイズ (px)

    // --- 2. 現在の画面サイズを取得 ---
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // --- 3. 最適な縮尺（スケール）を計算 ---
    // 横幅と縦幅、それぞれが画面に収まるための縮尺を計算
    const scaleX = (viewportWidth - 40) / BASE_WIDTH;   // 左右に20pxずつの余白を考慮
    const scaleY = (viewportHeight - 40) / BASE_HEIGHT; // 上下に20pxずつの余白を考慮

    // 横幅と縦幅の両方が画面に収まる、より小さい方の縮尺を採用
    const uniformScale = Math.min(scaleX, scaleY);

    // --- 4. 計算したスタイルを適用 ---
    // ポップアップ全体を「均等に」拡縮します（これにより歪みません）
    popupContent.style.transform = `translate(-50%, -50%) scale(${uniformScale})`;

    // ポップアップの拡縮に合わせて、中の文字の基本サイズも調整します
    // これにより、テキストだけが大きすぎたり小さすぎたりするのを防ぎます
    popupContent.style.fontSize = `${BASE_FONT_SIZE * uniformScale}px`;
}
// ページ読み込み時とウィンドウリサイズ時にレイアウト調整関数を実行
// 画面リサイズ時に適切な関数を呼び出す処理
function handleResize() {
    if (gameContainer.style.display === 'flex') {
        resizeGameLayout();
    }
    if (gameOverPopup.style.display === 'flex') {
        resizeGameOverPopup();
    }
}

// ページ読み込み時とウィンドウリサイズ時に上記の処理を実行
window.addEventListener('load', handleResize);
window.addEventListener('resize', handleResize);
// ▲▲▲ ここまで追加 ▲▲▲

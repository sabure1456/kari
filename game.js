/**
 * =================================================================
 * DOM要素の取得
 * =================================================================
 */
const DOM = {
    canvas: document.getElementById("gameCanvas"),
    nextCanvas: document.getElementById("nextCanvas"),
    titleScreen: document.getElementById("title-screen"),
    gameContainer: document.getElementById("game-container"),
    difficultySelectionScreen: document.getElementById('difficulty-selection-screen'),
    puyoSelectionScreen: document.getElementById('puyo-selection-screen'),
    puyoChoicesContainer: document.getElementById('puyo-choices-container'),
    confirmationPopup: document.getElementById('confirmation-popup'),
    gameOverPopup: document.getElementById('game-over-popup'),
    finalScoreText: document.getElementById('final-score-text'),
    scoreDisplay: document.getElementById("score-display"),
    scorePopupContainer: document.getElementById("score-popup-container"),
    imageDisplayArea: document.getElementById("image-display-area"),
    backToTitleBtn: document.getElementById('back-to-title-btn'),
    ingameBackToTitleBtn: document.getElementById('ingame-back-to-title-btn'),
    buttons: {
        modeRen: document.getElementById("mode-ren"),
        modeFriends: document.getElementById("mode-friends"),
        easy: document.getElementById('easy-btn'),
        normal: document.getElementById('normal-btn'),
        hard: document.getElementById('hard-btn'),
        resetSelection: document.getElementById('reset-selection-btn'),
        confirmYes: document.getElementById('confirm-yes-btn'),
        confirmNo: document.getElementById('confirm-no-btn'),
        gameOverRetry: document.getElementById('game-over-retry-btn'),
        gameOverTitle: document.getElementById('game-over-title-btn'),
        ingameReset: document.getElementById("reset"),
        left: document.getElementById("left"),
        right: document.getElementById("right"),
        down: document.getElementById("down"),
        rotate: document.getElementById("rotate"),
    }
};
const CTX = DOM.canvas.getContext("2d");
const NEXT_CTX = DOM.nextCanvas.getContext("2d");

/**
 * =================================================================
 * サウンド関連
 * =================================================================
 */
const SOUNDS = {
    titleBGM: new Audio('audio/title_bgm.mp3'),
    renModeBGM: new Audio('audio/mode_ren_bgm.mp3'),
    friendsModeBGM: new Audio('audio/mode_friends_bgm.mp3'),
    clear: new Audio('audio/puyo_clear.mp3'),
    gameOver: new Audio('audio/game_over.mp3'),
    click: new Audio('audio/click.mp3'),
    land: new Audio('audio/puyo_falled.mp3')
};

// 各サウンドの音量設定
SOUNDS.titleBGM.volume = 0.1;
SOUNDS.renModeBGM.volume = 0.03;
SOUNDS.friendsModeBGM.volume = 0.03;
SOUNDS.clear.volume = 0.2;
SOUNDS.gameOver.volume = 0.2;
SOUNDS.click.volume = 0.05;
SOUNDS.land.volume = 0.2;

// BGMはループ再生を有効化
SOUNDS.titleBGM.loop = true;
SOUNDS.renModeBGM.loop = true;
SOUNDS.friendsModeBGM.loop = true;


/**
 * =================================================================
 * 定数・設定
 * =================================================================
 */
const CONFIG = {
    COLS: 6,
    ROWS: 12,
    BLOCK_SIZE: 80,
    GAME_SPEEDS: { easy: 600, normal: 400, hard: 250 },
    REN_MODE: {
        IMG_PATH: 'images/puyo_ren/',
        PUYOS: [
            { id: 'puyo_a_1', src: 'puyo_ren1.png', name: 'レンちゃん１' },
            { id: 'puyo_a_2', src: 'puyo_ren2.png', name: 'レンちゃん２' },
            { id: 'puyo_a_3', src: 'puyo_ren3.png', name: 'レンちゃん３' },
            { id: 'puyo_a_4', src: 'puyo_ren4.png', name: 'レンちゃん４' },
            { id: 'puyo_a_5', src: 'puyo_ren5.png', name: 'レンちゃん５' },
        ],
        BACKGROUND_SRC: 'images/background/game_background_ren.png'
    },
    FRIENDS_MODE: {
        IMG_PATH: 'images/puyo_friends/',
        PUYOS: [
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
        ],
        BACKGROUND_SRC: 'images/background/game_background_friends.png'
    }
};

/**
 * =================================================================
 * グローバル状態変数
 * =================================================================
 */
let gameState = {
    currentPuyoPair: null,
    nextPuyoPair: null,
    gameGrid: [],
    score: 0,
    isGameOver: false,
    isProcessing: false, // 連鎖処理中など、プレイヤーの操作を一時的に無効化するためのフラグ
    selectedMode: '', // 'ren' or 'friends'
    gameSpeed: CONFIG.GAME_SPEEDS.normal,
    puyoTypesInUse: [], // 現在のゲームで使われるぷよのIDリスト
    puyoImageMap: {}, // IDと画像パスのマッピング
    loadedImages: {}, // 読み込み済みの画像オブジェクト
    selectedPuyosForFriendsMode: [], // 友達モードで選択されたぷよ
    isAudioUnlocked: false,
    gameLoopTimeoutId: null,
};
let currentGameBackgroundImage = new Image();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


/**
 * =================================================================
 * サウンド制御
 * =================================================================
 */

/**
 * ユーザーの初回アクション時に音声を有効化し、タイトルBGMを再生する
 */
function initializeAudio() {
    if (gameState.isAudioUnlocked) return;
    gameState.isAudioUnlocked = true;
    playSound(SOUNDS.titleBGM);

    document.removeEventListener('click', initializeAudio);
    document.removeEventListener('keydown', initializeAudio);
}

/**
 * 指定されたサウンドを再生する
 * @param {HTMLAudioElement} sound - 再生するAudioオブジェクト
 */
function playSound(sound) {
    // BGM以外は、音声が有効化されるまで再生しない
    if (!gameState.isAudioUnlocked && sound.loop) return;
    sound.currentTime = 0;
    sound.play().catch(e => {}); // ユーザー操作起因でない再生によるAbortErrorは無視
}

/**
 * すべてのBGM（ループする音声）を停止する
 */
function stopAllBGM() {
    Object.values(SOUNDS).forEach(sound => {
        if (sound.loop) {
            sound.pause();
        }
    });
}


/**
 * =================================================================
 * 画面遷移・UI表示
 * =================================================================
 */

/**
 * ゲームオーバーポップアップを表示する
 */
function showGameOverPopup() {
    stopAllBGM();
    playSound(SOUNDS.gameOver);
    DOM.finalScoreText.innerHTML = `食べた量は<span class="score-highlight">${gameState.score}g</span>でした！`;
    DOM.gameOverPopup.style.display = 'flex';
    resizeGameOverPopup();
}

/**
 * タイトル画面に戻る
 */
function goBackToTitle() {
    if (gameState.gameLoopTimeoutId) {
        clearTimeout(gameState.gameLoopTimeoutId);
    }
    gameState.isGameOver = true;
    stopAllBGM();
    playSound(SOUNDS.titleBGM);

    DOM.difficultySelectionScreen.style.display = 'none';
    DOM.puyoSelectionScreen.style.display = 'none';
    DOM.gameContainer.style.display = 'none';
    DOM.gameOverPopup.style.display = 'none';
    DOM.backToTitleBtn.style.display = 'none';
    DOM.titleScreen.style.display = 'flex';
}

/**
 * 友達モードのぷよ選択肢を画面に生成する
 */
function setupPuyoSelectionScreen() {
    DOM.puyoChoicesContainer.innerHTML = '';
    CONFIG.FRIENDS_MODE.PUYOS.forEach(puyo => {
        const item = document.createElement('div');
        item.className = 'puyo-choice-item';
        item.dataset.puyoId = puyo.id;
        item.dataset.puyoSrc = puyo.src;

        const img = new Image();
        img.src = CONFIG.FRIENDS_MODE.IMG_PATH + puyo.src;

        const nameEl = document.createElement('p');
        nameEl.className = 'puyo-name';
        nameEl.textContent = puyo.name;

        item.appendChild(img);
        item.appendChild(nameEl);
        DOM.puyoChoicesContainer.appendChild(item);
    });
}

/**
 * 友達モードのぷよ選択状態をリセットする
 */
function resetPuyoSelection() {
    gameState.selectedPuyosForFriendsMode = [];
    document.querySelectorAll('.puyo-choice-item').forEach(item => {
        item.classList.remove('selected');
    });
    DOM.confirmationPopup.style.display = 'none';
}


/**
 * =================================================================
 * ゲームの開始・初期化
 * =================================================================
 */

/**
 * ゲームを開始する
 */
function startGame() {
    stopAllBGM();
    
    // モードに応じたBGMと背景、ぷよの種類を設定
    if (gameState.selectedMode === 'ren') {
        playSound(SOUNDS.renModeBGM);
        currentGameBackgroundImage.src = CONFIG.REN_MODE.BACKGROUND_SRC;
        gameState.puyoTypesInUse = CONFIG.REN_MODE.PUYOS.map(p => p.id);
        gameState.puyoImageMap = CONFIG.REN_MODE.PUYOS.reduce((map, p) => {
            map[p.id] = CONFIG.REN_MODE.IMG_PATH + p.src;
            return map;
        }, {});
    } else { // friendsモード
        playSound(SOUNDS.friendsModeBGM);
        currentGameBackgroundImage.src = CONFIG.FRIENDS_MODE.BACKGROUND_SRC;
        gameState.puyoTypesInUse = [...gameState.selectedPuyosForFriendsMode];
        gameState.puyoImageMap = {};
        document.querySelectorAll('.puyo-choice-item.selected').forEach(item => {
            gameState.puyoImageMap[item.dataset.puyoId] = CONFIG.FRIENDS_MODE.IMG_PATH + item.dataset.puyoSrc;
        });
    }

    // 画面の表示切り替え
    DOM.titleScreen.style.display = "none";
    DOM.difficultySelectionScreen.style.display = 'none';
    DOM.puyoSelectionScreen.style.display = 'none';
    DOM.confirmationPopup.style.display = 'none';
    DOM.gameContainer.style.display = 'flex';
    DOM.backToTitleBtn.style.display = 'none';

    // 画像読み込み後にゲームをリスタート
    loadPuyoImages(() => {
        displayPuyoListInGame();
        restartGame();
    });
}

/**
 * ゲームで使用するぷよの画像を読み込む
 * @param {function} callback - 画像読み込み完了後に実行される関数
 */
function loadPuyoImages(callback) {
    let loadedCount = 0;
    gameState.loadedImages = {};
    const totalImages = Object.keys(gameState.puyoImageMap).length;

    if (totalImages === 0) {
        callback();
        return;
    }

    for (const puyoType in gameState.puyoImageMap) {
        const img = new Image();
        img.src = gameState.puyoImageMap[puyoType];
        img.onload = () => {
            gameState.loadedImages[puyoType] = img;
            loadedCount++;
            if (loadedCount === totalImages) callback();
        };
        img.onerror = () => {
            console.error(`Image failed to load: ${gameState.puyoImageMap[puyoType]}`);
            loadedCount++;
            if (loadedCount === totalImages) callback();
        }
    }
}

/**
 * ゲームの状態をリセットし、新しいゲームを開始する
 */
function restartGame() {
    resizeGameLayout();
    if (gameState.gameLoopTimeoutId) {
        clearTimeout(gameState.gameLoopTimeoutId);
    }

    gameState.score = 0;
    updateScoreDisplay();
    initializeGrid();
    gameState.nextPuyoPair = createNewPuyoPair();
    drawGame();
    drawNextPuyoPair();

    gameState.isGameOver = false;
    gameState.isProcessing = false;

    gameLoop();
}


/**
 * =================================================================
 * ゲームのコアロジック
 * =================================================================
 */

/**
 * ぷよの消去、落下、連鎖反応を処理する
 */
async function processChainReaction() {
    gameState.isProcessing = true;
    let chainCount = 0;

    while (true) {
        dropFloatingPuyos();
        drawGame();

        const clearedGroups = findAndClearPuyos();
        if (clearedGroups.length === 0) {
            break; // 消せるぷよがなくなったらループを抜ける
        }
        
        playSound(SOUNDS.clear);
        chainCount++;

        let scoreForThisChain = 0;
        for (const clearedCount of clearedGroups) {
            // 4個消しを基本に、5個目からボーナスを加算
            const baseScore = 100 + (Math.max(0, clearedCount - 4)) * 20;
            // 連鎖ボーナス
            const chainBonus = (chainCount > 1) ? chainCount * 100 : 0;
            scoreForThisChain += baseScore + chainBonus;
        }

        gameState.score += scoreForThisChain;
        updateScoreDisplay();
        showScorePopup(scoreForThisChain);
        
        drawGame();
        await sleep(300); // 次の落下処理の前に少し待つ
    }
    gameState.isProcessing = false;
}

/**
 * ゲームのメインループ
 */
async function gameLoop() {
    if (gameState.isGameOver) return;

    if (gameState.isProcessing) {
        gameState.gameLoopTimeoutId = setTimeout(gameLoop, 100);
        return;
    }

    if (!gameState.currentPuyoPair) {
        await processChainReaction(); // 新しいぷよを出す前に連鎖処理を完了させる
        gameState.currentPuyoPair = gameState.nextPuyoPair;
        gameState.nextPuyoPair = createNewPuyoPair();
        drawNextPuyoPair();

        if (checkGameOver()) {
            gameState.isGameOver = true;
            drawGame();
            showGameOverPopup();
            return;
        }
    } else {
        if (canPuyoPairMove(0, 1)) {
            gameState.currentPuyoPair.pivot.y++;
        } else {
            fixPuyoPairToGrid();
            await processChainReaction(); // ぷよを設置した後に連鎖処理を開始
        }
    }

    drawGame();

    if (!gameState.isGameOver) {
        gameState.gameLoopTimeoutId = setTimeout(gameLoop, gameState.gameSpeed);
    }
}

/**
 * 4つ以上つながったぷよのグループを探して消去する
 * @returns {number[]} 消去した各グループのぷよ数を格納した配列
 */
function findAndClearPuyos() {
    const groupsToClear = [];
    const visited = Array.from({ length: CONFIG.ROWS }, () => Array(CONFIG.COLS).fill(false));

    for (let y = 0; y < CONFIG.ROWS; y++) {
        for (let x = 0; x < CONFIG.COLS; x++) {
            if (gameState.gameGrid[y][x] && !visited[y][x]) {
                const puyoType = gameState.gameGrid[y][x];
                const group = findConnectedPuyos(x, y, puyoType, visited);
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
                gameState.gameGrid[gy][gx] = null;
            });
        });
        return clearedCounts;
    }
    return [];
}

/**
 * 特定の座標から同じ種類の隣接ぷよグループを探索する (Flood fillアルゴリズム)
 * @param {number} x - 開始X座標
 * @param {number} y - 開始Y座標
 * @param {string} puyoType - 探索するぷよの種類 (ID)
 * @param {boolean[][]} visited - 訪問済みかを記録する2次元配列
 * @returns {Array<[number, number]>} 発見したグループの座標リスト
 */
function findConnectedPuyos(x, y, puyoType, visited) {
    const queue = [[x, y]];
    const group = [];

    if (visited[y][x] || !gameState.gameGrid[y] || gameState.gameGrid[y][x] !== puyoType) return [];

    visited[y][x] = true;
    group.push([x, y]);
    let head = 0;
    while (head < queue.length) {
        const [cx, cy] = queue[head++];
        // 上下左右の4方向をチェック
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < CONFIG.COLS && ny >= 0 && ny < CONFIG.ROWS &&
                gameState.gameGrid[ny][nx] === puyoType && !visited[ny][nx]) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
                group.push([nx, ny]);
            }
        });
    }
    return group;
}

/**
 * 新しいぷよのペア（2個1組）を生成する
 * @returns {object} 新しいぷよペアオブジェクト
 */
function createNewPuyoPair() {
    const puyoTypes = gameState.puyoTypesInUse;
    const piece = {
        pivot: { x: Math.floor(CONFIG.COLS / 2) - 1, y: 0, puyoType: puyoTypes[Math.floor(Math.random() * puyoTypes.length)] },
        mobile: { dx: 1, dy: 0, puyoType: puyoTypes[Math.floor(Math.random() * puyoTypes.length)] },
    };
    // 稀に縦組で生成
    if (Math.random() < 0.2) {
        piece.mobile = { dx: 0, dy: 1, ...piece.mobile };
    }
    return piece;
}

/**
 * 操作中のぷよをグリッドに固定する
 */
function fixPuyoPairToGrid() {
    if (!gameState.currentPuyoPair) return;

    playSound(SOUNDS.land);
    const { pivot, mobile } = gameState.currentPuyoPair;

    // 軸ぷよをグリッドに配置
    if (pivot.y >= 0 && pivot.y < CONFIG.ROWS) {
        gameState.gameGrid[pivot.y][pivot.x] = pivot.puyoType;
    }
    // 相方ぷよをグリッドに配置
    const mobileY = pivot.y + mobile.dy;
    const mobileX = pivot.x + mobile.dx;
    if (mobileY >= 0 && mobileY < CONFIG.ROWS) {
        gameState.gameGrid[mobileY][mobileX] = mobile.puyoType;
    }

    gameState.currentPuyoPair = null; // 操作中のぷよをなくす
}

/**
 * グリッドを空の状態で初期化する
 */
function initializeGrid() {
    gameState.gameGrid = Array.from({ length: CONFIG.ROWS }, () => Array(CONFIG.COLS).fill(null));
    gameState.isGameOver = false;
    gameState.currentPuyoPair = null;
}

/**
 * 宙に浮いているぷよをすべて下に落とす
 */
function dropFloatingPuyos() {
    for (let x = 0; x < CONFIG.COLS; x++) {
        for (let y = CONFIG.ROWS - 2; y >= 0; y--) {
            // 現在のマスにぷよがあり、その真下が空の場合
            if (gameState.gameGrid[y][x] && !gameState.gameGrid[y + 1][x]) {
                let dropY = y;
                // どこまで落ちるか計算
                while (dropY + 1 < CONFIG.ROWS && !gameState.gameGrid[dropY + 1][x]) {
                    // 1マスずつ落とす
                    gameState.gameGrid[dropY + 1][x] = gameState.gameGrid[dropY][x];
                    gameState.gameGrid[dropY][x] = null;
                    dropY++;
                }
            }
        }
    }
}

/**
 * =================================================================
 * 描画関連
 * =================================================================
 */

/**
 * ゲーム画面全体（背景、グリッド、操作中ぷよ）を描画する
 */
function drawGame() {
    CTX.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
    if (currentGameBackgroundImage.complete && currentGameBackgroundImage.naturalHeight !== 0) {
        CTX.drawImage(currentGameBackgroundImage, 0, 0, DOM.canvas.width, DOM.canvas.height);
    }
    // グリッド上のぷよを描画
    for (let y = 0; y < CONFIG.ROWS; y++) {
        for (let x = 0; x < CONFIG.COLS; x++) {
            if (gameState.gameGrid[y][x]) {
                drawPuyo(CTX, x, y, gameState.gameGrid[y][x]);
            }
        }
    }
    // 操作中のぷよを描画
    if (gameState.currentPuyoPair) {
        drawCurrentPuyoPair();
    }
}

/**
 * NEXT表示を描画する
 */
function drawNextPuyoPair() {
    if (!gameState.nextPuyoPair) return;
    NEXT_CTX.clearRect(0, 0, DOM.nextCanvas.width, DOM.nextCanvas.height);

    const { pivot, mobile } = gameState.nextPuyoPair;
    
    // nextCanvas専用のブロックサイズを動的に計算
    const nextBlockSize = DOM.nextCanvas.width / 2.5;

    // ぷよの描画位置を計算
    const pivotX = (DOM.nextCanvas.width - (Math.abs(mobile.dx) + 1) * nextBlockSize) / 2;
    const pivotY = (DOM.nextCanvas.height - (Math.abs(mobile.dy) + 1) * nextBlockSize) / 2;
    const mobileX = pivotX + mobile.dx * nextBlockSize;
    const mobileY = pivotY + mobile.dy * nextBlockSize;

    // ぷよを描画
    const pivotImg = gameState.loadedImages[pivot.puyoType];
    if (pivotImg) {
        NEXT_CTX.drawImage(pivotImg, pivotX, pivotY, nextBlockSize, nextBlockSize);
    }
    
    const mobileImg = gameState.loadedImages[mobile.puyoType];
    if (mobileImg) {
        NEXT_CTX.drawImage(mobileImg, mobileX, mobileY, nextBlockSize, nextBlockSize);
    }
}

/**
 * 操作中のぷよペアを描画する
 */
function drawCurrentPuyoPair() {
    if (!gameState.currentPuyoPair) return;
    const { pivot, mobile } = gameState.currentPuyoPair;
    drawPuyo(CTX, pivot.x, pivot.y, pivot.puyoType);
    drawPuyo(CTX, pivot.x + mobile.dx, pivot.y + mobile.dy, mobile.puyoType);
}

/**
 * 1つのぷよを描画する
 * @param {CanvasRenderingContext2D} targetCtx - 描画対象のコンテキスト
 * @param {number} x - グリッドX座標
 * @param {number} y - グリッドY座標
 * @param {string} puyoType - 描画するぷよの種類 (ID)
 */
function drawPuyo(targetCtx, x, y, puyoType) {
    if (y < 0) return; // 画面外は描画しない
    const img = gameState.loadedImages[puyoType];
    const size = CONFIG.BLOCK_SIZE;
    if (img) {
        targetCtx.drawImage(img, x * size, y * size, size, size);
    } else { // 画像読み込み失敗時のフォールバック
        targetCtx.fillStyle = 'grey';
        targetCtx.fillRect(x * size, y * size, size, size);
    }
}

/**
 * ゲーム画面左側に使用中のぷよ画像一覧を表示する
 */
function displayPuyoListInGame() {
    DOM.imageDisplayArea.innerHTML = '';
    const allPuyoData = [...CONFIG.REN_MODE.PUYOS, ...CONFIG.FRIENDS_MODE.PUYOS];

    gameState.puyoTypesInUse.forEach(puyoId => {
        const puyoData = allPuyoData.find(p => p.id === puyoId);
        if (!puyoData || !gameState.loadedImages[puyoId]) return;

        const itemContainer = document.createElement('div');
        itemContainer.className = 'image-list-item';

        const img = gameState.loadedImages[puyoId].cloneNode();
        const nameSpan = document.createElement('span');
        nameSpan.className = 'image-list-name';
        nameSpan.textContent = puyoData.name;

        itemContainer.appendChild(img);
        itemContainer.appendChild(nameSpan);
        DOM.imageDisplayArea.appendChild(itemContainer);
    });
}

/**
 * スコア表示を更新する
 */
function updateScoreDisplay() {
    DOM.scoreDisplay.textContent = gameState.score + "g";
}

/**
 * スコア加算時にアニメーションポップアップを表示する
 * @param {number} amount - 加算されたスコア量
 */
function showScorePopup(amount) {
    const popup = document.createElement("p");
    popup.textContent = `+${amount}`;
    popup.className = "score-popup";
    DOM.scorePopupContainer.appendChild(popup);
    setTimeout(() => { popup.remove(); }, 1500);
}


/**
 * =================================================================
 * プレイヤー操作・判定
 * =================================================================
 */

/**
 * 指定された座標が移動可能か（グリッド範囲内で、他のぷよがないか）を判定する
 * @param {number} x - X座標
 * @param {number} y - Y座標
 * @returns {boolean} 移動可能ならtrue
 */
function isPositionValid(x, y) {
    return x >= 0 && x < CONFIG.COLS && y < CONFIG.ROWS && (y < 0 || gameState.gameGrid[y][x] === null);
}

/**
 * 操作中のぷよペアが指定方向に移動可能か判定する
 * @param {number} dx - X方向の移動量
 * @param {number} dy - Y方向の移動量
 * @returns {boolean} 移動可能ならtrue
 */
function canPuyoPairMove(dx, dy) {
    if (!gameState.currentPuyoPair) return false;
    const { pivot, mobile } = gameState.currentPuyoPair;
    return isPositionValid(pivot.x + dx, pivot.y + dy) &&
           isPositionValid(pivot.x + mobile.dx + dx, pivot.y + mobile.dy + dy);
}

/**
 * 操作中のぷよを回転させる
 */
function rotatePuyoPair() {
    if (!gameState.currentPuyoPair || gameState.isProcessing) return;
    const { pivot, mobile } = gameState.currentPuyoPair;
    const { dx, dy } = mobile;

    // 90度回転の行列計算 (x' = -y, y' = x)
    const next_dx = -dy;
    const next_dy = dx;

    // 回転後の座標が有効かチェック
    if (isPositionValid(pivot.x + next_dx, pivot.y + next_dy)) {
        mobile.dx = next_dx;
        mobile.dy = next_dy;
    }
    drawGame();
}

/**
 * ゲームオーバー条件を満たしているか判定する
 * @returns {boolean} ゲームオーバーならtrue
 */
function checkGameOver() {
    // ぷよの出現位置が埋まっているかチェック
    return gameState.gameGrid[0][Math.floor(CONFIG.COLS / 2) - 1] || gameState.gameGrid[0][Math.floor(CONFIG.COLS / 2)];
}


/**
 * =================================================================
 * イベントハンドラ
 * =================================================================
 */

/**
 * 難易度選択ボタンがクリックされた時の処理
 * @param {string} difficulty - 'easy', 'normal', 'hard'
 */
function handleDifficultySelect(difficulty) {
    gameState.gameSpeed = CONFIG.GAME_SPEEDS[difficulty];
    DOM.difficultySelectionScreen.style.display = 'none';

    if (gameState.selectedMode === 'ren') {
        startGame();
    } else if (gameState.selectedMode === 'friends') {
        setupPuyoSelectionScreen();
        resetPuyoSelection();
        DOM.puyoSelectionScreen.style.display = 'flex';
    }
}

/**
 * 友達モードでぷよ選択がクリックされた時の処理
 * @param {MouseEvent} e - クリックイベント
 */
function handlePuyoChoiceClick(e) {
    const targetItem = e.target.closest('.puyo-choice-item');
    if (!targetItem) return;

    const puyoId = targetItem.dataset.puyoId;
    const isSelected = targetItem.classList.contains('selected');

    if (isSelected) {
        targetItem.classList.remove('selected');
        gameState.selectedPuyosForFriendsMode = gameState.selectedPuyosForFriendsMode.filter(id => id !== puyoId);
    } else {
        if (gameState.selectedPuyosForFriendsMode.length < 5) {
            targetItem.classList.add('selected');
            gameState.selectedPuyosForFriendsMode.push(puyoId);
        }
    }
    // 5個選択されたら確認ポップアップを表示
    if (gameState.selectedPuyosForFriendsMode.length === 5) {
        DOM.confirmationPopup.style.display = 'flex';
    } else {
        DOM.confirmationPopup.style.display = 'none';
    }
}

/**
 * キーボード入力のイベント処理
 * @param {KeyboardEvent} e - キーボードイベント
 */
function handleKeyDown(e) {
    if (gameState.isGameOver || gameState.isProcessing || !gameState.currentPuyoPair) return;

    let moved = false;
    switch (e.key) {
        case "ArrowLeft":
            if (canPuyoPairMove(-1, 0)) {
                gameState.currentPuyoPair.pivot.x--;
                moved = true;
            }
            break;
        case "ArrowRight":
            if (canPuyoPairMove(1, 0)) {
                gameState.currentPuyoPair.pivot.x++;
                moved = true;
            }
            break;
        case "ArrowDown":
            if (canPuyoPairMove(0, 1)) {
                gameState.currentPuyoPair.pivot.y++;
                moved = true;
            }
            break;
        case "ArrowUp":
            rotatePuyoPair();
            // 回転はそれ自体が描画を伴うので moved フラグは不要
            break;
        case "r":
        case "R":
            // ゲーム中リスタートのショートカット
            restartGame();
            break;
    }
    if (moved) {
        drawGame();
    }
}

/**
 * ウィンドウリサイズ時のレイアウト調整
 */
function handleResize() {
    if (DOM.gameContainer.style.display === 'flex') {
        resizeGameLayout();
    }
    if (DOM.gameOverPopup.style.display === 'flex') {
        resizeGameOverPopup();
    }
}


/**
 * =================================================================
 * レイアウト・リサイズ処理
 * =================================================================
 */

/**
 * ゲームコンテナのサイズをウィンドウに合わせて調整する
 */
function resizeGameLayout() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const baseWidth = 700;
    const baseHeight = 800;

    const scale = Math.min(windowHeight / baseHeight, windowWidth / baseWidth);

    DOM.gameContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

/**
 * ゲームオーバーポップアップのサイズをウィンドウに合わせて調整する
 */
function resizeGameOverPopup() {
    const popupContent = DOM.gameOverPopup.querySelector('.popup-content');
    if (!popupContent) return;

    const BASE_WIDTH = 520;
    const BASE_HEIGHT = 480;
    const BASE_FONT_SIZE = 6;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 上下左右に20pxずつの余白を考慮
    const scaleX = (viewportWidth - 40) / BASE_WIDTH;
    const scaleY = (viewportHeight - 40) / BASE_HEIGHT;
    const uniformScale = Math.min(scaleX, scaleY);

    popupContent.style.transform = `translate(-50%, -50%) scale(${uniformScale})`;
    popupContent.style.fontSize = `${BASE_FONT_SIZE * uniformScale}px`;
}


/**
 * =================================================================
 * イベントリスナーの設定
 * =================================================================
 */
function initializeEventListeners() {
    // モード選択
    DOM.buttons.modeRen.addEventListener("click", () => {
        gameState.selectedMode = 'ren';
        DOM.titleScreen.style.display = 'none';
        DOM.difficultySelectionScreen.style.display = 'flex';
        DOM.backToTitleBtn.style.display = 'inline-block';
    });
    DOM.buttons.modeFriends.addEventListener("click", () => {
        gameState.selectedMode = 'friends';
        DOM.titleScreen.style.display = 'none';
        DOM.difficultySelectionScreen.style.display = 'flex';
        DOM.backToTitleBtn.style.display = 'inline-block';
    });

    // 難易度選択
    DOM.buttons.easy.addEventListener('click', () => handleDifficultySelect('easy'));
    DOM.buttons.normal.addEventListener('click', () => handleDifficultySelect('normal'));
    DOM.buttons.hard.addEventListener('click', () => handleDifficultySelect('hard'));

    // 友達モード: ぷよ選択
    DOM.puyoChoicesContainer.addEventListener('click', handlePuyoChoiceClick);
    DOM.buttons.resetSelection.addEventListener('click', resetPuyoSelection);
    DOM.buttons.confirmYes.addEventListener('click', startGame);
    DOM.buttons.confirmNo.addEventListener('click', () => {
        DOM.confirmationPopup.style.display = 'none';
    });

    // タイトルに戻るボタン
    DOM.backToTitleBtn.addEventListener('click', goBackToTitle);
    DOM.ingameBackToTitleBtn.addEventListener('click', goBackToTitle);
    DOM.buttons.gameOverTitle.addEventListener('click', goBackToTitle);

    // おかわり（リトライ）ボタン
    DOM.buttons.gameOverRetry.addEventListener('click', () => {
        DOM.gameOverPopup.style.display = 'none';
        stopAllBGM();
        if (gameState.selectedMode === 'ren') {
            playSound(SOUNDS.renModeBGM);
        } else if (gameState.selectedMode === 'friends') {
            playSound(SOUNDS.friendsModeBGM);
        }
        restartGame();
    });
    DOM.buttons.ingameReset.addEventListener("click", restartGame);

    // ゲーム操作ボタン
    DOM.buttons.left.addEventListener("click", () => { if (!gameState.isProcessing && gameState.currentPuyoPair && canPuyoPairMove(-1, 0)) { gameState.currentPuyoPair.pivot.x--; drawGame(); } });
    DOM.buttons.right.addEventListener("click", () => { if (!gameState.isProcessing && gameState.currentPuyoPair && canPuyoPairMove(1, 0)) { gameState.currentPuyoPair.pivot.x++; drawGame(); } });
    DOM.buttons.down.addEventListener("click", () => { if (!gameState.isProcessing && gameState.currentPuyoPair && canPuyoPairMove(0, 1)) { gameState.currentPuyoPair.pivot.y++; drawGame(); } });
    DOM.buttons.rotate.addEventListener("click", rotatePuyoPair);
    
    // キーボード操作
    document.addEventListener("keydown", handleKeyDown);

    // ウィンドウリサイズ
    window.addEventListener('load', handleResize);
    window.addEventListener('resize', handleResize);

    // サウンド有効化
    document.addEventListener('click', initializeAudio);
    document.addEventListener('keydown', initializeAudio);

    // 全てのボタンにクリック音を設定
    document.querySelectorAll('.btn-effect').forEach(button => {
        button.addEventListener('click', () => playSound(SOUNDS.click));
    });
}

/**
 * =================================================================
 * 初期化処理
 * =================================================================
 */
initializeEventListeners();

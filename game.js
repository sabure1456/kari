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
const SOUND_PATHS = {
    titleBGM: 'audio/title_bgm.mp3',
    renModeBGM: 'audio/mode_ren_bgm.mp3',
    friendsModeBGM: 'audio/mode_friends_bgm.mp3',
    clear: 'audio/puyo_clear.mp3',
    gameOver: 'audio/game_over.mp3',
    click: 'audio/click.mp3',
    land: 'audio/puyo_falled.mp3'
};
// 読み込んだAudioオブジェクトを保存（キャッシュ）する場所
const soundsCache = {};

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
            { id: 'puyo_a_1', src: 'puyo_ren1.webp', name: 'レンちゃん１' },
            { id: 'puyo_a_2', src: 'puyo_ren2.webp', name: 'レンちゃん２' },
            { id: 'puyo_a_3', src: 'puyo_ren3.webp', name: 'レンちゃん３' },
            { id: 'puyo_a_4', src: 'puyo_ren4.webp', name: 'レンちゃん４' },
            { id: 'puyo_a_5', src: 'puyo_ren5.webp', name: 'レンちゃん５' },
        ],
        BACKGROUND_SRC: 'images/background/game_background_ren.webp'
    },
    FRIENDS_MODE: {
        IMG_PATH: 'images/puyo_friends/',
        PUYOS: [
            { id: 'puyo_b_01', src: 'puyo_friends_an.webp' , name:'アンちゃん'}, 
            { id: 'puyo_b_02', src: 'puyo_friends_gen.webp', name:'ゲンちゃん'},
            { id: 'puyo_b_03', src: 'puyo_friends_mon.webp', name:'もんちゃん'},
            { id: 'puyo_b_04', src: 'puyo_friends_katura.webp', name:'カツラレン'},
            { id: 'puyo_b_05', src: 'puyo_friends_baby.webp', name:'ベビーレン'},
            { id: 'puyo_b_06', src: 'puyo_friends_shougakusei.webp', name:'小学生レン'}, 
            { id: 'puyo_b_07', src: 'puyo_friends_harumi.webp', name:'はるみさん'},
            { id: 'puyo_b_08', src: 'puyo_friends_mother.webp', name:'母ちゃん'}, 
            { id: 'puyo_b_09', src: 'puyo_friends_niityan.webp', name:'兄ちゃん'},
            { id: 'puyo_b_10', src: 'puyo_friends_Ssensei.webp', name:'S先生　'},
        ],
        BACKGROUND_SRC: 'images/background/game_background_friends.webp'
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
    isProcessing: false,
    selectedMode: '',
    gameSpeed: CONFIG.GAME_SPEEDS.normal,
    puyoTypesInUse: [],
    puyoImageMap: {},
    loadedImages: {},
    selectedPuyosForFriendsMode: [],
    isAudioUnlocked: false,
    gameLoopTimeoutId: null,
};
let currentGameBackgroundImage = new Image();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


/**
 * =================================================================
 * サウンド制御 (最適化版)
 * =================================================================
 */

/**
 * ユーザーの初回アクション時に音声を有効化し、タイトルBGMを再生する
 */
function initializeAudio() {
    if (gameState.isAudioUnlocked) return;
    gameState.isAudioUnlocked = true;
    playSound('titleBGM', true);

    document.removeEventListener('click', initializeAudio);
    document.removeEventListener('keydown', initializeAudio);
}

/**
 * 指定されたサウンドを再生する（キャッシュ対応版）
 * @param {string} soundName - 再生したい音声の名前 (例: 'click')
 * @param {boolean} isBGM - BGMの場合はループや音量設定を適用
 */
function playSound(soundName, isBGM = false) {
    if (!gameState.isAudioUnlocked && isBGM) return;

    if (!soundsCache[soundName]) {
        soundsCache[soundName] = new Audio(SOUND_PATHS[soundName]);
        // 音量設定
        if (soundName === 'titleBGM') soundsCache[soundName].volume = 0.1;
        if (soundName === 'renModeBGM' || soundName === 'friendsModeBGM') soundsCache[soundName].volume = 0.03;
        if (soundName === 'clear' || soundName === 'gameOver' || soundName === 'land') soundsCache[soundName].volume = 0.2;
        if (soundName === 'click') soundsCache[soundName].volume = 0.05;
        // BGMならループさせる
        if (isBGM) {
            soundsCache[soundName].loop = true;
        }
    }
    
    const sound = soundsCache[soundName];
    sound.currentTime = 0;
    sound.play().catch(e => {});
}

/**
 * すべてのBGM（ループする音声）を停止する
 */
function stopAllBGM() {
    Object.keys(soundsCache).forEach(soundName => {
        const sound = soundsCache[soundName];
        if (sound && sound.loop) {
            sound.pause();
        }
    });
}


/**
 * =================================================================
 * 画面遷移・UI表示
 * =================================================================
 */
function showGameOverPopup() {
    stopAllBGM();
    playSound('gameOver');
    DOM.finalScoreText.innerHTML = `食べた量は<span class="score-highlight">${gameState.score}g</span>でした！`;
    DOM.gameOverPopup.style.display = 'flex';
    resizeGameOverPopup();
}

function goBackToTitle() {
    if (gameState.gameLoopTimeoutId) {
        clearTimeout(gameState.gameLoopTimeoutId);
    }
    gameState.isGameOver = true;
    stopAllBGM();
    playSound('titleBGM', true);

    DOM.difficultySelectionScreen.style.display = 'none';
    DOM.puyoSelectionScreen.style.display = 'none';
    DOM.gameContainer.style.display = 'none';
    DOM.gameOverPopup.style.display = 'none';
    DOM.backToTitleBtn.style.display = 'none';
    DOM.titleScreen.style.display = 'flex';
}

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
function startGame() {
    stopAllBGM();
    
    if (gameState.selectedMode === 'ren') {
        playSound('renModeBGM', true);
        currentGameBackgroundImage.src = CONFIG.REN_MODE.BACKGROUND_SRC;
        gameState.puyoTypesInUse = CONFIG.REN_MODE.PUYOS.map(p => p.id);
        gameState.puyoImageMap = CONFIG.REN_MODE.PUYOS.reduce((map, p) => {
            map[p.id] = CONFIG.REN_MODE.IMG_PATH + p.src;
            return map;
        }, {});
    } else {
        playSound('friendsModeBGM', true);
        currentGameBackgroundImage.src = CONFIG.FRIENDS_MODE.BACKGROUND_SRC;
        gameState.puyoTypesInUse = [...gameState.selectedPuyosForFriendsMode];
        gameState.puyoImageMap = {};
        document.querySelectorAll('.puyo-choice-item.selected').forEach(item => {
            gameState.puyoImageMap[item.dataset.puyoId] = CONFIG.FRIENDS_MODE.IMG_PATH + item.dataset.puyoSrc;
        });
    }

    DOM.titleScreen.style.display = "none";
    DOM.difficultySelectionScreen.style.display = 'none';
    DOM.puyoSelectionScreen.style.display = 'none';
    DOM.confirmationPopup.style.display = 'none';
    DOM.gameContainer.style.display = 'flex';
    DOM.backToTitleBtn.style.display = 'none';

    loadPuyoImages(() => {
        displayPuyoListInGame();
        restartGame();
    });
}

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
async function processChainReaction() {
    gameState.isProcessing = true;
    let chainCount = 0;

    while (true) {
        dropFloatingPuyos();
        drawGame();

        const clearedGroups = findAndClearPuyos();
        if (clearedGroups.length === 0) {
            break;
        }
        
        playSound('clear');
        chainCount++;

        let scoreForThisChain = 0;
        for (const clearedCount of clearedGroups) {
            const baseScore = 100 + (Math.max(0, clearedCount - 4)) * 20;
            const chainBonus = (chainCount > 1) ? chainCount * 100 : 0;
            scoreForThisChain += baseScore + chainBonus;
        }

        gameState.score += scoreForThisChain;
        if (gameState.score > 9999999) {
            gameState.score = 9999999;
        }
        
        updateScoreDisplay();
        showScorePopup(scoreForThisChain);
        
        drawGame();
        await sleep(300);
    }
    gameState.isProcessing = false;
}

async function gameLoop() {
    if (gameState.isGameOver) return;

    if (gameState.isProcessing) {
        gameState.gameLoopTimeoutId = setTimeout(gameLoop, 100);
        return;
    }

    if (!gameState.currentPuyoPair) {
        await processChainReaction();
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
            await processChainReaction();
        }
    }

    drawGame();

    if (!gameState.isGameOver) {
        gameState.gameLoopTimeoutId = setTimeout(gameLoop, gameState.gameSpeed);
    }
}

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

function findConnectedPuyos(x, y, puyoType, visited) {
    const queue = [[x, y]];
    const group = [];

    if (visited[y][x] || !gameState.gameGrid[y] || gameState.gameGrid[y][x] !== puyoType) return [];

    visited[y][x] = true;
    group.push([x, y]);
    let head = 0;
    while (head < queue.length) {
        const [cx, cy] = queue[head++];
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

function createNewPuyoPair() {
    const puyoTypes = gameState.puyoTypesInUse;
    const piece = {
        pivot: { x: Math.floor(CONFIG.COLS / 2) - 1, y: 0, puyoType: puyoTypes[Math.floor(Math.random() * puyoTypes.length)] },
        mobile: { dx: 1, dy: 0, puyoType: puyoTypes[Math.floor(Math.random() * puyoTypes.length)] },
    };
    if (Math.random() < 0.2) {
        piece.mobile = { dx: 0, dy: 1, ...piece.mobile };
    }
    return piece;
}

function fixPuyoPairToGrid() {
    if (!gameState.currentPuyoPair) return;

    playSound('land');
    const { pivot, mobile } = gameState.currentPuyoPair;

    if (pivot.y >= 0 && pivot.y < CONFIG.ROWS) {
        gameState.gameGrid[pivot.y][pivot.x] = pivot.puyoType;
    }
    const mobileY = pivot.y + mobile.dy;
    const mobileX = pivot.x + mobile.dx;
    if (mobileY >= 0 && mobileY < CONFIG.ROWS) {
        gameState.gameGrid[mobileY][mobileX] = mobile.puyoType;
    }

    gameState.currentPuyoPair = null;
}

function initializeGrid() {
    gameState.gameGrid = Array.from({ length: CONFIG.ROWS }, () => Array(CONFIG.COLS).fill(null));
    gameState.isGameOver = false;
    gameState.currentPuyoPair = null;
}

function dropFloatingPuyos() {
    for (let x = 0; x < CONFIG.COLS; x++) {
        for (let y = CONFIG.ROWS - 2; y >= 0; y--) {
            if (gameState.gameGrid[y][x] && !gameState.gameGrid[y + 1][x]) {
                let dropY = y;
                while (dropY + 1 < CONFIG.ROWS && !gameState.gameGrid[dropY + 1][x]) {
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

function drawGame() {
    CTX.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
    if (currentGameBackgroundImage.complete && currentGameBackgroundImage.naturalHeight !== 0) {
        CTX.drawImage(currentGameBackgroundImage, 0, 0, DOM.canvas.width, DOM.canvas.height);
    }
    for (let y = 0; y < CONFIG.ROWS; y++) {
        for (let x = 0; x < CONFIG.COLS; x++) {
            if (gameState.gameGrid[y][x]) {
                drawPuyo(CTX, x, y, gameState.gameGrid[y][x]);
            }
        }
    }
    if (gameState.currentPuyoPair) {
        drawCurrentPuyoPair();
    }
}

function drawNextPuyoPair() {
    if (!gameState.nextPuyoPair) return;
    NEXT_CTX.clearRect(0, 0, DOM.nextCanvas.width, DOM.nextCanvas.height);

    const { pivot, mobile } = gameState.nextPuyoPair;
    
    const nextBlockSize = DOM.nextCanvas.width / 2.5;

    const pivotX = (DOM.nextCanvas.width - (Math.abs(mobile.dx) + 1) * nextBlockSize) / 2;
    const pivotY = (DOM.nextCanvas.height - (Math.abs(mobile.dy) + 1) * nextBlockSize) / 2;
    const mobileX = pivotX + mobile.dx * nextBlockSize;
    const mobileY = pivotY + mobile.dy * nextBlockSize;

    const pivotImg = gameState.loadedImages[pivot.puyoType];
    if (pivotImg) {
        NEXT_CTX.drawImage(pivotImg, pivotX, pivotY, nextBlockSize, nextBlockSize);
    }
    
    const mobileImg = gameState.loadedImages[mobile.puyoType];
    if (mobileImg) {
        NEXT_CTX.drawImage(mobileImg, mobileX, mobileY, nextBlockSize, nextBlockSize);
    }
}

function drawCurrentPuyoPair() {
    if (!gameState.currentPuyoPair) return;
    const { pivot, mobile } = gameState.currentPuyoPair;
    drawPuyo(CTX, pivot.x, pivot.y, pivot.puyoType);
    drawPuyo(CTX, pivot.x + mobile.dx, pivot.y + mobile.dy, mobile.puyoType);
}

function drawPuyo(targetCtx, x, y, puyoType) {
    if (y < 0) return;
    const img = gameState.loadedImages[puyoType];
    const size = CONFIG.BLOCK_SIZE;
    if (img) {
        targetCtx.drawImage(img, x * size, y * size, size, size);
    } else {
        targetCtx.fillStyle = 'grey';
        targetCtx.fillRect(x * size, y * size, size, size);
    }
}

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

function updateScoreDisplay() {
    DOM.scoreDisplay.textContent = gameState.score + "g";
}

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
function isPositionValid(x, y) {
    return x >= 0 && x < CONFIG.COLS && y < CONFIG.ROWS && (y < 0 || gameState.gameGrid[y][x] === null);
}

function canPuyoPairMove(dx, dy) {
    if (!gameState.currentPuyoPair) return false;
    const { pivot, mobile } = gameState.currentPuyoPair;
    return isPositionValid(pivot.x + dx, pivot.y + dy) &&
           isPositionValid(pivot.x + mobile.dx + dx, pivot.y + mobile.dy + dy);
}

function rotatePuyoPair() {
    if (!gameState.currentPuyoPair || gameState.isProcessing) return;
    const { pivot, mobile } = gameState.currentPuyoPair;
    const { dx, dy } = mobile;

    const next_dx = -dy;
    const next_dy = dx;

    if (isPositionValid(pivot.x + next_dx, pivot.y + next_dy)) {
        mobile.dx = next_dx;
        mobile.dy = next_dy;
    }
    drawGame();
}

function checkGameOver() {
    return gameState.gameGrid[0][Math.floor(CONFIG.COLS / 2) - 1] || gameState.gameGrid[0][Math.floor(CONFIG.COLS / 2)];
}


/**
 * =================================================================
 * イベントハンドラ
 * =================================================================
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
    if (gameState.selectedPuyosForFriendsMode.length === 5) {
        DOM.confirmationPopup.style.display = 'flex';
    } else {
        DOM.confirmationPopup.style.display = 'none';
    }
}

function handleKeyDown(e) {
    if (gameState.isGameOver || gameState.isProcessing || !gameState.currentPuyoPair) return;

    let moved = false;
    switch (e.key) {
        case "ArrowLeft":
            if (canPuyoPairMove(-1, 0)) { gameState.currentPuyoPair.pivot.x--; moved = true; }
            break;
        case "ArrowRight":
            if (canPuyoPairMove(1, 0)) { gameState.currentPuyoPair.pivot.x++; moved = true; }
            break;
        case "ArrowDown":
            if (canPuyoPairMove(0, 1)) { gameState.currentPuyoPair.pivot.y++; moved = true; }
            break;
        case "ArrowUp":
            rotatePuyoPair();
            break;
        case "r": case "R":
            restartGame();
            break;
    }
    if (moved) {
        drawGame();
    }
}

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
function resizeGameLayout() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const baseWidth = 700;
    const baseHeight = 800;

    const scale = Math.min(windowHeight / baseHeight, windowWidth / baseWidth);

    DOM.gameContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function resizeGameOverPopup() {
    const popupContent = DOM.gameOverPopup.querySelector('.popup-content');
    if (!popupContent) return;

    const BASE_WIDTH = 520;
    const BASE_HEIGHT = 480;
    const BASE_FONT_SIZE = 6;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

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

    DOM.buttons.easy.addEventListener('click', () => handleDifficultySelect('easy'));
    DOM.buttons.normal.addEventListener('click', () => handleDifficultySelect('normal'));
    DOM.buttons.hard.addEventListener('click', () => handleDifficultySelect('hard'));

    DOM.puyoChoicesContainer.addEventListener('click', handlePuyoChoiceClick);
    DOM.buttons.resetSelection.addEventListener('click', resetPuyoSelection);
    DOM.buttons.confirmYes.addEventListener('click', startGame);
    DOM.buttons.confirmNo.addEventListener('click', () => {
        DOM.confirmationPopup.style.display = 'none';
    });

    DOM.backToTitleBtn.addEventListener('click', goBackToTitle);
    DOM.ingameBackToTitleBtn.addEventListener('click', goBackToTitle);
    DOM.buttons.gameOverTitle.addEventListener('click', goBackToTitle);

    DOM.buttons.gameOverRetry.addEventListener('click', () => {
        DOM.gameOverPopup.style.display = 'none';
        stopAllBGM();
        if (gameState.selectedMode === 'ren') {
            playSound('renModeBGM', true);
        } else if (gameState.selectedMode === 'friends') {
            playSound('friendsModeBGM', true);
        }
        restartGame();
    });
    DOM.buttons.ingameReset.addEventListener("click", restartGame);

    DOM.buttons.left.addEventListener("click", () => { if (!gameState.isProcessing && gameState.currentPuyoPair && canPuyoPairMove(-1, 0)) { gameState.currentPuyoPair.pivot.x--; drawGame(); } });
    DOM.buttons.right.addEventListener("click", () => { if (!gameState.isProcessing && gameState.currentPuyoPair && canPuyoPairMove(1, 0)) { gameState.currentPuyoPair.pivot.x++; drawGame(); } });
    DOM.buttons.down.addEventListener("click", () => { if (!gameState.isProcessing && gameState.currentPuyoPair && canPuyoPairMove(0, 1)) { gameState.currentPuyoPair.pivot.y++; drawGame(); } });
    DOM.buttons.rotate.addEventListener("click", rotatePuyoPair);
    
    document.addEventListener("keydown", handleKeyDown);

    window.addEventListener('load', handleResize);
    window.addEventListener('resize', handleResize);

    document.addEventListener('click', initializeAudio);
    document.addEventListener('keydown', initializeAudio);

    document.querySelectorAll('.btn-effect').forEach(button => {
        button.addEventListener('click', () => playSound('click'));
    });
}

/**
 * =================================================================
 * 初期化処理
 * =================================================================
 */
initializeEventListeners();

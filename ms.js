let canvas, ctx;
let faceBtn, mineCounterDisplay, timerDisplay, restartBtn;
let imgNormal, imgClicked, imgSpike;

const sndClick = new Audio("Click.wav");
const sndExplode = new Audio("Explode.wav");
const sndFlag = new Audio("Flag.wav");
const sndLose = new Audio("Lose.wav");
const sndWin = new Audio("Win.wav");

const ROWS = 10;
const COLS = 10;
const TILE_SIZE = 32;
const TOTAL_MINES = 10;

let board = [];
let gameOver = false;
let gameWon = false;
let timerInterval = null;
let timeElapsed = 0;
let firstClick = true;

let touchStartX = 0;
let touchStartY = 0;
let touchTimer = null;
let isLongPress = false;

let gamepadIndex = null;
let selectorX = 0;
let selectorY = 0;
let lastGamepadInput = 0;

function setupDOMReferences() {
    canvas = document.getElementById("mscanvas");
    ctx = canvas.getContext("2d");

    faceBtn = document.getElementById("face-btn");
    mineCounterDisplay = document.getElementById("mine-counter");
    timerDisplay = document.getElementById("timer");
    restartBtn = document.getElementById("restart-btn");

    imgNormal = document.getElementById("tile-normal");
    imgClicked = document.getElementById("tile-clicked");
    imgSpike = document.getElementById("tile-spike");

    canvas.width = COLS * TILE_SIZE;
    canvas.height = ROWS * TILE_SIZE;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    window.addEventListener("gamepadconnected", (e) => {
        gamepadIndex = e.gamepad.index;
        updateGamepadLoop();
    });
    window.addEventListener("gamepaddisconnected", () => {
        gamepadIndex = null;
    });

    if (faceBtn) faceBtn.addEventListener("click", initBoard);
    if (restartBtn) restartBtn.addEventListener("click", initBoard);
}

function playSound(audioEl) {
    if (audioEl) {
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
    }
}

function initBoard() {
    board = [];
    gameOver = false;
    gameWon = false;
    firstClick = true;
    timeElapsed = 0;
    selectorX = 0;
    selectorY = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    
    if (faceBtn) faceBtn.src = "Happy.png";
    if (timerDisplay) timerDisplay.textContent = "000";
    if (mineCounterDisplay) mineCounterDisplay.textContent = String(TOTAL_MINES).padStart(3, '0');

    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            row.push({
                r: r,
                c: c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            });
        }
        board.push(row);
    }
    draw();
}

function plantMines(exceptR, exceptC) {
    let planted = 0;
    while (planted < TOTAL_MINES) {
        let r = Math.floor(Math.random() * ROWS);
        let c = Math.floor(Math.random() * COLS);
        
        if (!board[r][c].isMine && !(r === exceptR && c === exceptC)) {
            board[r][c].isMine = true;
            planted++;
        }
    }

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine) {
                board[r][c].neighborMines = countNeighbors(r, c);
            }
        }
    }
}

function countNeighbors(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            let nr = r + dr;
            let nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (board[nr][nc].isMine) count++;
            }
        }
    }
    return count;
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeElapsed++;
        if (timeElapsed > 999) timeElapsed = 999;
        if (timerDisplay) timerDisplay.textContent = String(timeElapsed).padStart(3, '0');
    }, 1000);
}

function revealTile(r, c) {
    if (gameOver || gameWon || board[r][c].isRevealed || board[r][c].isFlagged) return;

    if (firstClick) {
        firstClick = false;
        plantMines(r, c);
        startTimer();
    }

    board[r][c].isRevealed = true;

    if (board[r][c].isMine) {
        endGame(false);
        return;
    }

    playSound(sndClick);

    if (board[r][c].neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                let nr = r + dr;
                let nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    revealTile(nr, nc);
                }
            }
        }
    }

    checkWinState();
}

function toggleFlag(r, c) {
    if (gameOver || gameWon || board[r][c].isRevealed) return;

    board[r][c].isFlagged = !board[r][c].isFlagged;
    playSound(sndFlag);

    let flaggedCount = 0;
    for (let row of board) {
        for (let tile of row) {
            if (tile.isFlagged) flaggedCount++;
        }
    }
    let displayMines = TOTAL_MINES - flaggedCount;
    if (displayMines < -99) displayMines = -99;
    
    if (mineCounterDisplay) {
        if (displayMines >= 0) {
            mineCounterDisplay.textContent = String(displayMines).padStart(3, '0');
        } else {
            mineCounterDisplay.textContent = "-" + String(Math.abs(displayMines)).padStart(2, '0');
        }
    }
}

function checkWinState() {
    let unrevealedSafeTiles = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine && !board[r][c].isRevealed) {
                unrevealedSafeTiles++;
            }
        }
    }
    if (unrevealedSafeTiles === 0) {
        endGame(true);
    }
}

function endGame(won) {
    clearInterval(timerInterval);
    if (won) {
        gameWon = true;
        if (faceBtn) faceBtn.src = "Happy.png";
        playSound(sndWin);
    } else {
        gameOver = true;
        if (faceBtn) faceBtn.src = "Sad.png";
        playSound(sndExplode);
        setTimeout(() => playSound(sndLose), 600);
        
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c].isMine) {
                    board[r][c].isRevealed = true;
                }
            }
        }
    }
    draw();
}

function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let tile = board[r][c];
            let x = c * TILE_SIZE;
            let y = r * TILE_SIZE;

            if (tile.isRevealed) {
                if (tile.isMine) {
                    ctx.drawImage(imgSpike, x, y, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.drawImage(imgClicked, x, y, TILE_SIZE, TILE_SIZE);
                    if (tile.neighborMines > 0) {
                        ctx.font = "18px ByteBounce";
                        ctx.fillStyle = getNumberColor(tile.neighborMines);
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(tile.neighborMines, x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 2);
                    }
                }
            } else {
                ctx.drawImage(imgNormal, x, y, TILE_SIZE, TILE_SIZE);
                if (tile.isFlagged) {
                    ctx.fillStyle = "#ff3333";
                    ctx.fillRect(x + 10, y + 10, TILE_SIZE - 20, TILE_SIZE - 20);
                }
            }

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
    }

    if (gamepadIndex !== null && !gameOver && !gameWon) {
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(selectorX * TILE_SIZE, selectorY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
}

function getNumberColor(num) {
    const colors = ["", "#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000000", "#808080"];
    return colors[num] || "#ffffff";
}

function getCanvasMousePos(e) {
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function handleMouseDown(e) {
    if (gameOver || gameWon) return;

    let pos = getCanvasMousePos(e);
    let c = Math.floor(pos.x / TILE_SIZE);
    let r = Math.floor(pos.y / TILE_SIZE);

    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        if (e.button === 0) {
            revealTile(r, c);
        } else if (e.button === 2) {
            toggleFlag(r, c);
        }
        draw();
    }
}

function handleTouchStart(e) {
    if (gameOver || gameWon) return;
    e.preventDefault();
    
    let touch = e.touches[0];
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;
    
    touchStartX = (touch.clientX - rect.left) * scaleX;
    touchStartY = (touch.clientY - rect.top) * scaleY;
    
    isLongPress = false;
    touchTimer = setTimeout(() => {
        isLongPress = true;
        let c = Math.floor(touchStartX / TILE_SIZE);
        let r = Math.floor(touchStartY / TILE_SIZE);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            toggleFlag(r, c);
            draw();
        }
    }, 500);
}

function handleTouchEnd(e) {
    e.preventDefault();
    clearTimeout(touchTimer);
    
    if (!isLongPress) {
        let c = Math.floor(touchStartX / TILE_SIZE);
        let r = Math.floor(touchStartY / TILE_SIZE);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            revealTile(r, c);
            draw();
        }
    }
}

function updateGamepadLoop() {
    if (gamepadIndex === null) return;
    const gp = navigator.getGamepads()[gamepadIndex];
    if (!gp) return;

    let now = Date.now();
    if (now - lastGamepadInput > 200) {
        if (gp.axes[1] < -0.5 || gp.buttons[12].pressed) {
            selectorY = Math.max(0, selectorY - 1);
            lastGamepadInput = now;
        } else if (gp.axes[1] > 0.5 || gp.buttons[13].pressed) {
            selectorY = Math.min(ROWS - 1, selectorY + 1);
            lastGamepadInput = now;
        }

        if (gp.axes[0] < -0.5 || gp.buttons[14].pressed) {
            selectorX = Math.max(0, selectorX - 1);
            lastGamepadInput = now;
        } else if (gp.axes[0] > 0.5 || gp.buttons[15].pressed) {
            selectorX = Math.min(COLS - 1, selectorX + 1);
            lastGamepadInput = now;
        }

        if (gp.buttons[0].pressed) {
            revealTile(selectorY, selectorX);
            lastGamepadInput = now;
        } else if (gp.buttons[1].pressed) {
            toggleFlag(selectorY, selectorX);
            lastGamepadInput = now;
        } else if (gp.buttons[8].pressed || gp.buttons[9].pressed) {
            initBoard();
            lastGamepadInput = now;
        }
        draw();
    }

    requestAnimationFrame(updateGamepadLoop);
}

window.addEventListener("DOMContentLoaded", function() {
    setupDOMReferences();
    initBoard();
});

window.addEventListener("load", function() {
    draw();
});
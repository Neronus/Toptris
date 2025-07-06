class UpsideDownTetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.BLOCK_SIZE = 32;
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        
        this.currentPiece = null;
        this.nextPiece = null;
        this.dropTimer = 0;
        this.dropInterval = 500;
        
        // Animation system
        this.animation = {
            state: null, // 'clearing' when animating line clears
            timer: 0, // Current animation time in ms
            glowingRows: [], // Row indices that are glowing during clear animation
            movingRows: [], // Data for rows that drop after lines are cleared
            linesRemovedDuringAnimation: false,
            clearedLineCount: 0,
            
            // Animation timing constants
            DURATION: 6000, // Total animation duration in ms
            GLOW_DURATION: 3000, // How long rows glow before disappearing
            GLOW_PHASE_RATIO: 0.5 // Glow takes first half of animation
        };
        
        this.colors = [
            '#000000', // Empty
            '#00ff00', // I-piece (bright green)
            '#ffff00', // O-piece (yellow)
            '#ff00ff', // T-piece (magenta)
            '#00ffff', // S-piece (cyan)
            '#ff0000', // Z-piece (red)
            '#0000ff', // J-piece (blue)
            '#ff8000'  // L-piece (orange)
        ];
        
        this.pieces = [
            // I-piece
            [
                [0,0,0,0],
                [1,1,1,1],
                [0,0,0,0],
                [0,0,0,0]
            ],
            // O-piece
            [
                [2,2],
                [2,2]
            ],
            // T-piece
            [
                [0,3,0],
                [3,3,3],
                [0,0,0]
            ],
            // S-piece
            [
                [0,4,4],
                [4,4,0],
                [0,0,0]
            ],
            // Z-piece
            [
                [5,5,0],
                [0,5,5],
                [0,0,0]
            ],
            // J-piece
            [
                [6,0,0],
                [6,6,6],
                [0,0,0]
            ],
            // L-piece
            [
                [0,0,7],
                [7,7,7],
                [0,0,0]
            ]
        ];
        
        this.initializeGame();
        this.bindEvents();
    }
    
    initializeGame() {
        this.ctx.scale(1, 1);
        this.nextCtx.scale(1, 1);
        
        // Make canvas crisp
        this.ctx.imageSmoothingEnabled = false;
        this.nextCtx.imageSmoothingEnabled = false;
        
        this.generateNewPiece();
        this.generateNewPiece();
        this.updateDisplay();
        this.updateDebugStatus();
    }
    
    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Debug mode
        this.debugMode = false;
    }
    
    handleKeyPress(e) {
        // Debug controls (work even when paused)
        if (e.code === 'KeyD') {
            this.debugMode = !this.debugMode;
            this.updateDebugStatus();
            console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
            return;
        }
        
        if (this.debugMode) {
            switch(e.code) {
                case 'KeyF':
                    this.fillTestRows();
                    console.log('Filled test rows');
                    break;
                case 'KeyC':
                    this.clearLines();
                    console.log('Triggered line clear');
                    break;
                case 'KeyR':
                    this.fillRandomTestPattern();
                    console.log('Filled random test pattern');
                    break;
            }
        }
        
        if (!this.gameRunning || this.gamePaused) return;
        
        switch(e.code) {
            case 'ArrowLeft':
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                this.movePiece(0, -1); // Reversed: down key moves up
                break;
            case 'ArrowUp':
                this.rotatePiece();
                break;
            case 'Space':
                this.hardDrop();
                break;
        }
        e.preventDefault();
    }
    
    generateNewPiece() {
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
        } else {
            this.currentPiece = this.createPiece();
        }
        this.nextPiece = this.createPiece();
    }
    
    createPiece() {
        const pieceIndex = Math.floor(Math.random() * this.pieces.length);
        const shape = this.pieces[pieceIndex];
        
        return {
            shape: shape,
            x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
            y: this.BOARD_HEIGHT - 1, // Start from bottom in upside-down version
            color: pieceIndex + 1
        };
    }
    
    movePiece(dx, dy) {
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;
        
        if (this.isValidMove(newX, newY, this.currentPiece.shape)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            return true;
        }
        return false;
    }
    
    rotatePiece() {
        const rotated = this.rotateMatrix(this.currentPiece.shape);
        if (this.isValidMove(this.currentPiece.x, this.currentPiece.y, rotated)) {
            this.currentPiece.shape = rotated;
        }
    }
    
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = matrix[i][j];
            }
        }
        return rotated;
    }
    
    isValidMove(x, y, shape) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const newX = x + col;
                    const newY = y - row; // Reversed Y coordinate
                    
                    if (newX < 0 || newX >= this.BOARD_WIDTH || 
                        newY < 0 || newY >= this.BOARD_HEIGHT ||
                        this.board[newY][newX] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    hardDrop() {
        while (this.movePiece(0, -1)) { // Move up until collision
            this.score += 2;
        }
        this.lockPiece();
    }
    
    lockPiece() {
        const piece = this.currentPiece;
        
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col] !== 0) {
                    const boardX = piece.x + col;
                    const boardY = piece.y - row; // Reversed Y coordinate
                    
                    if (boardY >= 0 && boardY < this.BOARD_HEIGHT) {
                        this.board[boardY][boardX] = piece.color;
                    }
                }
            }
        }
        
        this.clearLines();
        this.generateNewPiece();
        
        if (!this.isValidMove(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
            this.gameOver();
        }
    }
    
    clearLines() {
        const completedRows = [];
        
        // Find completed rows from top to bottom (reversed)
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            if (this.board[row].every(cell => cell !== 0)) {
                completedRows.push(row);
            }
        }
        
        if (completedRows.length > 0) {
            // Start line clearing animation
            this.startLineClearAnimation(completedRows);
        }
    }
    
    startLineClearAnimation(completedRows) {
        // Initialize two-phase animation: glow phase then movement phase
        this.animation.state = 'clearing';
        this.animation.timer = 0;
        this.animation.glowingRows = [...completedRows];
        this.animation.linesRemovedDuringAnimation = false;
        this.animation.clearedLineCount = completedRows.length; // Store for scoring
        
        // Prevent new pieces from spawning during animation
        this.gameRunning = false;
        
        // Pre-calculate which rows need to drop after lines are cleared
        this.animation.movingRows = [];
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            if (!completedRows.includes(row)) {
                // Count how many lines above this row are being cleared
                const linesAbove = completedRows.filter(clearedRow => clearedRow < row).length;
                if (linesAbove > 0) {
                    this.animation.movingRows.push({
                        originalRow: row,
                        targetRow: row - linesAbove, // Move up (toward lower row numbers)
                        currentOffset: 0,
                        data: [...this.board[row]] // Save row data before board changes
                    });
                }
            }
        }
    }
    
    removeLinesAndStartMovement() {
        // Phase 1 complete: remove glowing lines and prepare for movement phase
        this.animation.glowingRows.sort((a, b) => b - a); // Sort descending for safe removal
        for (const row of this.animation.glowingRows) {
            this.board.splice(row, 1);
            this.board.push(Array(this.BOARD_WIDTH).fill(0)); // Add empty line at bottom
        }
        
        this.animation.linesRemovedDuringAnimation = true;
        
        // Clear the glowing rows array since they're now removed
        this.animation.glowingRows = [];
    }
    
    finishLineClearAnimation() {
        // Update score and level using stored count
        this.lines += this.animation.clearedLineCount;
        this.score += this.animation.clearedLineCount * 100 * this.level;
        this.level = Math.floor(this.lines / 10) + 1;
        this.dropInterval = Math.max(50, 500 - (this.level - 1) * 50);
        
        this.resetAnimationState();
    }
    
    update(deltaTime) {
        if (this.gamePaused) return;
        
        // Handle line clearing animation
        if (this.animation.state === 'clearing') {
            this.animation.timer += deltaTime;
            
            if (this.animation.timer >= this.animation.DURATION) {
                this.finishLineClearAnimation();
            }
            return;
        }
        
        if (!this.gameRunning) return;
        
        this.dropTimer += deltaTime;
        if (this.dropTimer >= this.dropInterval) {
            if (!this.movePiece(0, -1)) { // Try to move up
                this.lockPiece();
            }
            this.dropTimer = 0;
        }
    }
    
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = '#003300';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        if (this.animation.state === 'clearing') {
            this.drawAnimatedBoard();
        } else {
            this.drawStaticBoard();
        }
        
        // Draw current piece (only if not animating)
        if (this.currentPiece && this.animation.state !== 'clearing') {
            const piece = this.currentPiece;
            for (let row = 0; row < piece.shape.length; row++) {
                for (let col = 0; col < piece.shape[row].length; col++) {
                    if (piece.shape[row][col] !== 0) {
                        const drawX = piece.x + col;
                        const drawY = piece.y - row; // Reversed Y coordinate
                        if (drawY >= 0 && drawY < this.BOARD_HEIGHT) {
                            this.drawBlock(drawX, drawY, this.colors[piece.color]);
                        }
                    }
                }
            }
        }
        
        // Draw next piece
        this.drawNextPiece();
    }
    
    drawStaticBoard() {
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                if (this.board[row][col] !== 0) {
                    this.drawBlock(col, row, this.colors[this.board[row][col]]);
                }
            }
        }
    }
    
    drawAnimatedBoard() {
        // Two-phase line clearing animation:
        // Phase 1: Glow effect on completed lines
        // Phase 2: Drop remaining rows into place
        
        const progress = this.animation.timer / this.animation.DURATION;
        const glowProgress = Math.min(this.animation.timer / this.animation.GLOW_DURATION, 1.0);
        const glowFinished = this.animation.timer >= this.animation.GLOW_DURATION;
        
        // Transition from glow phase to movement phase
        if (glowFinished && !this.animation.linesRemovedDuringAnimation) {
            this.removeLinesAndStartMovement();
        }
        
        if (!glowFinished) {
            this.drawGlowPhase(glowProgress);
        } else {
            this.drawMovementPhase(progress);
        }
    }
    
    drawGlowPhase(glowProgress) {
        // Phase 1: Glow effect
        // Draw all non-glowing rows normally
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            if (!this.animation.glowingRows.includes(row)) {
                this.drawBoardRow(row);
            }
        }
        
        // Draw glowing rows with pulsing effect
        for (const row of this.animation.glowingRows) {
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                if (this.board[row][col] !== 0) {
                    this.drawGlowingBlock(col, row, this.colors[this.board[row][col]], glowProgress);
                }
            }
        }
    }
    
    drawMovementPhase(progress) {
        // Phase 2: Movement animation
        // Draw static rows (those not affected by line clearing)
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            // Only draw rows that aren't moving to avoid duplicates
            if (!this.animation.movingRows.some(mr => mr.targetRow === row)) {
                this.drawBoardRow(row);
            }
        }
        
        // Draw rows that are dropping down with smooth animation
        for (const movingRow of this.animation.movingRows) {
            const moveProgress = Math.max(0, (progress - this.animation.GLOW_PHASE_RATIO) * 2); // Start moving after glow
            const easeProgress = this.easeOutCubic(moveProgress);
            const offset = easeProgress * (movingRow.targetRow - movingRow.originalRow) * this.BLOCK_SIZE;
            
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                if (movingRow.data[col] !== 0) {
                    this.drawMovingBlock(col, movingRow.originalRow, this.colors[movingRow.data[col]], offset);
                }
            }
        }
    }
    
    drawBoardRow(row) {
        // Helper method to draw a single row of the board
        for (let col = 0; col < this.BOARD_WIDTH; col++) {
            if (this.board[row][col] !== 0) {
                this.drawBlock(col, row, this.colors[this.board[row][col]]);
            }
        }
    }
    
    resetAnimationState() {
        // Reset all animation-related state
        this.animation.state = null;
        this.animation.timer = 0;
        this.animation.glowingRows = [];
        this.animation.movingRows = [];
        this.animation.linesRemovedDuringAnimation = false;
        this.animation.clearedLineCount = 0;
        this.gameRunning = true;
    }
    
    easeOutCubic(t) {
        // Smooth easing function for natural-looking animation
        return 1 - Math.pow(1 - t, 3);
    }
    
    // Debug helper functions
    fillTestRows() {
        // Fill some rows with gaps to test line clearing
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                if (row === 1 || row === 3) {
                    // Complete rows for clearing
                    this.board[row][col] = Math.floor(Math.random() * 7) + 1;
                } else if (col < 8) {
                    // Partial rows
                    this.board[row][col] = Math.floor(Math.random() * 7) + 1;
                }
            }
        }
    }
    
    fillRandomTestPattern() {
        // Clear board first
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        
        // Fill bottom portion with random blocks and some complete rows
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                if (row === 2 || row === 4 || row === 6) {
                    // Complete rows
                    this.board[row][col] = Math.floor(Math.random() * 7) + 1;
                } else if (Math.random() < 0.7) {
                    // Partial rows
                    this.board[row][col] = Math.floor(Math.random() * 7) + 1;
                }
            }
        }
    }
    
    updateDebugStatus() {
        const statusElement = document.getElementById('debugStatus');
        if (statusElement) {
            statusElement.textContent = this.debugMode ? 'ON' : 'OFF';
            statusElement.className = `debug-status ${this.debugMode ? 'on' : 'off'}`;
        }
    }
    
    drawBlock(x, y, color) {
        const pixelX = x * this.BLOCK_SIZE;
        const pixelY = y * this.BLOCK_SIZE;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, this.BLOCK_SIZE, this.BLOCK_SIZE);
        
        // Add highlight effect
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pixelX + 2, pixelY + 2, this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 4);
        
        // Add shadow effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(pixelX + this.BLOCK_SIZE - 4, pixelY + 4, 4, this.BLOCK_SIZE - 4);
        this.ctx.fillRect(pixelX + 4, pixelY + this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 4, 4);
    }
    
    drawGlowingBlock(x, y, color, glowProgress) {
        // Draw blocks with pulsing glow effect during line clearing
        const pixelX = x * this.BLOCK_SIZE;
        const pixelY = y * this.BLOCK_SIZE;
        
        // Create pulsing glow effect with sine wave
        const glowIntensity = 0.5 + 0.5 * Math.sin(glowProgress * Math.PI * 4);
        const glowAlpha = 0.3 + 0.7 * glowIntensity;
        
        // Draw glow background with shadow blur
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 15 * glowIntensity;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, this.BLOCK_SIZE, this.BLOCK_SIZE);
        
        // Reset shadow to avoid affecting other draws
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        
        // Add bright white overlay for glow effect
        this.ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha * 0.3})`;
        this.ctx.fillRect(pixelX, pixelY, this.BLOCK_SIZE, this.BLOCK_SIZE);
        
        // Enhanced highlight and shadow effects
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pixelX + 2, pixelY + 2, this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 4);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(pixelX + this.BLOCK_SIZE - 4, pixelY + 4, 4, this.BLOCK_SIZE - 4);
        this.ctx.fillRect(pixelX + 4, pixelY + this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 4, 4);
    }
    
    drawMovingBlock(x, y, color, offset) {
        // Draw blocks that are animated during the drop phase
        const pixelX = x * this.BLOCK_SIZE;
        const pixelY = y * this.BLOCK_SIZE + offset; // Apply vertical animation offset
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, this.BLOCK_SIZE, this.BLOCK_SIZE);
        
        // Standard highlight and shadow effects
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pixelX + 2, pixelY + 2, this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 4);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(pixelX + this.BLOCK_SIZE - 4, pixelY + 4, 4, this.BLOCK_SIZE - 4);
        this.ctx.fillRect(pixelX + 4, pixelY + this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 4, 4);
    }
    
    drawNextPiece() {
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const piece = this.nextPiece;
            const blockSize = 24;
            const offsetX = (this.nextCanvas.width - piece.shape[0].length * blockSize) / 2;
            const offsetY = (this.nextCanvas.height - piece.shape.length * blockSize) / 2;
            
            for (let row = 0; row < piece.shape.length; row++) {
                for (let col = 0; col < piece.shape[row].length; col++) {
                    if (piece.shape[row][col] !== 0) {
                        const x = offsetX + col * blockSize;
                        const y = offsetY + row * blockSize;
                        
                        this.nextCtx.fillStyle = this.colors[piece.color];
                        this.nextCtx.fillRect(x, y, blockSize, blockSize);
                        
                        this.nextCtx.strokeStyle = '#ffffff';
                        this.nextCtx.lineWidth = 1;
                        this.nextCtx.strokeRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                    }
                }
            }
        }
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        this.gameLoop();
    }
    
    pauseGame() {
        this.gamePaused = !this.gamePaused;
        document.getElementById('pauseBtn').textContent = this.gamePaused ? 'RESUME' : 'PAUSE';
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }
    
    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropTimer = 0;
        this.dropInterval = 500;
        
        // Reset animation state
        this.animation.state = null;
        this.animation.timer = 0;
        this.animation.glowingRows = [];
        this.animation.movingRows = [];
        
        this.generateNewPiece();
        this.generateNewPiece();
        this.updateDisplay();
        this.draw();
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'PAUSE';
    }
    
    gameOver() {
        this.gameRunning = false;
        alert(`Game Over! Final Score: ${this.score}`);
        this.resetGame();
    }
    
    gameLoop() {
        if (this.gamePaused) return;
        
        // Continue running during animation
        if (!this.gameRunning && this.animation.state !== 'clearing') return;
        
        const now = Date.now();
        const deltaTime = now - (this.lastTime || now);
        this.lastTime = now;
        
        this.update(deltaTime);
        this.draw();
        this.updateDisplay();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new UpsideDownTetris();
});

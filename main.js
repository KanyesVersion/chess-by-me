const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const playingText = document.getElementById('playing-text');
const turnUi = document.getElementById('turn');
const moveListUi = document.getElementById('move-list');
const whiteTimeUI = document.getElementById('white-time')
const blackTimeUI = document.getElementById('black-time')
const restartBtn = document.getElementById('restart-btn');
const lightSquareColor = '#ffdac2';
const darkSquareColor = '#c2834b';
const squareSize = canvas.width / 8;
const piecesSetup = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
];
const startingSetup = JSON.parse(JSON.stringify(piecesSetup));
const squaresMovedHistory = [];
const moveHistory = [];
let currMoveSpan = null;
let squareColors = piecesSetup.map(
    (el, index1) => el.map(
        (_, index2) => (index2 + (index1 % 2)) % 2 === 0 ? lightSquareColor : darkSquareColor
    )
);
const colors = {
    black: '#000',
    red: '#ff4545',
    green: '#54ff71',
};
const images = initializeImages();
const mouse = {
    x: 0,
    y: 0
}
let mouseInsideCanvas = mouse.x >= 0 && mouse.x <= canvas.width && mouse.y >= 0 && mouse.y <= canvas.height;
let isMouseDown = false;
let squareClicked;
let squareReleased;
let squareHovered;
let turn = 'white';
let modals = [];
let isModalOpen = false;
const currPossLegalMoves = [];
let moveTotal = 0;
let move = 1;
const isClockTicking = {
    white: true,
    black: false
};
let whiteTime = 6001;
let blackTime = 6000;
let isPaused = false;
let currMoveAudio = 'piecemove.ogg';

class PromotionModal {
    constructor(x, y, color) {
        this.x = x - 8;
        this.y = y;
        this.width = squareSize + 16;
        this.height = squareSize * 4;
        this.color = color;
        this.size = squareSize;
    }

    draw() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 4);
        ctx.stroke();
        ctx.closePath();
        const queen = new Image();
        queen.src = `./pieces/${this.color}-queen.png`;
        const rook = new Image();
        rook.src = `./pieces/${this.color}-rook.png`;
        const bishop = new Image();
        bishop.src = `./pieces/${this.color}-bishop.png`;
        const knight = new Image();
        knight.src = `./pieces/${this.color}-knight.png`;
        ctx.drawImage(queen, this.x + 8, this.y, this.size, this.size);
        ctx.drawImage(rook, this.x + 8, this.y + squareSize, this.size, this.size);
        ctx.drawImage(bishop, this.x + 8, this.y + squareSize * 2, this.size, this.size);
        ctx.drawImage(knight, this.x + 8, this.y + squareSize * 3, this.size, this.size);
    }

    update() {
        this.draw();
    }
}

loop();
oneDecSecClock();

//buttons and event listeners

window.addEventListener('mousemove', e => {
    mouse.x = e.clientX - canvas.offsetLeft;
    mouse.y = e.clientY - canvas.offsetTop;
    mouseInsideCanvas = mouse.x > 0 && mouse.x < canvas.width && mouse.y > 0 && mouse.y < canvas.height;
    if (mouseInsideCanvas) {
        squareHovered = getSquareFromPos(mouse.x, mouse.y);
    }
    if (isMouseDown && getPieceFromSquare(squareClicked).charAt(0) === turn.charAt(0) && turn !== '' && mouseInsideCanvas) {
        resetSquareColors();
        changeColorOfSquare(squareClicked, colors.green);
        if (getSquareFromPos(mouse.x, mouse.y) !== squareClicked) {
            const hoverColor = currPossLegalMoves.includes(squareHovered) ? colors.green : colors.red;
            changeColorOfSquare(squareHovered, hoverColor);
        }
    }
});

window.addEventListener('mousedown', () => {
    if (mouseInsideCanvas && !isModalOpen) {
        isMouseDown = true;
        squareClicked = getSquareFromPos(mouse.x, mouse.y);
        const pieceClicked = getPieceFromSquare(squareClicked);
        if (pieceClicked.charAt(0) === turn.charAt(0)  && turn !== '') {
            changeColorOfSquare(squareClicked, colors.green);
            getPossMovesFromSquare(squareClicked).forEach(el => {
                // if (isMoveLegal(squareClicked, el)) {
                    currPossLegalMoves.push(el);
                // }
            });
        }
    } else if (isModalOpen && modals.length) {
        promotePawn();
    }
});

window.addEventListener('mouseup', () => {
    resetSquareColors();
    isMouseDown = false;
    currPossLegalMoves.splice(0);

    if (mouseInsideCanvas && !isModalOpen) {
        squareReleased = getSquareFromPos(mouse.x, mouse.y);
        if (getPieceFromSquare(squareClicked) !== '' && isMovePossible(squareClicked, squareReleased) && isMoveLegal(squareClicked, squareReleased)) {
            movePiece(squareClicked, squareReleased);

            if (turn === 'white') {
                displayWhiteMove();
                turn = 'black';
                isClockTicking.white = false;
                isClockTicking.black = true;
            } else {
                displayBlackMove();
                turn = 'white';
                isClockTicking.white = true;
                isClockTicking.black = false;
                move++;
            }
            moveTotal++;
            turnUi.textContent = turn.toUpperCase();

            // check for checkmate
            if (turn === 'black' && isBlackInCheck()) {
                currMoveAudio = 'check.ogg';
                if (!getBlackMoves().length) {
                    playingText.textContent = 'CHECKMATE \n WHITE WINS';
                    currMoveAudio = 'checkmate.ogg';
                    currMoveSpan.lastChild.textContent = currMoveSpan.lastChild.textContent.replace('+', '#');
                    restartBtn.classList.remove('hidden');
                    turn = '';
                    turnUi.classList.add('hidden');
                    isPaused = true;
                    isClockTicking.white = false;
                    isClockTicking.black = false;
                }
            }
        
            if (turn === 'white' && isWhiteInCheck()) {
                currMoveAudio = 'check.ogg';
                if (!getWhiteMoves().length) {
                    playingText.textContent = 'CHECKMATE \n BLACK WINS';
                    currMoveAudio = 'checkmate.ogg';
                    currMoveSpan.lastChild.textContent = currMoveSpan.lastChild.textContent.replace('+', '#');
                    restartBtn.classList.remove('hidden');
                    turn = '';
                    turnUi.classList.add('hidden');
                    isPaused = true;
                    isClockTicking.white = false;
                    isClockTicking.black = false;
                }
            }

            const pieceMoveSound = getAudio(currMoveAudio);
            pieceMoveSound.play();
        }
    } else return;
});

restartBtn.addEventListener('click', () => {
    resetSquareColors();
    piecesSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
            hardRewriteSetup(index1, index2, startingSetup[index1][index2]);
        });
    });
    turnUi.classList.remove('hidden');
    playingText.textContent = 'Playing now:';
    restartBtn.classList.add('hidden');
    squaresMovedHistory.splice(0);
    moveHistory.splice(0);
    moveListUi.innerHTML = '';
    move = 1;
    moveTotal = 0;
    whiteTime = 6001;
    blackTime = 6000;
    isPaused = false;
    isClockTicking.white = true;
    oneDecSecClock();
    turn = 'white';
    turnUi.textContent = 'WHITE';
});

//loop

function loop() {
    requestAnimationFrame(loop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawPieces();
    
    if (modals.length) {
        modals.forEach(modal => modal.update());
    }

    if (!isPaused) {
        displayTime();
    }
}

//functions

function oneDecSecClock() {
    if (!isPaused) {
        if (isClockTicking.white) {
            whiteTime--;
        }
        if (isClockTicking.black) {
            blackTime--;
        }

        // loop
        setTimeout(oneDecSecClock, 100);
    }
}

function movePiece(fromSquare, toSquare) {
    moveHistory.push({turn: turn, notation: getMoveNotation(fromSquare, toSquare)});
    currMoveAudio = getPieceFromSquare(toSquare) === '' ? 'piecemove.ogg' : 'piececapture.ogg';
    const pieceCopy = piecesSetup[rankToIndex(fromSquare.charAt(1))][fileToIndex(fromSquare.charAt(0))];
    piecesSetup[rankToIndex(fromSquare.charAt(1))][fileToIndex(fromSquare.charAt(0))] = '';
    piecesSetup[rankToIndex(toSquare.charAt(1))][fileToIndex(toSquare.charAt(0))] = pieceCopy;
    squaresMovedHistory.push(fromSquare);
    
    //special moves
    if (fromSquare === 'e1' && toSquare === 'g1' && getPieceFromSquare(toSquare) === 'wK') {
        movePiece('h1', 'f1');
        moveHistory.splice(-2);
        moveHistory.push({turn: turn, notation: 'O-O'});
    }
    if (fromSquare === 'e1' && toSquare === 'c1' && getPieceFromSquare(toSquare) === 'wK') {
        movePiece('a1', 'd1');
        moveHistory.splice(-2);
        moveHistory.push({turn: turn, notation: 'O-O-O'});
    }
    if (fromSquare === 'e8' && toSquare === 'g8' && getPieceFromSquare(toSquare) === 'bK') {
        movePiece('h8', 'f8');
        moveHistory.splice(-2);
        moveHistory.push({turn: turn, notation: 'O-O'});
    }
    if (fromSquare === 'e8' && toSquare === 'c8' && getPieceFromSquare(toSquare) === 'bK') {
        movePiece('a8', 'd8');
        moveHistory.splice(-2);
        moveHistory.push({turn: turn, notation: 'O-O-O'});
    }
    if (getPieceFromSquare(toSquare) === 'wP' && toSquare.charAt(1) === '8') {
        openPromModal(fileToIndex(toSquare.charAt(0)) * squareSize, 2, 'white');
    }
    if (getPieceFromSquare(toSquare) === 'bP' && toSquare.charAt(1) === '1') {
        openPromModal(fileToIndex(toSquare.charAt(0)) * squareSize, canvas.height - squareSize * 4 - 2, 'black');
    }
}

function drawBoard() {
    //draw squares
    squareColors.forEach((el1, index1) => {
        el1.forEach((el2, index2) => {
            const x = (index2 % 8) * squareSize;
            const y = (index1 % 8) * squareSize;
            ctx.fillStyle = el2;
            ctx.fillRect(x, y, squareSize, squareSize);
        });  
    });

    //draw labels
    for (let k = 0; k < 8; k++) {
        ctx.fillStyle = '#0009';
        ctx.font = '24px sans-serif';
        ctx.fillText(String.fromCharCode(97 + k), k * canvas.width / 8 + (canvas.width / 8 - 18), canvas.height - 6);
        ctx.fillText(JSON.stringify(8 - k), 2, k * canvas.height / 8 + 24)
    }
}

function initializeImages() {
    //returns an array
    const arr = [];
    for (let i = 0; i < 12; i++) {
        arr.push(new Image());
    }
    arr[0].src = './pieces/black-rook.png';
    arr[1].src = './pieces/black-knight.png';
    arr[2].src = './pieces/black-bishop.png';
    arr[3].src = './pieces/black-queen.png';
    arr[4].src = './pieces/black-king.png';
    arr[5].src = './pieces/black-pawn.png';
    arr[6].src = './pieces/white-rook.png';
    arr[7].src = './pieces/white-knight.png';
    arr[8].src = './pieces/white-bishop.png';
    arr[9].src = './pieces/white-queen.png';
    arr[10].src = './pieces/white-king.png';
    arr[11].src = './pieces/white-pawn.png';
    return arr;
}

function drawPieces() {
    piecesSetup.forEach((row, index) => {
        const y = index * canvas.width / 8;
        row.forEach((square, index) => {
            const x = index * canvas.height / 8;
            let img;
            if (square !== '') {
                switch (square) {
                    case 'bR':
                        img = images[0];
                        break;
                    case 'bN':
                        img = images[1];
                        break;
                    case 'bB':
                        img = images[2];
                        break;
                    case 'bQ':
                        img = images[3];
                        break;
                    case 'bK':
                        img = images[4];
                        break;
                    case 'bP':
                        img = images[5];
                        break;
                    case 'wR':
                        img = images[6];
                        break;
                    case 'wN':
                        img = images[7];
                        break;
                    case 'wB':
                        img = images[8];
                        break;
                    case 'wQ':
                        img = images[9];
                        break;
                    case 'wK':
                        img = images[10];
                        break;
                    case 'wP':
                        img = images[11];
                        break;
                }
                ctx.drawImage(img, x, y, canvas.width / 8, canvas.height / 8);
            }
        }); 
    });
}

function getColorOfSquare(square) {
    const rankIndex = rankToIndex(square.charAt(1));
    const fileIndex = fileToIndex(square.charAt(0));
    return squareColors[rankIndex][fileIndex];
}

function changeColorOfSquare(square, color) {
    const rankIndex = rankToIndex(square.charAt(1));
    const fileIndex = fileToIndex(square.charAt(0));
    squareColors[rankIndex][fileIndex] = color;
}

function resetSquareColors() {
    squareColors = squareColors.map(
        (el, index1) => el.map(
            (_, index2) => (index2 + (index1 % 2)) % 2 === 0 ? lightSquareColor : darkSquareColor
        )
    );
}

function getSquareFromPos(x, y) {
    const sizeX = canvas.width / 8;
    const sizeY = canvas.height / 8;
    let letter = '';
    let number = '';
    if (x < sizeX * 1) {
        letter = 'a';
    } else if (x < sizeX * 2) {
        letter = 'b';
    } else if (x < sizeX * 3) {
        letter = 'c';
    } else if (x < sizeX * 4) {
        letter = 'd';
    } else if (x < sizeX * 5) {
        letter = 'e';
    } else if (x < sizeX * 6) {
        letter = 'f';
    } else if (x < sizeX * 7) {
        letter = 'g';
    } else {
        letter = 'h';
    }

    number = JSON.stringify(8 - Math.floor(y / sizeY));

    return letter + number;
}

function getPieceFromSquare(square) {
    const rankIndex = rankToIndex(square.charAt(1));
    const fileIndex = fileToIndex(square.charAt(0));
    if (square !== 'catch' && rankIndex >= 0 && rankIndex <= piecesSetup.length && fileIndex >= 0 && fileIndex <= piecesSetup.length) {
        return piecesSetup[rankIndex][fileIndex];
    } else return '';
}

function getPieceFromSquareAlt(square, arr) {
    const rankIndex = rankToIndex(square.charAt(1));
    const fileIndex = fileToIndex(square.charAt(0));
    if (square !== 'catch' && rankIndex >= 0 && rankIndex <= arr.length && fileIndex >= 0 && fileIndex <= arr.length) {
        return arr[rankIndex][fileIndex];
    } else return '';
}

function getSquareFromIndex(rankIndex, fileIndex) {
    return indexToFile(fileIndex) + indexToRank(rankIndex);
}

function getPieceFromPos(x, y) {
    const sizeX = canvas.width / 8;
    const sizeY = canvas.height / 8;
    const horIndex = Math.floor(x / sizeX);
    const verIndex = Math.floor(y / sizeY);
    return piecesSetup[verIndex][horIndex];
}

function getFileIndexFromPos(x) {
    const sizeX = canvas.width / 8;
    return Math.floor(x / sizeX);
}

function getRankIndexFromPos(y) {
    const sizeY = canvas.height / 8;
    return Math.floor(y / sizeY);
}

function fileToIndex(file) {
    let index;
    switch (file) {
        case 'a':
            index = 0;
            break;
        case 'b':
            index = 1;
            break;
        case 'c':
            index = 2;
            break;
        case 'd':
            index = 3;
            break;
        case 'e':
            index = 4;
            break;
        case 'f':
            index = 5;
            break;
        case 'g':
            index = 6;
            break;
        case 'h':
            index = 7;
            break;
    }
    return index;
}

function indexToFile(index) {
    let file;
    switch (index) {
        case 0:
            file = 'a';
            break;
        case 1:
            file = 'b';
            break;
        case 2:
            file = 'c';
            break;
        case 3:
            file = 'd';
            break;
        case 4:
            file = 'e';
            break;
        case 5:
            file = 'f';
            break;
        case 6:
            file = 'g';
            break;
        case 7:
            file = 'h';
            break;
    }
    return file;
}

function rankToIndex(rank) {
    return 8 - parseInt(rank);
}

function indexToRank(index) {
    return JSON.stringify(8 - index);
}

function deltaRank(square1, square2) {
    //evalues how far the square in the second argument is RELATIVE TO the square in the first argument
    const square1Num = parseInt(square1.charAt(1));
    const square2Num = parseInt(square2.charAt(1));
    return square1Num - square2Num;
}

function deltaRankAbs(square1, square2) {
    return Math.abs(deltaRank(square1, square2));
}

function deltaFile(square1, square2) {
    //evalues how far the square in the second argument is RELATIVE TO the square in the first argument
    const square1Num = fileToIndex(square1.charAt(0));
    const square2Num = fileToIndex(square2.charAt(0));
    return square2Num - square1Num;
}

function deltaFileAbs(square1, square2) {
    return Math.abs(deltaFile(square1, square2));
}

function deltaSquare(square1, square2) {
    //returns an array with 2 elements where [0] is delta rank and [1] is delta file
    return [
        deltaRank(square1, square2),
        deltaFile(square1, square2)
    ];
}

function getSquareFromDelta(startSquare, deltaRank, deltaFile) {
    const startRankIndex = rankToIndex(startSquare.charAt(1));
    const startFileIndex = fileToIndex(startSquare.charAt(0));
    if (startRankIndex + deltaRank >= 0 && startRankIndex + deltaRank < piecesSetup.length && startFileIndex + deltaFile >= 0 && startFileIndex + deltaFile < piecesSetup.length) {
        return getSquareFromIndex(startRankIndex + deltaRank, startFileIndex + deltaFile);
    } else return 'catch';
}

function isADiag(startSquare, endSquare) {
    const startIndex = [rankToIndex(startSquare.charAt(1)), fileToIndex(startSquare.charAt(0))];
    const endIndex = [rankToIndex(endSquare.charAt(1)), fileToIndex(endSquare.charAt(0))];
    const deltaIndexRank = Math.abs(endIndex[0] - startIndex[0]);
    const deltaIndexFile = Math.abs(endIndex[1] - startIndex[1]);
    return deltaIndexRank === deltaIndexFile && deltaIndexFile !== 0;
}

function getDiag(startSquare, endSquare) {
    // returns an array of squares
    if (isADiag(startSquare, endSquare)) {
        const startIndex = fileToIndex(startSquare.charAt(0));
        const endIndex = fileToIndex(endSquare.charAt(0))
        const numOfSquares = Math.abs(endIndex - startIndex) + 1;
        const hor = (endIndex - startIndex) / Math.abs(endIndex - startIndex);
        const ver = (rankToIndex(endSquare.charAt(1)) - rankToIndex(startSquare.charAt(1))) / Math.abs((rankToIndex(endSquare.charAt(1)) - rankToIndex(startSquare.charAt(1))));
        return Array(numOfSquares)
            .fill(0)
            .map((_, index) => getSquareFromIndex(rankToIndex(startSquare.charAt(1)) + (index * ver), fileToIndex(startSquare.charAt(0)) + (index * hor)));
    } else return;

}

function getPiecesFromDiag(arr) {
    if (arr) {
        return arr.map(el => getPieceFromSquare(el));
    } else return [];
}

function getPiecesFromDiagAlt(arr, setup) {
    if (arr) {
        return arr.map(el => getPieceFromSquareAlt(el, setup));
    } else return [];
}

function isAStraightLine(startSquare, endSquare) {
    const startIndex = [rankToIndex(startSquare.charAt(1)), fileToIndex(startSquare.charAt(0))];
    const endIndex = [rankToIndex(endSquare.charAt(1)), fileToIndex(endSquare.charAt(0))];
    const deltaIndexRank = Math.abs(endIndex[0] - startIndex[0]);
    const deltaIndexFile = Math.abs(endIndex[1] - startIndex[1]);
    const conditions = [
        deltaIndexFile === 0 && deltaIndexRank > 0,
        deltaIndexFile > 0 && deltaIndexRank === 0,
    ];
    return conditions.some(i => i);
}

function getStraightLine(startSquare, endSquare) {
    // returns an array of squares
    if (isAStraightLine(startSquare, endSquare)) {
        let isHorizontal = startSquare.charAt(1) === endSquare.charAt(1);
        const numOfSquares = isHorizontal ? deltaFileAbs(startSquare, endSquare) + 1 : deltaRankAbs(startSquare, endSquare) + 1;
        const hor = (fileToIndex(endSquare.charAt(0)) - fileToIndex(startSquare.charAt(0))) / Math.abs((fileToIndex(endSquare.charAt(0)) - fileToIndex(startSquare.charAt(0))));
        const ver = (rankToIndex(endSquare.charAt(1)) - rankToIndex(startSquare.charAt(1))) / Math.abs((rankToIndex(endSquare.charAt(1)) - rankToIndex(startSquare.charAt(1))));

        if (isHorizontal) {
            return  Array(numOfSquares)
                .fill(0)
                .map((_, index) => getSquareFromIndex(rankToIndex(startSquare.charAt(1)), fileToIndex(startSquare.charAt(0)) + index * hor));
        } else {
            return  Array(numOfSquares)
                .fill(0)
                .map((_, index) => getSquareFromIndex(rankToIndex(startSquare.charAt(1)) + index * ver, fileToIndex(startSquare.charAt(0))));
        }
    } else return;
}

function getPiecesFromStraightLine(arr) {
    if (arr) {
        return arr.map(el => getPieceFromSquare(el));
    } else return [];
}

function getPiecesFromStraightLineAlt(arr, setup) {
    if (arr) {
        return arr.map(el => getPieceFromSquareAlt(el, setup));
    } else return [];
}

function isSquareEmpty(square) {
    return getPieceFromSquare(square) === '';
}

function getPossMovesFromSquare(square) {
    const listOfMoves = [];
    piecesSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
            if (isMovePossible(square, getSquareFromIndex(index1, index2))) {
                listOfMoves.push(getSquareFromIndex(index1, index2));
            }
        });
    });
    return listOfMoves;
}

function getPossMovesFromSquareAlt(square, arr) {
    const listOfMoves = [];
    arr.forEach((el, index1) => {
        el.forEach((_, index2) => {
            if (isMovePossibleAlt(square, getSquareFromIndex(index1, index2), arr)) {
                listOfMoves.push(getSquareFromIndex(index1, index2));
            }
        });
    });
    return listOfMoves;
}

function isWhiteInCheck() {
    let targets = [];
    piecesSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
            if (getPossMovesFromSquare(getSquareFromIndex(index1, index2)).length) {
                targets = targets.concat(getPossMovesFromSquare(getSquareFromIndex(index1, index2)));
            }
        });
    });

    const targetPieces = targets.filter(el => getPieceFromSquare(el) !== '').map((target => getPieceFromSquare(target)));
    return targetPieces.includes('wK');
}

function isBlackInCheck() {
    let targets = [];
    piecesSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
            if (getPossMovesFromSquare(getSquareFromIndex(index1, index2)).length) {
                targets = targets.concat(getPossMovesFromSquare(getSquareFromIndex(index1, index2)));
            }
        });
    });

    const targetPieces = targets.filter(el => getPieceFromSquare(el) !== '').map((target => getPieceFromSquare(target)));
    return targetPieces.includes('bK');
}

function wouldMoveResultCheck(fromSquare, toSquare) {
    const wouldSetup = JSON.parse(JSON.stringify(piecesSetup));
    const pieceCopy = wouldSetup[rankToIndex(fromSquare.charAt(1))][fileToIndex(fromSquare.charAt(0))];
    wouldSetup[rankToIndex(fromSquare.charAt(1))][fileToIndex(fromSquare.charAt(0))] = '';
    wouldSetup[rankToIndex(toSquare.charAt(1))][fileToIndex(toSquare.charAt(0))] = pieceCopy;

    let targets = [];
    wouldSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
        const possMoves = getPossMovesFromSquareAlt(getSquareFromIndex(index1, index2), wouldSetup);
            if (possMoves.length) {
                targets = targets.concat(possMoves);
            }
        });
    });

    const targetPieces = targets.filter(el => getPieceFromSquareAlt(el, wouldSetup) !== '').map((target => getPieceFromSquareAlt(target, wouldSetup)));
    return targetPieces.includes('wK') || targetPieces.includes('bK');
}

function wouldMoveResultWhiteCheck(fromSquare, toSquare) {
    const wouldSetup = JSON.parse(JSON.stringify(piecesSetup));
    const pieceCopy = wouldSetup[rankToIndex(fromSquare.charAt(1))][fileToIndex(fromSquare.charAt(0))];
    wouldSetup[rankToIndex(fromSquare.charAt(1))][fileToIndex(fromSquare.charAt(0))] = '';
    wouldSetup[rankToIndex(toSquare.charAt(1))][fileToIndex(toSquare.charAt(0))] = pieceCopy;

    let targets = [];
    wouldSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
        const possMoves = getPossMovesFromSquareAlt(getSquareFromIndex(index1, index2), wouldSetup);
            if (possMoves.length) {
                targets = targets.concat(possMoves);
            }
        });
    });

    const targetPieces = targets.filter(el => getPieceFromSquareAlt(el, wouldSetup) !== '').map((target => getPieceFromSquareAlt(target, wouldSetup)));
    return targetPieces.includes('wK');
}

function wouldMoveResultBlackCheck(fromSquare, toSquare) {
    const wouldSetup = JSON.parse(JSON.stringify(piecesSetup));
    const pieceCopy = wouldSetup[rankToIndex(fromSquare.charAt(1))][fileToIndex(fromSquare.charAt(0))];
    wouldSetup[rankToIndex(fromSquare.charAt(1))][fileToIndex(fromSquare.charAt(0))] = '';
    wouldSetup[rankToIndex(toSquare.charAt(1))][fileToIndex(toSquare.charAt(0))] = pieceCopy;

    let targets = [];
    wouldSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
        const possMoves = getPossMovesFromSquareAlt(getSquareFromIndex(index1, index2), wouldSetup);
            if (possMoves.length) {
                targets = targets.concat(possMoves);
            }
        });
    });

    const targetPieces = targets.filter(el => getPieceFromSquareAlt(el, wouldSetup) !== '').map((target => getPieceFromSquareAlt(target, wouldSetup)));
    return targetPieces.includes('bK');
}

function isMovePossible(fromSquare, toSquare) {
    const vars = {
        pieceFrom: getPieceFromSquare(fromSquare),
        pieceTo: getPieceFromSquare(toSquare),
        deltaRankFromTo: deltaRank(fromSquare, toSquare),
        deltaFileFromTo: deltaFile(fromSquare, toSquare),
    }

    const globalRestrictions = [
        vars.pieceTo.charAt(0) !== vars.pieceFrom.charAt(0),
    ];
    const whitePawnConditions = [
        getPieceFromSquare(getSquareFromDelta(fromSquare, -1, 0)) === '' && vars.deltaRankFromTo === -1 && vars.deltaFileFromTo === 0,
        getPieceFromSquare(getSquareFromDelta(fromSquare, -1, 0)) === '' && getPieceFromSquare(getSquareFromDelta(fromSquare, -2, 0)) === '' && vars.deltaRankFromTo === -2 && vars.deltaFileFromTo === 0 && fromSquare.charAt(1) === '2',
        getPieceFromSquare(getSquareFromDelta(fromSquare, -1, 1)).charAt(0) === 'b' && vars.deltaRankFromTo === -1 && vars.deltaFileFromTo === 1,
        getPieceFromSquare(getSquareFromDelta(fromSquare, -1, -1)).charAt(0) === 'b' && vars.deltaRankFromTo === -1 && vars.deltaFileFromTo === -1,
    ];
    const blackPawnConditions = [
        getPieceFromSquare(getSquareFromDelta(fromSquare, 1, 0)) === '' && vars.deltaRankFromTo === 1 && vars.deltaFileFromTo === 0,
        getPieceFromSquare(getSquareFromDelta(fromSquare, 1, 0)) === '' && getPieceFromSquare(getSquareFromDelta(fromSquare, 2, 0)) === '' && vars.deltaRankFromTo === 2 && vars.deltaFileFromTo === 0 && fromSquare.charAt(1) === '7',
        getPieceFromSquare(getSquareFromDelta(fromSquare, 1, 1)).charAt(0) === 'w' && vars.deltaRankFromTo === 1 && vars.deltaFileFromTo === 1,
        getPieceFromSquare(getSquareFromDelta(fromSquare, 1, -1)).charAt(0) === 'w' && vars.deltaRankFromTo === 1 && vars.deltaFileFromTo === -1,
    ];
    const bishopConditions = [
        isADiag(fromSquare, toSquare) && getPiecesFromDiag(getDiag(fromSquare, toSquare)).slice(1).every(el => el === ''),
        isADiag(fromSquare, toSquare) && getPiecesFromDiag(getDiag(fromSquare, toSquare)).slice(1, getDiag(fromSquare, toSquare).length - 1).every(el => el === '') && vars.pieceFrom.charAt(0) !== vars.pieceTo.charAt(0),
    ];
    const rookConditions = [
        isAStraightLine(fromSquare, toSquare) && getPiecesFromStraightLine(getStraightLine(fromSquare, toSquare)).slice(1) === '',
        isAStraightLine(fromSquare, toSquare) && getPiecesFromStraightLine(getStraightLine(fromSquare, toSquare)).slice(1, getStraightLine(fromSquare, toSquare).length - 1).every(el => el === '') && vars.pieceFrom.charAt(0) !== vars.pieceTo.charAt(0),
    ];
    const knightConditions = [
        vars.deltaRankFromTo === 2 && vars.deltaFileFromTo === 1,
        vars.deltaRankFromTo === -2 && vars.deltaFileFromTo === 1,
        vars.deltaFileFromTo === 2 && vars.deltaRankFromTo === 1,
        vars.deltaFileFromTo === -2 && vars.deltaRankFromTo === 1,
        vars.deltaRankFromTo === 2 && vars.deltaFileFromTo === -1,
        vars.deltaRankFromTo === -2 && vars.deltaFileFromTo === -1,
        vars.deltaFileFromTo === 2 && vars.deltaRankFromTo === -1,
        vars.deltaFileFromTo === -2 && vars.deltaRankFromTo === -1,
    ];
    const queenConditions = [
        isADiag(fromSquare, toSquare) && getPiecesFromDiag(getDiag(fromSquare, toSquare)).slice(1).every(el => el === ''),
        isADiag(fromSquare, toSquare) && getPiecesFromDiag(getDiag(fromSquare, toSquare)).slice(1, getDiag(fromSquare, toSquare).length - 1).every(el => el === '') && vars.pieceFrom.charAt(0) !== vars.pieceTo.charAt(0),    
        isAStraightLine(fromSquare, toSquare) && getPiecesFromStraightLine(getStraightLine(fromSquare, toSquare)).slice(1) === '',
        isAStraightLine(fromSquare, toSquare) && getPiecesFromStraightLine(getStraightLine(fromSquare, toSquare)).slice(1, getStraightLine(fromSquare, toSquare).length - 1).every(el => el === '') && vars.pieceFrom.charAt(0) !== vars.pieceTo.charAt(0),
    ];
    const kingConditions = [
        vars.deltaRankFromTo === 1 && vars.deltaFileFromTo === 0,
        vars.deltaRankFromTo === -1 && vars.deltaFileFromTo === 0,
        vars.deltaRankFromTo === 0 && vars.deltaFileFromTo === 1,
        vars.deltaRankFromTo === 0 && vars.deltaFileFromTo === -1,
        vars.deltaRankFromTo === 1 && vars.deltaFileFromTo === 1,
        vars.deltaRankFromTo === 1 && vars.deltaFileFromTo === -1,
        vars.deltaRankFromTo === -1 && vars.deltaFileFromTo === 1,
        vars.deltaRankFromTo === -1 && vars.deltaFileFromTo === -1,
        vars.deltaFileFromTo === 2 && vars.deltaRankFromTo === 0 && vars.pieceFrom.charAt(0) === 'w' && !squaresMovedHistory.includes('e1') && !squaresMovedHistory.includes('h1') && isSquareEmpty(getSquareFromDelta(fromSquare, 0, 1)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, 2)),
        vars.deltaFileFromTo === -2 && vars.deltaRankFromTo === 0 && vars.pieceFrom.charAt(0) === 'w' && !squaresMovedHistory.includes('e1') && !squaresMovedHistory.includes('a1') && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -1)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -2)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -3)),
        vars.deltaFileFromTo === 2 && vars.deltaRankFromTo === 0 && vars.pieceFrom.charAt(0) === 'b' && !squaresMovedHistory.includes('e8') && !squaresMovedHistory.includes('h8') && isSquareEmpty(getSquareFromDelta(fromSquare, 0, 1)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, 2)),
        vars.deltaFileFromTo === -2 && vars.deltaRankFromTo === 0 && vars.pieceFrom.charAt(0) === 'b' && !squaresMovedHistory.includes('e8') && !squaresMovedHistory.includes('a8') && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -1)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -2)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -3)),
    ];

    let isPossible;
    switch (vars.pieceFrom.charAt(1)) {
        case 'P':
            if (vars.pieceFrom.charAt(0) === 'w') {
                isPossible = whitePawnConditions.some(i => i) && globalRestrictions.every(i => i);
            } else {
                isPossible = blackPawnConditions.some(i => i) && globalRestrictions.every(i => i);
            }
            break;
        case 'B':
            isPossible = bishopConditions.some(i => i) && globalRestrictions.some(i => i);
            break;
        case 'N':
            isPossible = knightConditions.some(i => i) && globalRestrictions.some(i => i);
            break;
        case 'R':
            isPossible = rookConditions.some(i => i) && globalRestrictions.some(i => i);
            break;
        case 'Q':
            isPossible = queenConditions.some(i => i) && globalRestrictions.some(i => i);
            break;
        case 'K':
            isPossible = kingConditions.some(i => i) && globalRestrictions.some(i => i);
            break;
        default: isPossible = false;
            break;
    }
    return isPossible;
}

function isMovePossibleAlt(fromSquare, toSquare, arr) {
    const globalRestrictions = [
        getPieceFromSquareAlt(toSquare, arr).charAt(0) !== getPieceFromSquareAlt(fromSquare, arr).charAt(0),
    ];
    const whitePawnConditions = [
        getPieceFromSquareAlt(getSquareFromDelta(fromSquare, -1, 0), arr) === '' && deltaRank(fromSquare, toSquare) === -1 && deltaFile(fromSquare, toSquare) === 0,
        getPieceFromSquareAlt(getSquareFromDelta(fromSquare, -1, 0), arr) === '' && getPieceFromSquareAlt(getSquareFromDelta(fromSquare, -2, 0), arr) === '' && deltaRank(fromSquare, toSquare) === -2 && deltaFile(fromSquare, toSquare) === 0 && fromSquare.charAt(1) === '2',
        getPieceFromSquareAlt(getSquareFromDelta(fromSquare, -1, 1), arr).charAt(0) === 'b' && deltaRank(fromSquare, toSquare) === -1 && deltaFile(fromSquare, toSquare) === 1,
        getPieceFromSquareAlt(getSquareFromDelta(fromSquare, -1, -1), arr).charAt(0) === 'b' && deltaRank(fromSquare, toSquare) === -1 && deltaFile(fromSquare, toSquare) === -1,
    ];
    const blackPawnConditions = [
        getPieceFromSquareAlt(getSquareFromDelta(fromSquare, 1, 0), arr) === '' && deltaRank(fromSquare, toSquare) === 1 && deltaFile(fromSquare, toSquare) === 0,
        getPieceFromSquareAlt(getSquareFromDelta(fromSquare, 1, 0), arr) === '' && getPieceFromSquareAlt(getSquareFromDelta(fromSquare, 2, 0), arr) === '' && deltaRank(fromSquare, toSquare) === 2 && deltaFile(fromSquare, toSquare) === 0 && fromSquare.charAt(1) === '7',
        getPieceFromSquareAlt(getSquareFromDelta(fromSquare, 1, 1), arr).charAt(0) === 'w' && deltaRank(fromSquare, toSquare) === 1 && deltaFile(fromSquare, toSquare) === 1,
        getPieceFromSquareAlt(getSquareFromDelta(fromSquare, 1, -1), arr).charAt(0) === 'w' && deltaRank(fromSquare, toSquare) === 1 && deltaFile(fromSquare, toSquare) === -1,
    ];
    const bishopConditions = [
        isADiag(fromSquare, toSquare) && getPiecesFromDiagAlt(getDiag(fromSquare, toSquare), arr).slice(1).every(el => el === ''),
        isADiag(fromSquare, toSquare) && getPiecesFromDiagAlt(getDiag(fromSquare, toSquare), arr).slice(1, getDiag(fromSquare, toSquare).length - 1).every(el => el === '') && getPieceFromSquareAlt(fromSquare, arr).charAt(0) !== getPieceFromSquareAlt(toSquare, arr).charAt(0),
    ];
    const rookConditions = [
        isAStraightLine(fromSquare, toSquare) && getPiecesFromStraightLineAlt(getStraightLine(fromSquare, toSquare), arr).slice(1) === '',
        isAStraightLine(fromSquare, toSquare) && getPiecesFromStraightLineAlt(getStraightLine(fromSquare, toSquare), arr).slice(1, getStraightLine(fromSquare, toSquare).length - 1).every(el => el === '') && getPieceFromSquareAlt(fromSquare, arr).charAt(0) !== getPieceFromSquareAlt(toSquare, arr).charAt(0),
    ];
    const knightConditions = [
        deltaRank(fromSquare, toSquare) === 2 && deltaFile(fromSquare, toSquare) === 1,
        deltaRank(fromSquare, toSquare) === -2 && deltaFile(fromSquare, toSquare) === 1,
        deltaFile(fromSquare, toSquare) === 2 && deltaRank(fromSquare, toSquare) === 1,
        deltaFile(fromSquare, toSquare) === -2 && deltaRank(fromSquare, toSquare) === 1,
        deltaRank(fromSquare, toSquare) === 2 && deltaFile(fromSquare, toSquare) === -1,
        deltaRank(fromSquare, toSquare) === -2 && deltaFile(fromSquare, toSquare) === -1,
        deltaFile(fromSquare, toSquare) === 2 && deltaRank(fromSquare, toSquare) === -1,
        deltaFile(fromSquare, toSquare) === -2 && deltaRank(fromSquare, toSquare) === -1,
    ];
    const queenConditions = [
        isADiag(fromSquare, toSquare) && getPiecesFromDiagAlt(getDiag(fromSquare, toSquare), arr).slice(1).every(el => el === ''),
        isADiag(fromSquare, toSquare) && getPiecesFromDiagAlt(getDiag(fromSquare, toSquare), arr).slice(1, getDiag(fromSquare, toSquare).length - 1).every(el => el === '') && getPieceFromSquareAlt(fromSquare, arr).charAt(0) !== getPieceFromSquareAlt(toSquare, arr).charAt(0),    
        isAStraightLine(fromSquare, toSquare) && getPiecesFromStraightLineAlt(getStraightLine(fromSquare, toSquare), arr).slice(1) === '',
        isAStraightLine(fromSquare, toSquare) && getPiecesFromStraightLineAlt(getStraightLine(fromSquare, toSquare), arr).slice(1, getStraightLine(fromSquare, toSquare).length - 1).every(el => el === '') && getPieceFromSquareAlt(fromSquare, arr).charAt(0) !== getPieceFromSquareAlt(toSquare, arr).charAt(0),
    ];
    const kingConditions = [
        deltaRank(fromSquare, toSquare) === 1 && deltaFile(fromSquare, toSquare) === 0,
        deltaRank(fromSquare, toSquare) === -1 && deltaFile(fromSquare, toSquare) === 0,
        deltaRank(fromSquare, toSquare) === 0 && deltaFile(fromSquare, toSquare) === 1,
        deltaRank(fromSquare, toSquare) === 0 && deltaFile(fromSquare, toSquare) === -1,
        deltaRank(fromSquare, toSquare) === 1 && deltaFile(fromSquare, toSquare) === 1,
        deltaRank(fromSquare, toSquare) === 1 && deltaFile(fromSquare, toSquare) === -1,
        deltaRank(fromSquare, toSquare) === -1 && deltaFile(fromSquare, toSquare) === 1,
        deltaRank(fromSquare, toSquare) === -1 && deltaFile(fromSquare, toSquare) === -1,
        deltaFile(fromSquare, toSquare) === 2 && deltaRank(fromSquare, toSquare) === 0 && getPieceFromSquareAlt(fromSquare, arr).charAt(0) === 'w' && !squaresMovedHistory.includes('e1') && !squaresMovedHistory.includes('h1') && isSquareEmpty(getSquareFromDelta(fromSquare, 0, 1)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, 2)),
        deltaFile(fromSquare, toSquare) === -2 && deltaRank(fromSquare, toSquare) === 0 && getPieceFromSquareAlt(fromSquare, arr).charAt(0) === 'w' && !squaresMovedHistory.includes('e1') && !squaresMovedHistory.includes('a1') && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -1)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -2)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -3)),
        deltaFile(fromSquare, toSquare) === 2 && deltaRank(fromSquare, toSquare) === 0 && getPieceFromSquareAlt(fromSquare, arr).charAt(0) === 'b' && !squaresMovedHistory.includes('e8') && !squaresMovedHistory.includes('h8') && isSquareEmpty(getSquareFromDelta(fromSquare, 0, 1)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, 2)),
        deltaFile(fromSquare, toSquare) === -2 && deltaRank(fromSquare, toSquare) === 0 && getPieceFromSquareAlt(fromSquare, arr).charAt(0) === 'b' && !squaresMovedHistory.includes('e8') && !squaresMovedHistory.includes('a8') && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -1)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -2)) && isSquareEmpty(getSquareFromDelta(fromSquare, 0, -3)),
    ];

    let isPossible;
    switch (getPieceFromSquareAlt(fromSquare, arr).charAt(1)) {
        case 'P':
            if (getPieceFromSquareAlt(fromSquare, arr).charAt(0) === 'w') {
                isPossible = whitePawnConditions.some(i => i) && globalRestrictions.every(i => i) ? true : false;
            } else {
                isPossible = blackPawnConditions.some(i => i) && globalRestrictions.every(i => i) ? true : false;
            }
            break;
        case 'B':
            isPossible = bishopConditions.some(i => i) && globalRestrictions.some(i => i)  ? true : false;
            break;
        case 'N':
            isPossible = knightConditions.some(i => i) && globalRestrictions.some(i => i) ? true : false;
            break;
        case 'R':
            isPossible = rookConditions.some(i => i) && globalRestrictions.some(i => i) ? true : false;
            break;
        case 'Q':
            isPossible = queenConditions.some(i => i) && globalRestrictions.some(i => i) ? true : false;
            break;
        case 'K':
            isPossible = kingConditions.some(i => i) && globalRestrictions.some(i => i) ? true : false;
            break;
        default: isPossible = false;
            break;
    }
    return isPossible;
}

function isMoveLegal(fromSquare, toSquare) {
    if (getPieceFromSquare(fromSquare).charAt(0) === 'w') {
        const wouldMoveBeCheck = wouldMoveResultWhiteCheck(fromSquare, toSquare);
        if (turn === 'white') {
            if (wouldMoveBeCheck) {
                return false;
            } else if (!isWhiteInCheck() || !wouldMoveBeCheck) {
                return true;
            }
        } else return false;
    }
    if (getPieceFromSquare(fromSquare).charAt(0) === 'b') {
        if (turn === 'black') {
            const wouldMoveBeCheck = wouldMoveResultBlackCheck(fromSquare, toSquare);
            if (wouldMoveBeCheck) {
                return false;
            } else if (!isBlackInCheck() || !wouldMoveBeCheck) {
                return true;
            }
        } else return false;
    }
}

function getWhiteMoves() {
    let moves = [];
    piecesSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
        const possMoves = getPossMovesFromSquare(getSquareFromIndex(index1, index2));
            if (possMoves.length && getPieceFromSquare(getSquareFromIndex(index1, index2)).charAt(0) === 'w') {
                possMoves.forEach(toSquare => {
                    if (isMoveLegal(getSquareFromIndex(index1, index2), toSquare))
                        moves = moves.concat(toSquare);
                });
            }
        });
    });

    return moves;
}

function getBlackMoves() {
    let moves = [];
    piecesSetup.forEach((el, index1) => {
        el.forEach((_, index2) => {
            const possMoves = getPossMovesFromSquare(getSquareFromIndex(index1, index2));
            if (possMoves.length && getPieceFromSquare(getSquareFromIndex(index1, index2)).charAt(0) === 'b') {
                possMoves.forEach(toSquare => {
                    if (isMoveLegal(getSquareFromIndex(index1, index2), toSquare))
                        moves = moves.concat(toSquare);
                });
            }
        });
    });

    return moves;
}

function openPromModal(x, y, color) {
    isModalOpen = true;
    const modal = new PromotionModal(x, y, color);
    modals.push(modal);
}

function promotePawn() {
    modals.forEach(el => {
        if (mouse.x > el.x && mouse.x < el.x + el.width && mouse.y > el.y && mouse.y < el.y + el.height) {
            if (mouse.y < el.y + el.size) {
                piecesSetup[rankToIndex(squareReleased.charAt(1))][fileToIndex(squareReleased.charAt(0))] = `${el.color.slice(0, 1)}Q`;
                modals.splice(0);
                isModalOpen = false;
            } else if (mouse.y < el.y + el.size * 2) {
                piecesSetup[rankToIndex(squareReleased.charAt(1))][fileToIndex(squareReleased.charAt(0))] = `${el.color.slice(0, 1)}R`;
                modals.splice(0);
                isModalOpen = false;
            } else if (mouse.y < el.y + el.size * 3) {
                piecesSetup[rankToIndex(squareReleased.charAt(1))][fileToIndex(squareReleased.charAt(0))] = `${el.color.slice(0, 1)}B`;
                modals.splice(0);
                isModalOpen = false;
            } else if (mouse.y < el.y + el.size * 4) {
                piecesSetup[rankToIndex(squareReleased.charAt(1))][fileToIndex(squareReleased.charAt(0))] = `${el.color.slice(0, 1)}N`;
                modals.splice(0);
                isModalOpen = false;
            }
        }
    });
}

function hardRewriteSetup(rank, file, value) {
    piecesSetup[rank][file] = value;
}

function getSquaresFromPieces(piece) {
    // returns an array
    const squares = [];
    piecesSetup.forEach((rank, index) => {
        rank.forEach((_, index2) => {
            const square = getSquareFromIndex(index, index2);
            if (getPieceFromSquare(square) === piece) {
                squares.push(square);
            }
        });
    });

    return squares;
}

function getMoveNotation(fromSquare, toSquare) {
    const piece = getPieceFromSquare(fromSquare);
    const pieceNotation = piece.charAt(1);
    const takes = getPieceFromSquare(toSquare) !== '';
    let differentiator = '';
    const check = wouldMoveResultCheck(fromSquare, toSquare);

    if (pieceNotation === 'N' || pieceNotation === 'R') {
        const otherSquare = getSquaresFromPieces(piece).find(el => el !== fromSquare);
        if (otherSquare && isMovePossible(otherSquare, toSquare)) {
            differentiator = fromSquare.charAt(0) === otherSquare.charAt(0) ? fromSquare.charAt(1) : fromSquare.charAt(0);
        }
    }

    return `${pieceNotation !== 'P' ? pieceNotation : ''}${pieceNotation === 'P' && takes ? fromSquare.charAt(0) : ''}${differentiator}${takes ? 'x' : ''}${toSquare}${check ? '+' : ''}`;
}

function displayWhiteMove() {
    currMoveSpan = document.createElement('span');
    currMoveSpan.id = `move-${move}`;
    currMoveSpan.classList.add('move-span');
    currMoveSpan.textContent = move + '. ';
    const whiteMoveSpan = document.createElement('span');
    whiteMoveSpan.id = `move-total-${moveTotal + 1}`;
    whiteMoveSpan.classList.add('white-span');
    whiteMoveSpan.textContent = moveHistory[moveTotal].notation;
    currMoveSpan.appendChild(whiteMoveSpan);
    moveListUi.appendChild(currMoveSpan);
}

function displayBlackMove() {
    const blackMoveSpan = document.createElement('span');
    blackMoveSpan.id = `move-total-${moveTotal}`;
    blackMoveSpan.classList.add('black-span');
    blackMoveSpan.textContent = moveHistory[moveTotal].notation;
    currMoveSpan.appendChild(blackMoveSpan);
}

function displayTime() {
    const whiteMinutes = Math.floor(whiteTime / 600);
    const whiteSeconds = Math.floor((whiteTime % 600) / 10);
    const whiteSecondsZero = whiteSeconds < 10 ? '0' : '';
    whiteTimeUI.textContent = whiteMinutes + ':' + whiteSecondsZero + whiteSeconds;
    
    const blackMinutes = Math.floor(blackTime / 600);
    const blackSeconds = Math.floor((blackTime % 600) / 10);
    const blackSecondsZero = blackSeconds < 10 ? '0' : '';
    blackTimeUI.textContent = blackMinutes + ':' + blackSecondsZero + blackSeconds;
}

function getAudio(file) {
    const sound = new Audio();
    sound.src = `./audio/${file}`;
    return sound;
}
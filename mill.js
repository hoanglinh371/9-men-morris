/** Enum with the different possible AIs */
var GameAI;
/** Enum with the different possible AIs */
(function (GameAI) {
    GameAI[GameAI["Human"] = 0] = "Human";
    GameAI[GameAI["Random"] = 1] = "Random";
    GameAI[GameAI["Easy"] = 2] = "Easy";
    GameAI[GameAI["Medium"] = 3] = "Medium";
    GameAI[GameAI["Strong"] = 4] = "Strong";
})(GameAI || (GameAI = {}));
var gameMenu;
var gameBoard;
var winnerScreen;
var winnerScreenText;
var footer;
function onLoad() {
    gameMenu = document.getElementById("gameMenu");
    gameBoard = document.getElementById("gameBoard");
    winnerScreen = document.getElementById("winnerScreen");
    winnerScreenText = (document.getElementById("winnerScreenText"));
    footer = document
        .getElementsByTagName("footer")[0]
        .getElementsByTagName("p")[0];
    Game.Reset();
    window.onclick = function (event) {
        if (!event.target.matches(".dropbtn")) {
            var dropdowns = document.getElementsByClassName("dropdown-content");
            for (var i = 0; i < dropdowns.length; i++)
                dropdowns[i].classList.remove("show");
        }
    };
}
/*

0  -  -  -  -  -  1  -  -  -  -  -  2
|                 |                 |
|     3  -  -  -  4  -  -  -  5     |
|     |           |           |     |
|     |     6  -  7  -  8     |     |
|     |     |           |     |     |
9  -  10 -  11          12 -  13 -  14
|     |     |           |     |     |
|     |     15 -  16 -  17    |     |
|     |           |           |     |
|     18 -  -  -  19 -  -  -  20    |
|                 |                 |
21 -  -  -  -  -  22 -  -  -  -  -  23

*/
var GameNode = /** @class */ (function () {
    function GameNode() {
        this.stones = [new Array(24), new Array(24)];
    }
    GameNode.prototype.Clone = function () {
        var node = new GameNode();
        // need to copy stones different as it is otherwise only referenced
        node.stones = [this.stones[0].slice(0), this.stones[1].slice(0)];
        node.currentPlayer = this.currentPlayer;
        node.gameTurn = this.gameTurn;
        node.gamePhase = this.gamePhase;
        return node;
    };
    /**
     * Creates a GameNode with state of the current game board.
     * @returns {GameNode} the current game board state.
     */
    GameNode.GetFromCurrentBoard = function () {
        var node = new GameNode();
        node.currentPlayer = Game.currentPlayer;
        node.gameTurn = Game.turn;
        node.gamePhase = Game.phase;
        GameBoard.gameFields.forEach(function (f, i) {
            if (f.owner)
                node.stones[f.owner.color][i] = true;
        });
        return node;
    };
    /**
     * Determines if a field is occupied.
     * @param {number} field The field to check.
     * @returns {boolean} if there is a stone on the given field.
     */
    GameNode.prototype.FieldIsOccupied = function (field) {
        return (this.stones[1 /* StoneColor.White */][field] ||
            this.stones[0 /* StoneColor.Black */][field]);
    };
    /**
     * Get neighbor fields of a specific field.
     * @param {number} fieldnum Field number to determine the neighbors of.
     * @returns {Array<number>} all neighbors of the given field.
     */
    GameNode.GetNeighbors = function (fieldnum) {
        var arr = new Array();
        if (GameNode.neighborLeft[fieldnum] != null)
            arr.push(GameNode.neighborLeft[fieldnum]);
        if (GameNode.neighborRight[fieldnum] != null)
            arr.push(GameNode.neighborRight[fieldnum]);
        if (GameNode.neighborTop[fieldnum] != null)
            arr.push(GameNode.neighborTop[fieldnum]);
        if (GameNode.neighborBottom[fieldnum] != null)
            arr.push(GameNode.neighborBottom[fieldnum]);
        return arr;
    };
    /**
     * Get list of all possible moves at the current game state.
     * @returns {Array<GameMove>} all possible moves.
     */
    GameNode.prototype.GetPossibleMoves = function () {
        var arr = new Array();
        if (this.GetWinner() != null)
            return arr; // game ended -> no more moves
        switch (this.gamePhase) {
            case 1 /* GamePhase.PlacingStones */:
                for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
                    // check if field has already stone on it
                    if (this.FieldIsOccupied(fieldNum))
                        continue;
                    arr.push({ phase: this.gamePhase, from: null, to: fieldNum });
                }
                break;
            case 2 /* GamePhase.MovingStones */:
                for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
                    // current player needs a stone on the field
                    if (!this.stones[this.currentPlayer][fieldNum])
                        continue;
                    // if only 3 stones left player can move to any free spot
                    if (this.stones[this.currentPlayer].filter(function (b) { return b; }).length <= 3) {
                        for (var fieldNumTo = 0; fieldNumTo < 24; fieldNumTo++) {
                            // sort out all fields with stones on them
                            if (this.FieldIsOccupied(fieldNumTo))
                                continue;
                            arr.push({
                                phase: this.gamePhase,
                                from: fieldNum,
                                to: fieldNumTo,
                            });
                        }
                    }
                    else {
                        // more than 3 stones so only take free neighbors into account
                        for (var _i = 0, _a = GameNode.GetNeighbors(fieldNum); _i < _a.length; _i++) {
                            var neighbor = _a[_i];
                            if (this.FieldIsOccupied(neighbor))
                                continue;
                            arr.push({ phase: this.gamePhase, from: fieldNum, to: neighbor });
                        }
                    }
                }
                break;
            case 3 /* GamePhase.RemovingStone */:
                for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
                    // enemy needs a stone on the field
                    if (!this.stones[1 - this.currentPlayer][fieldNum])
                        continue;
                    // cannot delete stone in mill
                    if (this.CheckMill(fieldNum))
                        continue;
                    arr.push({ phase: this.gamePhase, from: fieldNum, to: null });
                }
                break;
        }
        return arr;
    };
    GameNode.prototype.PerformMove = function (move) {
        if (move.phase != this.gamePhase) {
            console.error("[AI] move not fitting to current game phase.");
            return false;
        }
        if (this.GetWinner() != null) {
            console.error("[AI] game already ended so no more moves possible.");
            return false;
        }
        switch (this.gamePhase) {
            case 1 /* GamePhase.PlacingStones */:
                // check if move has right format and field where to go is empty
                if (move.from != null ||
                    move.to == null ||
                    this.FieldIsOccupied(move.to)) {
                    console.error("[AI] game move has wrong values");
                    return false;
                }
                this.stones[this.currentPlayer][move.to] = true;
                this.IncrementAndUpdate(move.to);
                break;
            case 2 /* GamePhase.MovingStones */:
                // check format and if there is a stone that can be moved onto an empty field
                if (move.from == null ||
                    move.to == null ||
                    this.FieldIsOccupied(move.to) ||
                    !this.stones[this.currentPlayer][move.from]) {
                    console.error("[AI] game move has wrong values");
                    return false;
                }
                this.stones[this.currentPlayer][move.from] = false;
                this.stones[this.currentPlayer][move.to] = true;
                this.IncrementAndUpdate(move.to);
                break;
            case 3 /* GamePhase.RemovingStone */:
                // check format and if there is an enemy stone that is not in a mill and can be removed
                if (move.from == null ||
                    move.to != null ||
                    !this.stones[1 - this.currentPlayer][move.from] ||
                    this.CheckMill(move.from)) {
                    console.error("[AI] game move has wrong values");
                    return false;
                }
                this.stones[1 - this.currentPlayer][move.from] = false;
                this.IncrementAndUpdate(move.from);
                break;
            default:
                console.error("[AI] Move in game phase ".concat(move.phase, " could not be performed."));
                return false;
        }
        return true;
    };
    GameNode.prototype.UndoMove = function (move) {
        // if a stone should be removed right now the current player closed a mill in the last turn
        // and so no players were switched
        var lastPlayer = this.gamePhase == 3 ? this.currentPlayer : 1 - this.currentPlayer;
        switch (move.phase) {
            case 1 /* GamePhase.PlacingStones */:
                // check format and if there is a stone that can be unplaced
                if (move.from != null ||
                    move.to == null ||
                    !this.stones[lastPlayer][move.to]) {
                    console.error("[AI] Move cannot be undone, wrong format. (1)");
                    return false;
                }
                this.stones[lastPlayer][move.to] = false;
                break;
            case 2 /* GamePhase.MovingStones */:
                // check format and if stone can moved back
                if (move.from == null ||
                    move.to == null ||
                    !this.stones[lastPlayer][move.to] ||
                    this.FieldIsOccupied(move.from)) {
                    console.error("[AI] Move cannot be undone, wrong format. (2)");
                    return false;
                }
                this.stones[lastPlayer][move.from] = true;
                this.stones[lastPlayer][move.to] = false;
                break;
            case 3 /* GamePhase.RemovingStone */:
                // check format and if there is no stone were it was removed
                if (move.from == null ||
                    move.to != null ||
                    this.FieldIsOccupied(move.from)) {
                    console.error("[AI] Move cannot be undone, wrong format. (3)");
                    return false;
                }
                this.stones[1 - lastPlayer][move.from] = true;
                break;
            default:
                console.error("[AI] Move in game phase ".concat(move.phase, " could not be undone."));
                return false;
        }
        // otherwise last game state was closing a mill -> no game turn decrement or player switch
        if (this.gamePhase != 3 /* GamePhase.RemovingStone */)
            this.gameTurn--;
        this.currentPlayer = lastPlayer;
        this.gamePhase = move.phase;
        return true;
    };
    GameNode.prototype.IncrementAndUpdate = function (field) {
        var _this = this;
        // check if mill was closed and enemy has any stones to remove or only 3 stones left
        if (this.gamePhase != 3 /* GamePhase.RemovingStone */ &&
            this.CheckMill(field) &&
            (this.stones[1 - this.currentPlayer].some(function (b, fieldNum) { return b && !_this.CheckMill(fieldNum); }) ||
                this.stones[1 - this.currentPlayer].filter(function (b) { return b; }).length <= 3)) {
            this.gamePhase = 3 /* GamePhase.RemovingStone */;
            // no game turn increment / player switch
            return;
        }
        // update game state information
        this.gamePhase =
            this.gameTurn < 17 ? 1 /* GamePhase.PlacingStones */ : 2 /* GamePhase.MovingStones */;
        this.gameTurn++;
        this.currentPlayer = 1 - this.currentPlayer;
    };
    GameNode.prototype.CheckMillHorizontal = function (field) {
        var color;
        if (this.stones[0 /* StoneColor.Black */][field])
            color = 0 /* StoneColor.Black */;
        else if (this.stones[1 /* StoneColor.White */][field])
            color = 1 /* StoneColor.White */;
        else
            return false; // no stone on field
        if (GameNode.neighborLeft[field] != null &&
            GameNode.neighborRight[field] != null)
            // OXO <- field in center
            return (this.stones[color][GameNode.neighborLeft[field]] &&
                this.stones[color][GameNode.neighborRight[field]]);
        if (GameNode.neighborLeft[field] != null &&
            GameNode.neighborLeft[GameNode.neighborLeft[field]] != null)
            // OOX <- field on right
            return (this.stones[color][GameNode.neighborLeft[field]] &&
                this.stones[color][GameNode.neighborLeft[GameNode.neighborLeft[field]]]);
        if (GameNode.neighborRight[field] != null &&
            GameNode.neighborRight[GameNode.neighborRight[field]] != null)
            // XOO <- field on left
            return (this.stones[color][GameNode.neighborRight[field]] &&
                this.stones[color][GameNode.neighborRight[GameNode.neighborRight[field]]]);
        return false;
    };
    GameNode.prototype.CheckMillVertical = function (field) {
        var color;
        if (this.stones[0 /* StoneColor.Black */][field])
            color = 0 /* StoneColor.Black */;
        else if (this.stones[1 /* StoneColor.White */][field])
            color = 1 /* StoneColor.White */;
        else
            return false; // no stone on field
        if (GameNode.neighborTop[field] != null &&
            GameNode.neighborBottom[field] != null)
            // OXO <- field in middle
            return (this.stones[color][GameNode.neighborTop[field]] &&
                this.stones[color][GameNode.neighborBottom[field]]);
        if (GameNode.neighborTop[field] != null &&
            GameNode.neighborTop[GameNode.neighborTop[field]] != null)
            // OOX <- field on bottom
            return (this.stones[color][GameNode.neighborTop[field]] &&
                this.stones[color][GameNode.neighborTop[GameNode.neighborTop[field]]]);
        if (GameNode.neighborBottom[field] != null &&
            GameNode.neighborBottom[GameNode.neighborBottom[field]] != null)
            // XOO <- field on top
            return (this.stones[color][GameNode.neighborBottom[field]] &&
                this.stones[color][GameNode.neighborBottom[GameNode.neighborBottom[field]]]);
        return false;
    };
    GameNode.prototype.CheckMill = function (field) {
        return this.CheckMillHorizontal(field) || this.CheckMillVertical(field);
    };
    GameNode.prototype.GetWinner = function () {
        var _this = this;
        // check if mill was closed and enemy has only 3 stones left
        if (this.gamePhase == 3 /* GamePhase.RemovingStone */ &&
            this.gameTurn > 17 &&
            this.stones[1 - this.currentPlayer].filter(function (b) { return b; }).length <= 3)
            return this.currentPlayer;
        if (this.gamePhase == 2 /* GamePhase.MovingStones */) {
            if (this.stones[this.currentPlayer].filter(function (b) { return b; }).length <= 3)
                return null; // player can jump
            // check if there are moveable stones left
            for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
                // only look at fields where the current player has a stone
                if (!this.stones[this.currentPlayer][fieldNum])
                    continue;
                // check if some neighbor field are unoccupied
                if (GameNode.GetNeighbors(fieldNum).some(function (n) { return !_this.FieldIsOccupied(n); }))
                    return null; // move possible
            }
            // if we have not returned yet no possible move was found
            // -> the other player wins
            return 1 - this.currentPlayer;
        }
        return null;
    };
    GameNode.prototype.GetRating = function (color) {
        // mill closed for currentPlayer
        var criteria1 = this.gamePhase == 3 /* GamePhase.RemovingStone */ ? 1 : 0;
        // difference mills
        var criteria2 = this.NumberOfMills(this.currentPlayer) -
            this.NumberOfMills(1 - this.currentPlayer);
        // difference between blocked stones
        var criteria3 = this.NumberOfBlockedStones(1 - this.currentPlayer) -
            this.NumberOfBlockedStones(this.currentPlayer);
        // difference between number of stones
        var criteria4 = this.stones[this.currentPlayer].filter(function (b) { return b; }).length -
            this.stones[1 - this.currentPlayer].filter(function (b) { return b; }).length;
        // difference between number of 2-piece configurations
        var criteria5 = this.NumberOfTwoPieceConfs(this.currentPlayer) -
            this.NumberOfTwoPieceConfs(1 - this.currentPlayer);
        // difference between number of 3-piece configurations
        var criteria6 = this.NumberOfThreePieceConfs(this.currentPlayer) -
            this.NumberOfThreePieceConfs(1 - this.currentPlayer);
        // difference between number of open double mills
        var criteria7 = this.NumberOfOpenDoubleMills(this.currentPlayer) -
            this.NumberOfOpenDoubleMills(1 - this.currentPlayer);
        // difference between number of open mills
        var criteria8 = this.NumberOfOpenMills(this.currentPlayer) -
            this.NumberOfOpenMills(1 - this.currentPlayer);
        // winning configurations
        var winner = this.GetWinner();
        var criteria9 = winner == null ? 0 : winner == this.currentPlayer ? 1 : -1;
        var rating = 0;
        if (this.gamePhase == 1 /* GamePhase.PlacingStones */ ||
            (this.gamePhase == 3 /* GamePhase.RemovingStone */ && this.gameTurn < 18)) {
            // while placing stones
            rating =
                100 * criteria1 +
                    26 * criteria2 +
                    30 * criteria3 +
                    9 * criteria4 +
                    10 * criteria5 +
                    7 * criteria6;
        }
        else if (this.gamePhase == 2 /* GamePhase.MovingStones */ ||
            (this.gamePhase == 3 /* GamePhase.RemovingStone */ && this.gameTurn >= 18)) {
            // stones are moving
            rating =
                500 * criteria1 +
                    43 * criteria2 +
                    30 * criteria3 +
                    11 * criteria4 +
                    1000 * criteria7 +
                    500 * criteria8 +
                    500000 * criteria9;
        }
        if (this.gameTurn >= 18 &&
            this.stones.some(function (a) { return a.filter(function (b) { return b; }).length <= 3; })) {
            // one player has only 3 stones left
            rating += 100 * criteria5 + 500 * criteria6;
        }
        // switch sign depending on the player
        rating *= color == this.currentPlayer ? 1 : -1;
        return rating;
    };
    GameNode.prototype.NumberOfTwoPieceConfs = function (player) {
        var count = 0;
        for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
            // if stone on field move on
            if (this.FieldIsOccupied(fieldNum))
                continue;
            // set stone on field temporarily
            this.stones[player][fieldNum] = true;
            // check if this caused one or two mills to be created
            if (this.CheckMillHorizontal(fieldNum))
                count++;
            if (this.CheckMillVertical(fieldNum))
                count++;
            // remove stone again
            this.stones[player][fieldNum] = false;
        }
        return count;
    };
    GameNode.prototype.NumberOfThreePieceConfs = function (player) {
        var count = 0;
        for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
            if (this.FieldIsOccupied(fieldNum))
                continue;
            this.stones[player][fieldNum] = true;
            if (this.CheckMillHorizontal(fieldNum)) {
                // check if one of the placedstones can lead to a vertical mill
                // first get the other stones involved in the horizontal mill
                var placedStones = new Array(2);
                if (GameNode.neighborLeft[fieldNum] != null) {
                    placedStones.push(GameNode.neighborLeft[fieldNum]);
                    if (GameNode.neighborLeft[GameNode.neighborLeft[fieldNum]] != null)
                        placedStones.push(GameNode.neighborLeft[GameNode.neighborLeft[fieldNum]]);
                    else if (GameNode.neighborRight[fieldNum] != null)
                        placedStones.push(GameNode.neighborRight[fieldNum]);
                }
                else if (GameNode.neighborRight[fieldNum] != null) {
                    placedStones.push(GameNode.neighborRight[fieldNum]);
                    if (GameNode.neighborRight[GameNode.neighborRight[fieldNum]] != null)
                        placedStones.push(GameNode.neighborRight[GameNode.neighborRight[fieldNum]]);
                }
                // then check if these may result in a vertical mill (one stone placed, the other field empty)
                for (var _i = 0, placedStones_1 = placedStones; _i < placedStones_1.length; _i++) {
                    var j = placedStones_1[_i];
                    if (GameNode.neighborTop[j] != null) {
                        if (GameNode.neighborTop[GameNode.neighborTop[j]] != null) {
                            if ((this.stones[player][GameNode.neighborTop[GameNode.neighborTop[j]]] &&
                                !this.FieldIsOccupied(GameNode.neighborTop[j])) ||
                                (!this.FieldIsOccupied(GameNode.neighborTop[GameNode.neighborTop[j]]) &&
                                    this.stones[player][GameNode.neighborTop[j]])) {
                                count++;
                                break;
                            }
                        }
                        else if (GameNode.neighborBottom[j] != null) {
                            if ((this.stones[player][GameNode.neighborTop[j]] &&
                                !this.FieldIsOccupied(GameNode.neighborBottom[j])) ||
                                (!this.FieldIsOccupied(GameNode.neighborTop[j]) &&
                                    this.stones[player][GameNode.neighborBottom[j]])) {
                                count++;
                                break;
                            }
                        }
                    }
                    else if (GameNode.neighborBottom[j] != null &&
                        GameNode.neighborBottom[GameNode.neighborBottom[j]] != null) {
                        if ((this.stones[player][GameNode.neighborBottom[GameNode.neighborBottom[j]]] &&
                            !this.FieldIsOccupied(GameNode.neighborBottom[j])) ||
                            (!this.FieldIsOccupied(GameNode.neighborBottom[GameNode.neighborBottom[j]]) &&
                                this.stones[player][GameNode.neighborBottom[j]])) {
                            count++;
                            break;
                        }
                    }
                }
            }
            // do the same if the stone was in a vertical mill
            if (this.CheckMillVertical(fieldNum)) {
                // check if one of the placedstones can lead to a horizontal mill
                var placedStones = new Array(2);
                if (GameNode.neighborTop[fieldNum] != null) {
                    placedStones.push(GameNode.neighborTop[fieldNum]);
                    if (GameNode.neighborTop[GameNode.neighborTop[fieldNum]] != null)
                        placedStones.push(GameNode.neighborTop[GameNode.neighborTop[fieldNum]]);
                    else if (GameNode.neighborBottom[fieldNum] != null)
                        placedStones.push(GameNode.neighborBottom[fieldNum]);
                }
                else if (GameNode.neighborBottom[fieldNum] != null) {
                    placedStones.push(GameNode.neighborBottom[fieldNum]);
                    if (GameNode.neighborBottom[GameNode.neighborBottom[fieldNum]] != null)
                        placedStones.push(GameNode.neighborBottom[GameNode.neighborBottom[fieldNum]]);
                }
                for (var _a = 0, placedStones_2 = placedStones; _a < placedStones_2.length; _a++) {
                    var j = placedStones_2[_a];
                    if (GameNode.neighborLeft[j] != null) {
                        if (GameNode.neighborLeft[GameNode.neighborLeft[j]] != null) {
                            if ((this.stones[player][GameNode.neighborLeft[GameNode.neighborLeft[j]]] &&
                                !this.FieldIsOccupied(GameNode.neighborLeft[j])) ||
                                (!this.FieldIsOccupied(GameNode.neighborLeft[GameNode.neighborLeft[j]]) &&
                                    this.stones[player][GameNode.neighborLeft[j]])) {
                                count++;
                                break;
                            }
                        }
                        else if (GameNode.neighborRight[j] != null) {
                            if ((this.stones[player][GameNode.neighborLeft[j]] &&
                                !this.FieldIsOccupied(GameNode.neighborRight[j])) ||
                                (!this.FieldIsOccupied(GameNode.neighborLeft[j]) &&
                                    this.stones[player][GameNode.neighborRight[j]])) {
                                count++;
                                break;
                            }
                        }
                    }
                    else if (GameNode.neighborRight[j] != null &&
                        GameNode.neighborRight[GameNode.neighborRight[j]] != null) {
                        if ((this.stones[player][GameNode.neighborRight[GameNode.neighborRight[j]]] &&
                            !this.FieldIsOccupied(GameNode.neighborRight[j])) ||
                            (!this.FieldIsOccupied(GameNode.neighborRight[GameNode.neighborRight[j]]) &&
                                this.stones[player][GameNode.neighborRight[j]])) {
                            count++;
                            break;
                        }
                    }
                }
            }
            this.stones[player][fieldNum] = false;
        }
        // as there are two possibilities to close a mill
        // all three piece confs have been counted two times
        return count / 2;
    };
    GameNode.prototype.NumberOfMills = function (player) {
        // as we check all stones each mill would have counted three times
        // but two mills that share a stone would count as 5 stones
        // so we cannot divide by 3 in the end. Thus it will be saved if
        // a certain field is in a mill that was already counted.
        var alreadyHorizMill = new Array(24);
        var alreadyVertiMill = new Array(24);
        var count = 0;
        for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
            // if this player has no stone there move on
            if (!this.stones[player][fieldNum])
                continue;
            // check if there is a mill that has not been counted already
            if (this.CheckMillHorizontal(fieldNum) && !alreadyHorizMill[fieldNum]) {
                // mark the stones in the horizontal mill
                alreadyHorizMill[fieldNum] = true;
                if (GameNode.neighborLeft[fieldNum] != null) {
                    alreadyHorizMill[GameNode.neighborLeft[fieldNum]] = true;
                    if (GameNode.neighborLeft[GameNode.neighborLeft[fieldNum]] != null) {
                        alreadyHorizMill[GameNode.neighborLeft[GameNode.neighborLeft[fieldNum]]] = true;
                    }
                }
                if (GameNode.neighborRight[fieldNum] != null) {
                    alreadyHorizMill[GameNode.neighborRight[fieldNum]] = true;
                    if (GameNode.neighborRight[GameNode.neighborRight[fieldNum]] != null) {
                        alreadyHorizMill[GameNode.neighborRight[GameNode.neighborRight[fieldNum]]] = true;
                    }
                }
                // one mill found
                count++;
            }
            // check and do the same for vertical mills
            if (this.CheckMillVertical(fieldNum) && !alreadyVertiMill[fieldNum]) {
                alreadyVertiMill[fieldNum] = true;
                if (GameNode.neighborTop[fieldNum] != null) {
                    alreadyVertiMill[GameNode.neighborTop[fieldNum]] = true;
                    if (GameNode.neighborTop[GameNode.neighborTop[fieldNum]] != null) {
                        alreadyVertiMill[GameNode.neighborTop[GameNode.neighborTop[fieldNum]]] = true;
                    }
                }
                if (GameNode.neighborBottom[fieldNum] != null) {
                    alreadyVertiMill[GameNode.neighborBottom[fieldNum]] = true;
                    if (GameNode.neighborBottom[GameNode.neighborBottom[fieldNum]] != null) {
                        alreadyVertiMill[GameNode.neighborBottom[GameNode.neighborBottom[fieldNum]]] = true;
                    }
                }
                count++;
            }
        }
        return count;
    };
    GameNode.prototype.NumberOfOpenMills = function (player) {
        var count = 0;
        for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
            // if stone on field move on
            if (this.FieldIsOccupied(fieldNum))
                continue;
            // set stone on field temporarily
            this.stones[player][fieldNum] = true;
            // check if this caused a mill and then look if there are neighbors that could actually do that
            if (this.CheckMillHorizontal(fieldNum)) {
                // first check if there are enemy stones:
                if ((GameNode.neighborTop[fieldNum] == null ||
                    !this.stones[1 - player][GameNode.neighborTop[fieldNum]]) &&
                    (GameNode.neighborBottom[fieldNum] == null ||
                        !this.stones[1 - player][GameNode.neighborBottom[fieldNum]])) {
                    // no enemy stones that can prohibit the open mill from closing
                    // so check if we have a stone to close it
                    if (GameNode.neighborTop[fieldNum] != null &&
                        this.stones[player][GameNode.neighborTop[fieldNum]])
                        count++;
                    else if (GameNode.neighborBottom[fieldNum] != null &&
                        this.stones[player][GameNode.neighborBottom[fieldNum]])
                        count++;
                }
            }
            if (this.CheckMillVertical(fieldNum)) {
                // first check if there are enemy stones:
                if ((GameNode.neighborLeft[fieldNum] == null ||
                    !this.stones[1 - player][GameNode.neighborLeft[fieldNum]]) &&
                    (GameNode.neighborRight[fieldNum] == null ||
                        !this.stones[1 - player][GameNode.neighborRight[fieldNum]])) {
                    // no enemy stones that can prohibit the open mill from closing
                    // so check if we have a stone to close it
                    if (GameNode.neighborLeft[fieldNum] != null &&
                        this.stones[player][GameNode.neighborLeft[fieldNum]])
                        count++;
                    else if (GameNode.neighborRight[fieldNum] != null &&
                        this.stones[player][GameNode.neighborRight[fieldNum]])
                        count++;
                }
            }
            // remove stone again
            this.stones[player][fieldNum] = false;
        }
        return count;
    };
    /**
     * Gets the number of double mills a particular player has.
     * A double mill in this definition are two closed mills sharing a stone.
     * @param {StoneColor} player The player of which to count the double mills.
     * @returns {number} the number of double mills.
     */
    GameNode.prototype.NumberOfDoubleMills = function (player) {
        // returns the number of stones that are in two closed mills simultaneously
        /* Functional Code looks nicer but turned out to be much slower due to additional array operations (allocations etc.)
            return this.stones[player]
                .filter((b, fieldNum) => b && this.CheckMillHorizontal(fieldNum) && this.CheckMillVertical(fieldNum))
                .length;
            */
        var count = 0;
        for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
            if (this.stones[player][fieldNum] &&
                this.CheckMillHorizontal(fieldNum) &&
                this.CheckMillVertical(fieldNum))
                count++;
        }
        return count;
    };
    /**
     * Returns the number of open double mills that may be switched within one move.
     * @param {StoneColor} player The player for which to count the open double mills.
     * @returns {number} the number of open double mills.
     */
    GameNode.prototype.NumberOfOpenDoubleMills = function (player) {
        var _this = this;
        var count = 0;
        for (var fieldNum = 0; fieldNum < 24; fieldNum++) {
            // if stone on field move on
            if (this.FieldIsOccupied(fieldNum))
                continue;
            // set stone on field temporarily
            this.stones[player][fieldNum] = true;
            // check if this caused one or two mills to be created
            var mill = this.CheckMill(fieldNum);
            // remove stone again
            this.stones[player][fieldNum] = false;
            // now in difference to a two stone configuration check if neighbor stones exist to close it
            if (mill &&
                GameNode.GetNeighbors(fieldNum).some(function (neighbor) {
                    return _this.stones[player][neighbor] && _this.CheckMill(neighbor);
                }))
                count++;
        }
        return count;
    };
    GameNode.prototype.NumberOfBlockedStones = function (player) {
        var _this = this;
        return this.stones[player].filter(function (b, fieldNum) {
            return GameNode.GetNeighbors(fieldNum).every(function (n) { return _this.FieldIsOccupied(n); });
        }).length;
    };
    GameNode.prototype.CurrentStateToNumber = function () {
        return (this.stones[0]
            .map(function (b, fieldNum) { return Math.pow(3, fieldNum) * (b ? 1 : 0); })
            .reduce(function (a, b) { return a + b; }, 0) +
            this.stones[1]
                .map(function (b, fieldNum) { return Math.pow(3, fieldNum) * (b ? 2 : 0); })
                .reduce(function (a, b) { return a + b; }, 0));
    };
    GameNode.neighborLeft = [
        null,
        0,
        1,
        null,
        3,
        4,
        null,
        6,
        7,
        null,
        9,
        10,
        null,
        12,
        13,
        null,
        15,
        16,
        null,
        18,
        19,
        null,
        21,
        22,
    ];
    GameNode.neighborRight = [
        1,
        2,
        null,
        4,
        5,
        null,
        7,
        8,
        null,
        10,
        11,
        null,
        13,
        14,
        null,
        16,
        17,
        null,
        19,
        20,
        null,
        22,
        23,
        null,
    ];
    GameNode.neighborTop = [
        null,
        null,
        null,
        null,
        1,
        null,
        null,
        4,
        null,
        0,
        3,
        6,
        8,
        5,
        2,
        11,
        null,
        12,
        10,
        16,
        13,
        9,
        19,
        14,
    ];
    GameNode.neighborBottom = [
        9,
        4,
        14,
        10,
        7,
        13,
        11,
        null,
        12,
        21,
        18,
        15,
        17,
        20,
        23,
        null,
        19,
        null,
        null,
        22,
        null,
        null,
        null,
        null,
    ];
    return GameNode;
}());
var EnemyAIMinimax = /** @class */ (function () {
    function EnemyAIMinimax(_color, _startDepth, _respectLimit) {
        // How many moves the AI will look in the future
        this.startDepth = 5; //
        // Limited time for AI
        this.respectLimit = true;
        this.color = _color;
        if (_respectLimit != null)
            this.respectLimit = _respectLimit;
        if (_startDepth != null)
            this.startDepth = _startDepth;
        console.log(this.startDepth);
    }
    EnemyAIMinimax.prototype.MakeMove = function () {
        var _this = this;
        if (Game.currentPlayer != this.color) {
            // this should not be necessary but just in case lets log if it happens
            console.error("[AI] Current player is not AI.");
            return false;
        }
        // reset values for calculation
        this.hashForRepeat = [];
        this.storedMove = null;
        // just wait shortly to give html time to render
        setTimeout(function () {
            _this.MakeMoveIntern();
        }, 50);
    };
    EnemyAIMinimax.prototype.ExecuteMove = function () {
        if (this.storedMove == null) {
            // this may happen if timeout happens before one move was considered
            // or if all possible moves that were calculated in time would have been repeats
            console.error("[AI] No moves could be calculated! Making random decision.");
            // Get all possible moves
            var possibleMoves = GameNode.GetFromCurrentBoard().GetPossibleMoves();
            if (possibleMoves.length < 1) {
                console.error("[AI] No possible moves found...");
                return;
            }
            // set a random one to be executed so game will not be interrupted
            this.storedMove =
                possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }
        if (this.storedMove.phase == Game.phase) {
            // for each phase first check format of stored move and if ok call the belonging game board method.
            switch (Game.phase) {
                case 1 /* GamePhase.PlacingStones */:
                    if (this.storedMove.from == null && this.storedMove.to != null)
                        GameBoard.MoveCurrentStoneToField(GameBoard.gameFields[this.storedMove.to]);
                    else
                        console.error("[AI] Stored move is not in the right format.");
                    break;
                case 2 /* GamePhase.MovingStones */:
                    if (this.storedMove.from != null &&
                        this.storedMove.to != null &&
                        GameBoard.gameFields[this.storedMove.from].owner)
                        GameBoard.MoveStoneToField(GameBoard.gameFields[this.storedMove.from].owner, GameBoard.gameFields[this.storedMove.to]);
                    else
                        console.error("[AI] Stored move is not in the right format.");
                    break;
                case 3 /* GamePhase.RemovingStone */:
                    if (this.storedMove.to == null &&
                        this.storedMove.from != null &&
                        GameBoard.gameFields[this.storedMove.from].owner)
                        GameBoard.RemoveStoneFromField(GameBoard.gameFields[this.storedMove.from].owner);
                    else
                        console.error("[AI] Stored move is not in the right format.");
                    break;
                default:
                    console.error("[AI] No move possible during game phase ".concat(Game.phase, "!"));
                    break;
            }
        }
        else {
            console.error("[AI] Game phase ".concat(this.storedMove.phase, " of suggested move does not fit actual game status (phase ").concat(Game.phase, "$)!"));
        }
    };
    EnemyAIMinimax.prototype.MakeMoveIntern = function () {
        var _this = this;
        this.startTime = Date.now();
        var rating = this.AlphaBeta(GameNode.GetFromCurrentBoard(), this.startDepth, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
        this.debugLog("Found move with rating ".concat(rating, " while thinking for ").concat(Date.now() - this.startTime, "ms."));
        var remainingTime = Game.aiDecisionTime - (Date.now() - this.startTime);
        if (remainingTime > 10) {
            setTimeout(function () { return _this.ExecuteMove(); }, remainingTime);
        }
        else {
            this.ExecuteMove();
        }
    };
    EnemyAIMinimax.prototype.AlphaBeta = function (node, depth, alpha, beta) {
        var winner = node.GetWinner();
        if (winner != null ||
            depth <= 0 ||
            (this.respectLimit && Date.now() - this.startTime > Game.aiDecisionTime)) {
            var punishment = winner == 1 - this.color &&
                (depth == this.startDepth - 2 ||
                    (depth == this.startDepth - 3 && node.currentPlayer != this.color))
                ? 1
                : 0;
            return node.GetRating(this.color) - 500000 * punishment;
        }
        var possibleMoves = node.GetPossibleMoves();
        if (depth == this.startDepth) {
            for (var _i = 0, possibleMoves_1 = possibleMoves; _i < possibleMoves_1.length; _i++) {
                var move = possibleMoves_1[_i];
                node.PerformMove(move);
                if (node.GetWinner() == this.color) {
                    this.debugLog("Taking shortcut to win.");
                    this.storedMove = move;
                    return node.GetRating(this.color);
                }
                node.UndoMove(move);
            }
            possibleMoves = this.shuffleArray(possibleMoves);
        }
        if (node.currentPlayer == this.color) {
            var maxValue = alpha;
            for (var _a = 0, possibleMoves_2 = possibleMoves; _a < possibleMoves_2.length; _a++) {
                var move = possibleMoves_2[_a];
                node.PerformMove(move);
                var currState = node.CurrentStateToNumber();
                var value = void 0;
                if (!GameBoard.hashForDraw[currState] &&
                    !this.hashForRepeat[currState]) {
                    this.hashForRepeat[currState] = true;
                    value = this.AlphaBeta(node, depth - 1, maxValue, beta);
                    this.hashForRepeat = this.hashForRepeat.splice(currState, 1);
                }
                else {
                    value = maxValue;
                    this.debugLog("Skipping repeating move.");
                }
                node.UndoMove(move);
                if (value > maxValue) {
                    maxValue = value;
                    if (maxValue >= beta)
                        break;
                    if (depth == this.startDepth) {
                        this.storedMove = move;
                    }
                }
            }
            return maxValue;
        }
        else {
            var minValue = beta;
            for (var _b = 0, possibleMoves_3 = possibleMoves; _b < possibleMoves_3.length; _b++) {
                var move = possibleMoves_3[_b];
                node.PerformMove(move);
                var value = this.AlphaBeta(node, depth - 1, alpha, minValue);
                node.UndoMove(move);
                if (value < minValue) {
                    minValue = value;
                    if (minValue <= alpha)
                        break;
                }
            }
            return minValue;
        }
    };
    EnemyAIMinimax.prototype.shuffleArray = function (array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    };
    EnemyAIMinimax.prototype.debugLog = function (text) {
        if (Game.debugLog)
            console.log("[AI ".concat(this.color, "] ").concat(text));
    };
    return EnemyAIMinimax;
}());
var Game = /** @class */ (function () {
    function Game() {
    }
    Game.Start = function () {
        Game.Reset();
        Game.phase = 1 /* GamePhase.PlacingStones */;
        GameBoard.UpdateProperties();
        GameBoard.TryAIMove();
    };
    Game.Reset = function () {
        this.InitializeAIs();
        Game.phase = 0 /* GamePhase.Menu */;
        Game.turn = 0;
        Game.currentPlayer = 1 /* StoneColor.White */;
        GameBoard.Initialize();
    };
    Game.ShowWinnerScreen = function () {
        Game.phase = 4 /* GamePhase.WinnerScreen */;
        GameBoard.UpdateProperties();
        winnerScreenText.innerText =
            (Game.currentPlayer == 1 ? "White" : "Black") + " wins!";
        winnerScreen.style.display = "table";
    };
    Game.ShowDrawScreen = function () {
        Game.phase = 5 /* GamePhase.DrawScreen */;
        GameBoard.UpdateProperties();
        winnerScreenText.innerText = "Game is drawn!";
        winnerScreen.style.display = "table";
    };
    Game.InitializeAIs = function () {
        var _this = this;
        [0 /* StoneColor.Black */, 1 /* StoneColor.White */].forEach(function (color) {
            switch (_this.playerAINumber[color]) {
                case GameAI.Easy:
                    Game.playerAI[color] = new EnemyAIMinimax(color, 2, true);
                    break;
                case GameAI.Strong:
                    Game.playerAI[color] = new EnemyAIMinimax(color, 5, true);
                    break;
                default:
                    Game.playerAI[color] = null;
                    break;
            }
        });
    };
    Game.playerAINumber = [GameAI.Easy, GameAI.Human];
    Game.playerAI = [null, null];
    Game.aiDecisionTime = 2000;
    Game.statMode = false;
    Game.natureDesign = true;
    Game.debugLog = false;
    return Game;
}());
var GameBoard = /** @class */ (function () {
    function GameBoard() {
    }
    Object.defineProperty(GameBoard, "activeStone", {
        /** specifies the active stone */
        get: function () {
            return this._activeStone;
        },
        set: function (newStone) {
            // setting a new active stone will reset active property of old active stone
            if (this._activeStone)
                this._activeStone.active = false;
            this._activeStone = newStone;
            if (newStone)
                newStone.active = true;
            this.UpdateProperties();
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Initializes/Resets the game board for a new game
     */
    GameBoard.Initialize = function () {
        this.lastTurnMill = -1;
        this.hashForDraw = [];
        // only need to create fields once as they do not change
        if (!this.gameFields) {
            // Game board built up from left to right and up to down
            this.gameFields = [
                new GameField(0, 0),
                new GameField(3, 0),
                new GameField(6, 0),
                new GameField(1, 1),
                new GameField(3, 1),
                new GameField(5, 1),
                new GameField(2, 2),
                new GameField(3, 2),
                new GameField(4, 2),
                new GameField(0, 3),
                new GameField(1, 3),
                new GameField(2, 3),
                new GameField(4, 3),
                new GameField(5, 3),
                new GameField(6, 3),
                new GameField(2, 4),
                new GameField(3, 4),
                new GameField(4, 4),
                new GameField(1, 5),
                new GameField(3, 5),
                new GameField(5, 5),
                new GameField(0, 6),
                new GameField(3, 6),
                new GameField(6, 6), // 23
            ];
            // same index means pair -> left and right neighbor (horizontal connections)
            var nachbarL = [
                0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22,
            ];
            var nachbarR = [
                1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23,
            ];
            for (var i = 0; i < nachbarL.length; i++) {
                GameBoard.gameFields[nachbarL[i]].neighborRight =
                    GameBoard.gameFields[nachbarR[i]];
                GameBoard.gameFields[nachbarR[i]].neighborLeft =
                    GameBoard.gameFields[nachbarL[i]];
            }
            // same for vertical connections
            var nachbarT = [
                0, 9, 3, 10, 6, 11, 1, 4, 16, 19, 8, 12, 5, 13, 2, 14,
            ];
            var nachbarB = [
                9, 21, 10, 18, 11, 15, 4, 7, 19, 22, 12, 17, 13, 20, 14, 23,
            ];
            for (var i = 0; i < nachbarT.length; i++) {
                GameBoard.gameFields[nachbarT[i]].neighborBottom =
                    GameBoard.gameFields[nachbarB[i]];
                GameBoard.gameFields[nachbarB[i]].neighborTop =
                    GameBoard.gameFields[nachbarT[i]];
            }
        }
        // remove old stones from html
        if (this.stones)
            this.stones.forEach(function (arr) { return arr.forEach(function (s) { return s.Remove(); }); });
        // create stones and place them next to the game board
        this.stones = [new Array(9), new Array(9)];
        for (var _i = 0, _a = [0 /* StoneColor.Black */, 1 /* StoneColor.White */]; _i < _a.length; _i++) {
            var color = _a[_i];
            for (var i = 0; i < 9; i++) {
                this.stones[color][i] = new GameStone(color, {
                    x: 7 - 8 * color,
                    y: (6 / 8) * i,
                });
            }
        }
        this.activeStone = this.stones[Game.currentPlayer][8];
        // Update stones and fields
        this.UpdateProperties();
    };
    GameBoard.GetStonesOnField = function (color) {
        return this.stones[color].filter(function (s) { return s.isPlaced; });
    };
    /**
     * Updates properties and style of fields and stones.
     */
    GameBoard.UpdateProperties = function () {
        this.gameFields.forEach(function (f) { return f.UpdateProperties(); });
        this.stones.forEach(function (a) { return a.forEach(function (s) { return s.UpdateProperties(); }); });
    };
    /**
     * Places a stone on a given field.
     * @param {GameStone} stone - The stone to move.
     * @param {GameField} field - The field where to move the stone.
     */
    GameBoard.PlaceStoneAtField = function (stone, field) {
        if (field.owner != null) {
            console.error("Cannot place stone on field that is already occupied!");
            return;
        }
        if (stone.field)
            stone.field.owner = null; // reset owner of old field
        field.owner = stone;
        stone.position = field.position;
        stone.field = field;
        this.activeStone = stone;
        this.CheckMuehleSwitchPlayer();
    };
    /**
     * Places the active stone at the given field.
     * @param {GameField} field - The field to move the active stone to.
     */
    GameBoard.PlaceCurrentStoneAtField = function (field) {
        this.PlaceStoneAtField(this.activeStone, field);
    };
    GameBoard.MoveStoneToField = function (stone, field) {
        if (!field.CanStoneMoveTo(stone))
            return false;
        this.PlaceStoneAtField(stone, field);
        return true;
    };
    GameBoard.MoveCurrentStoneToField = function (field) {
        if (!this.activeStone || !field.CanStoneMoveTo(this.activeStone))
            return false;
        this.PlaceCurrentStoneAtField(field);
        return true;
    };
    GameBoard.RemoveStoneFromField = function (stone) {
        if (!stone.field || stone.isInClosedMill || Game.phase != 3) {
            return false; // protected stone
        }
        this.stones[stone.color].splice(this.stones[stone.color].indexOf(stone), 1);
        stone.Remove();
        // Go back to the last game phase before removing a stone
        Game.phase = this.lastGamePhase;
        this.SwitchCurrentPlayer();
        return true;
    };
    GameBoard.CheckMuehleSwitchPlayer = function () {
        if (this.activeStone && this.activeStone.isInClosedMill) {
            // update last turn where mill was closed -> for Remis decision
            this.lastTurnMill = Game.turn;
            if (Game.phase == 2 /* GamePhase.MovingStones */ &&
                this.stones[1 - Game.currentPlayer].length <= 3) {
                // mill created and enemy has only 3 stones left -> player wins
                Game.ShowWinnerScreen();
                return true;
            }
            // Check if there are any enemy stones that can be removed.
            // If not no stone can be removed and next player continues.
            if (this.GetStonesOnField(1 - Game.currentPlayer).some(function (s) { return !s.isInClosedMill; })) {
                this.lastGamePhase = Game.phase; // to go back after removal
                Game.phase = 3 /* GamePhase.RemovingStone */; // Remove stone for closed Muehle
                this.activeStone = null;
                // Update stone and field properties
                this.UpdateProperties();
                // Check if current player is AI and if so let him move
                // Need to call this manually here as player is not switching.
                this.TryAIMove();
                return true;
            }
        }
        // check for game draw
        if (this.CheckAndUpdateDraw()) {
            Game.ShowDrawScreen();
            return false;
        }
        this.SwitchCurrentPlayer();
        return false;
    };
    GameBoard.SwitchCurrentPlayer = function () {
        // Check if next player can move some stones
        if (Game.turn >= 17 &&
            !this.GetStonesOnField(1 - Game.currentPlayer).some(function (s) { return s.isMoveable; })) {
            // no moves possible anymore
            Game.ShowWinnerScreen();
            return;
        }
        // Check if phase has to switch from placing to moving stones
        if (Game.phase == 1 /* GamePhase.PlacingStones */ && Game.turn >= 17) {
            Game.phase = 2 /* GamePhase.MovingStones */;
            GameBoard.activeStone = null;
        }
        // Switch players, reset active stone and increment turn counter
        Game.currentPlayer = 1 - Game.currentPlayer;
        this.activeStone = this.GetUnsettledStone(Game.currentPlayer); // returns null if no unsettled stones
        Game.turn++;
        // Update stone and field properties
        this.UpdateProperties();
        // Check if its AIs turn
        this.TryAIMove();
    };
    GameBoard.GetUnsettledStone = function (color) {
        var unsettledStones = this.stones[color].filter(function (s) { return !s.isPlaced; });
        if (unsettledStones.length < 1)
            return null;
        return unsettledStones[unsettledStones.length - 1];
    };
    GameBoard.TryAIMove = function () {
        if (Game.playerAI[Game.currentPlayer])
            return Game.playerAI[Game.currentPlayer].MakeMove();
        return false;
    };
    GameBoard.CheckAndUpdateDraw = function () {
        // draw if 50 moves without a mill
        if (Game.turn - this.lastTurnMill >= 50) {
            return true;
        }
        // update placement datalist
        var curState = this.CurrentStateToNumber();
        // check if this is the third time the same field
        if (!this.hashForDraw[curState]) {
            this.hashForDraw[curState] = 1;
        }
        else if (++this.hashForDraw[curState] >= 3) {
            return true;
        }
        return false; // no draw
    };
    GameBoard.CurrentStateToNumber = function () {
        return this.gameFields
            .map(function (f, i) { return Math.pow(3, i) * (f.owner ? (f.owner.color == 1 ? 2 : 1) : 0); })
            .reduce(function (a, b) { return a + b; }, 0);
    };
    return GameBoard;
}());
/**
 * Class implementing game fields where stone can be placed.
 */
var GameField = /** @class */ (function () {
    /**
     * Creates a game field for the specified position. Neighbors have to be set later.
     * @param {number} xPos - X coordinate of position on screen in whole numbers.
     * @param {number} yPos - Y coordinate of position on screen in whole numbers.
     * @constructor
     */
    function GameField(xPos, yPos) {
        var _this = this;
        this._element = document.createElement("div");
        this.position = { x: xPos, y: yPos }; // after creating the div element we can set the position
        this._element.setAttribute("class", "field");
        gameBoard.appendChild(this._element);
        this._element.onclick = function () { return _this.OnClicked(); }; // lambda expression to avoid complications with 'this'
    }
    Object.defineProperty(GameField.prototype, "position", {
        /** Position of the field on the board in whole numbers. */
        get: function () {
            return this._position;
        },
        set: function (newPos) {
            this._position = newPos;
            if (this.element) {
                this.element.style.transform = "translate(".concat((newPos.x - 3) * 10, "vmin, ").concat((newPos.y - 3) * 10, "vmin)");
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameField.prototype, "element", {
        /**
         * The DIV element representing this field.
         */
        get: function () {
            return this._element;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameField.prototype, "accessible", {
        /**
         * can a stone be moved onto the field
         */
        get: function () {
            return this._accessible;
        },
        set: function (newAccessible) {
            if (newAccessible) {
                this.element.classList.add("fieldMoveable");
            }
            else {
                this.element.classList.remove("fieldMoveable");
            }
            this._accessible = newAccessible;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameField.prototype, "isClosedMillHorizontal", {
        /** Returns true if a horizontal mill is established using this field. */
        get: function () {
            if (!this.owner || (!this.neighborLeft && !this.neighborRight))
                return false;
            if (!this.neighborLeft)
                return (this.neighborRight.neighborRight &&
                    this.neighborRight.isClosedMillHorizontal);
            if (!this.neighborRight)
                return (this.neighborLeft.neighborLeft &&
                    this.neighborLeft.isClosedMillHorizontal);
            return (this.neighborLeft.owner &&
                this.neighborLeft.owner.color == this.owner.color &&
                this.neighborRight.owner &&
                this.neighborRight.owner.color == this.owner.color);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameField.prototype, "isClosedMillVertical", {
        /** Returns true if a vertical mill is established using this field. */
        get: function () {
            if (!this.owner || (!this.neighborTop && !this.neighborBottom))
                return false;
            if (!this.neighborTop)
                return (this.neighborBottom.neighborBottom &&
                    this.neighborBottom.isClosedMillVertical);
            if (!this.neighborBottom)
                return (this.neighborTop.neighborTop && this.neighborTop.isClosedMillVertical);
            return (this.neighborTop.owner &&
                this.neighborTop.owner.color == this.owner.color &&
                this.neighborBottom.owner &&
                this.neighborBottom.owner.color == this.owner.color);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Updates field properties and style converning accessible.
     */
    GameField.prototype.UpdateProperties = function () {
        // field is accessible if we are placing stones and it has no owner
        // or if stones are moved and the active stone can move on this field
        this.accessible =
            (Game.phase == 1 /* GamePhase.PlacingStones */ && !this.owner) ||
                (Game.phase == 2 /* GamePhase.MovingStones */ &&
                    GameBoard.activeStone &&
                    this.CanStoneMoveTo(GameBoard.activeStone));
    };
    /**
     * Method called if clicked on the game field.
     */
    GameField.prototype.OnClicked = function () {
        // If stone is placed on field redirect click to stone
        if (this.owner)
            return this.owner.OnClicked();
        switch (Game.phase) {
            case 1 /* GamePhase.PlacingStones */:
                if (GameBoard.activeStone && !this.owner)
                    // Active stone can be placed on the field
                    GameBoard.MoveCurrentStoneToField(this);
                else
                    return false;
                break;
            case 2 /* GamePhase.MovingStones */:
                if (GameBoard.activeStone && this.CanStoneMoveTo(GameBoard.activeStone))
                    // Active stone can be moved to the field
                    GameBoard.MoveCurrentStoneToField(this);
                else
                    return false;
                break;
            default:
                return false;
        }
        return true; // true if click consumed
    };
    /**
     * Checks if a given stone can move to the current field.
     * @param {GameStone} stone - The stone that needs to be checked.
     * @returns {boolean} indicating if a stone can moved on the field.
     */
    GameField.prototype.CanStoneMoveTo = function (stone) {
        // cannot move here if field is already occupied
        if (this.owner)
            return false;
        return (!stone.isPlaced ||
            GameBoard.GetStonesOnField(stone.color).length <= 3 ||
            (this.neighborBottom && this.neighborBottom.owner == stone) ||
            (this.neighborLeft && this.neighborLeft.owner == stone) ||
            (this.neighborRight && this.neighborRight.owner == stone) ||
            (this.neighborTop && this.neighborTop.owner == stone));
    };
    return GameField;
}());
/**
 * Class implementing game stones.
 */
var GameStone = /** @class */ (function () {
    /**
     * Creates a stone of the given color.
     * @param {StoneColor} color - Color of the stone.
     * @constructor
     */
    function GameStone(color, position) {
        var _this = this;
        this._position = null;
        this._active = false;
        this._moveable = false;
        this._removeable = false;
        this._hoverable = false;
        /**
         * field on which the stone currently is placed if any
         */
        this.field = null;
        this._color = color;
        this._element = document.createElement("div");
        this.position = position; // after creating the div element we can set the position
        this._element.setAttribute("class", color == 1 /* StoneColor.White */ ? "stoneWhite" : "stoneBlack");
        if (Game.aiDecisionTime <= 200) {
            // instant transition moving stones
            this._element.classList.add("stoneMoveInstant");
        }
        else if (Game.aiDecisionTime <= 400) {
            // fast transition
            this._element.classList.add("stoneMoveFast");
        }
        // set random offset so all stones look different (only for marble background)
        if (!Game.natureDesign)
            this._element.style.backgroundPosition =
                Math.floor(Math.random() * 201) +
                    "px, " +
                    Math.floor(Math.random() * 201) +
                    "px";
        gameBoard.appendChild(this._element);
        this._element.onclick = function () { return _this.OnClicked(); }; // lambda expression to avoid complications with 'this'
    }
    Object.defineProperty(GameStone.prototype, "color", {
        /**
         * color of the stone (readonly)
         */
        get: function () {
            return this._color;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "position", {
        /**
         * position of the stone in whole numbers
         */
        get: function () {
            return this._position;
        },
        set: function (newPos) {
            this._position = newPos;
            if (this.element) {
                this.element.style.transform = "translate(".concat((newPos.x - 3) * 10, "vmin, ").concat((newPos.y - 3) * 10, "vmin)");
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "element", {
        /**
         * The DIV element representing this stone.
         */
        get: function () {
            return this._element;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "active", {
        /**
         * telling if the stone is the active one
         */
        get: function () {
            return this._active;
        },
        set: function (newActive) {
            if (newActive) {
                this.element.classList.add("stoneActive");
            }
            else {
                this.element.classList.remove("stoneActive");
            }
            this._active = newActive;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "moveable", {
        /**
         * can the stone be moved
         */
        get: function () {
            return this._moveable;
        },
        set: function (newMoveable) {
            if (newMoveable) {
                this.element.classList.add("stoneMoveable");
            }
            else {
                this.element.classList.remove("stoneMoveable");
            }
            this._moveable = newMoveable;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "removeable", {
        /**
         * can the stone be removed
         */
        get: function () {
            return this._removeable;
        },
        set: function (newRemoveable) {
            if (newRemoveable) {
                this.element.classList.add("stoneRemoveable");
            }
            else {
                this.element.classList.remove("stoneRemoveable");
            }
            this._removeable = newRemoveable;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "hoverable", {
        /**
         * if the stone can be hovered at the moment
         */
        get: function () {
            return this._hoverable;
        },
        set: function (newHoverable) {
            if (newHoverable) {
                this.element.classList.add("stoneHoverable");
            }
            else {
                this.element.classList.remove("stoneHoverable");
            }
            this._hoverable = newHoverable;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "isPlaced", {
        /**
         * Returns true if stone is placed on the field.
         */
        get: function () {
            return this.field != null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "isMoveable", {
        /**
         * Returns true if the stone can be moved on the field.
         */
        get: function () {
            // a stone is moveable if only three stones are left or it is placed
            // and at least one neighbor is not occupied
            return (GameBoard.stones[this.color].length <= 3 ||
                (this.field &&
                    ((this.field.neighborBottom && !this.field.neighborBottom.owner) ||
                        (this.field.neighborLeft && !this.field.neighborLeft.owner) ||
                        (this.field.neighborRight && !this.field.neighborRight.owner) ||
                        (this.field.neighborTop && !this.field.neighborTop.owner))));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "isInClosedMill", {
        /**
         * Returns true if the stone is currently in a closed mill.
         */
        get: function () {
            return (this.field &&
                (this.field.isClosedMillHorizontal || this.field.isClosedMillVertical));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GameStone.prototype, "canBeClicked", {
        /**
         * If the stone can be clicked
         */
        get: function () {
            return ((Game.phase == 2 /* GamePhase.MovingStones */ &&
                Game.currentPlayer == this.color &&
                !Game.playerAI[this.color] &&
                this.isMoveable &&
                !this.active) ||
                (Game.phase == 3 /* GamePhase.RemovingStone */ &&
                    Game.currentPlayer == 1 - this.color &&
                    !Game.playerAI[1 - this.color] &&
                    this.isPlaced &&
                    !this.isInClosedMill));
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Updates stone properties and style converning moveable and removeable.
     */
    GameStone.prototype.UpdateProperties = function () {
        // Mark stones that can be moved
        this.moveable =
            Game.phase == 2 /* GamePhase.MovingStones */ &&
                this.color == Game.currentPlayer &&
                this.isMoveable;
        // Mark stones that can be removed
        this.removeable =
            Game.phase == 3 /* GamePhase.RemovingStone */ &&
                this.color != Game.currentPlayer &&
                !this.isInClosedMill &&
                this.isPlaced;
        // Set if the stone can be hovered (so if it may be clicked by player)
        this.hoverable = this.canBeClicked;
    };
    /**
     * Method called if clicked on stone.
     * @returns {boolean} if click was consumed by the stone or not.
     */
    GameStone.prototype.OnClicked = function () {
        // if element cannot be clicked return false
        if (!this.canBeClicked)
            return false;
        if (Game.phase == 2 /* GamePhase.MovingStones */ &&
            Game.currentPlayer == this.color &&
            this.isMoveable) {
            // Stone can be moved -> activate him
            GameBoard.activeStone = this;
            return true;
        }
        else if (Game.phase == 3 /* GamePhase.RemovingStone */ &&
            Game.currentPlayer != this.color &&
            !this.isInClosedMill) {
            // Stone can be removed -> do it
            GameBoard.RemoveStoneFromField(this);
            return true;
        }
        return false;
    };
    GameStone.prototype.Remove = function () {
        if (this.field)
            this.field.owner = null;
        this.field = null;
        this.element.remove();
    };
    return GameStone;
}());
/**
 * Implementing functions necessary for the menu.
 */
var Menu = /** @class */ (function () {
    function Menu() {
    }
    /**
     * Start new game and show game canvas.
     */
    Menu.StartGame = function () {
        Game.Start();
        gameMenu.style.display = "none";
        gameBoard.style.display = "block";
        winnerScreen.style.display = "none";
        // initializing statistics mode
        if (Game.statMode) {
            footer.innerHTML =
                "Statistics Mode - Auto Restart and Result Logging enabled.";
        }
        else {
            footer.innerHTML = "Enjoy the game!";
        }
    };
    /**
     * Reset game and show menu.
     */
    Menu.ReturnToMenu = function () {
        Game.Reset();
        gameMenu.style.display = "block";
        gameBoard.style.display = "none";
        winnerScreen.style.display = "none";
    };
    /**
     * This function is called if a menu setting is changed and updates the game values.
     */
    Menu.ReadSettings = function () {
        // get input elements from the menu
        var checkboxStatMode = document.getElementById("statMode");
        var checkboxClassicDesign = document.getElementById("classicDesign");
        if (!checkboxStatMode || !checkboxClassicDesign) {
            console.error("Could not find all menu elements!");
            return;
        }
        Game.statMode = checkboxStatMode.checked;
        // Show some info concerning Stat Mode if turned on for the first time
        if (Game.statMode && this.statModeFirstEnabled) {
            this.statModeFirstEnabled = false;
            Menu.ShowInfoOverlay("Statistics Mode is for long term probing of game results between two AI players. " +
                "Game will automatically restart and results are logged and displayed in the footer. " +
                "Stat Mode can be terminated by going to the menu.");
        }
        Game.natureDesign = !checkboxClassicDesign.checked;
        this.UpdateNatureDesign();
    };
    /**
     * Called by AI select dropdown, sets the AI for a specified color.
     * @param {StoneColor} color - The color for which the AI is altered.
     * @param {GameAI} aiNum - Number describing which AI should be set.
     * @param {HTMLLinkElement} elem - Element that was clicked.
     */
    Menu.SetPlayerAI = function (colorNum, aiNum, elem) {
        var color; // StoneColor is const enum so we cannot directly access it in the html
        if (colorNum == 1)
            color = 1 /* StoneColor.White */;
        else if (colorNum == 0)
            color = 0 /* StoneColor.Black */;
        else
            return; // input invalid
        switch (aiNum) {
            case GameAI.Human:
            case GameAI.Random:
            case GameAI.Easy:
            case GameAI.Medium:
            case GameAI.Strong:
                break;
            default:
                return; // not a valid input
        }
        Game.playerAINumber[color] = aiNum;
        // adjust the button text to fit the new selection
        [
            document.getElementById("blackAI"),
            document.getElementById("whiteAI"),
        ][color].innerHTML = elem.innerHTML;
    };
    /**
     * Triggered if clicked on button to toggle dropdown list.
     * @param {HTMLButtonElement} elem - The element clicked on.
     */
    Menu.ToggleDropdown = function (elem) {
        var content = elem.nextElementSibling;
        if (content) {
            content.classList.toggle("show");
            // make all others disappear:
            var dropdowns = document.getElementsByClassName("dropdown-content");
            for (var i = 0; i < dropdowns.length; i++) {
                if (dropdowns[i] != content) {
                    dropdowns[i].classList.remove("show");
                }
            }
        }
        else {
            console.error("Dropdown content could not be found.");
        }
    };
    /**
     * Shows an information overlay with given text.
     * @param {string} text - The text to print on the screen.
     */
    Menu.ShowInfoOverlay = function (text, title) {
        var disp = document.getElementById("infoOverlay");
        disp.getElementsByTagName("p")[0].innerHTML =
            text;
        disp.getElementsByTagName("span")[0].innerHTML =
            title != null ? title : "Information";
        disp.style.display = "table";
    };
    /**
     * Hides the information overlay.
     */
    Menu.HideInfoOverlay = function () {
        document.getElementById("infoOverlay").style.display =
            "none";
    };
    /**
     * Updates the nature design if active.
     */
    Menu.UpdateNatureDesign = function () {
        if (Game.natureDesign) {
            // nature design turned on
            this.ChangeCSS("style/normal.css", 0);
        }
        else {
            // turned off
            this.ChangeCSS("style/nature.css", 0);
        }
    };
    /**
     * Changes a CSS style sheet on the fly.
     */
    Menu.ChangeCSS = function (cssFile, cssLinkIndex) {
        var oldlink = document
            .getElementsByTagName("link")
            .item(cssLinkIndex);
        var newlink = document.createElement("link");
        newlink.setAttribute("rel", "stylesheet");
        newlink.setAttribute("type", "text/css");
        newlink.setAttribute("href", cssFile);
        document
            .getElementsByTagName("head")
            .item(0)
            .replaceChild(newlink, oldlink);
    };
    /** If stat mode was never enabled before. For displaying infoOverlay. */
    Menu.statModeFirstEnabled = true;
    return Menu;
}());
//# sourceMappingURL=mill.js.map
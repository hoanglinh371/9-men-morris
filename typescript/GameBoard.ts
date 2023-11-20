class GameBoard {
  /** Array containing all game fields on the board */
  static gameFields: GameField[];
  /** Array containing all stones existing */
  static stones: [GameStone[], GameStone[]];

  private static _activeStone: GameStone;
  /** specifies the active stone */
  static get activeStone(): GameStone {
    return this._activeStone;
  }
  static set activeStone(newStone: GameStone) {
    // setting a new active stone will reset active property of old active stone
    if (this._activeStone) this._activeStone.active = false;
    this._activeStone = newStone;
    if (newStone) newStone.active = true;
    this.UpdateProperties();
  }

  // stores last game phase while removing a stone to return there later
  private static lastGamePhase: number;

  // for draw detection
  // stores last turn a mill was created
  private static lastTurnMill: number;
  // stores how often a specific board configuration was alreade placed
  // if one set of stone position is detected 3 times game is draw
  static hashForDraw: number[];

  /**
   * Initializes/Resets the game board for a new game
   */
  static Initialize(): void {
    this.lastTurnMill = -1;
    this.hashForDraw = [];

    // only need to create fields once as they do not change
    if (!this.gameFields) {
      // Game board built up from left to right and up to down
      this.gameFields = [
        new GameField(0, 0), //  0 - top left
        new GameField(3, 0), //  1 - top center
        new GameField(6, 0), //  2 - top right
        new GameField(1, 1), //  3
        new GameField(3, 1), //  4
        new GameField(5, 1), //  5
        new GameField(2, 2), //  6
        new GameField(3, 2), //  7
        new GameField(4, 2), //  8
        new GameField(0, 3), //  9
        new GameField(1, 3), // 10
        new GameField(2, 3), // 11
        new GameField(4, 3), // 12
        new GameField(5, 3), // 13
        new GameField(6, 3), // 14
        new GameField(2, 4), // 15
        new GameField(3, 4), // 16
        new GameField(4, 4), // 17
        new GameField(1, 5), // 18
        new GameField(3, 5), // 19
        new GameField(5, 5), // 20
        new GameField(0, 6), // 21
        new GameField(3, 6), // 22
        new GameField(6, 6), // 23
      ];
      // same index means pair -> left and right neighbor (horizontal connections)
      let nachbarL: number[] = [
        0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22,
      ];
      let nachbarR: number[] = [
        1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23,
      ];
      for (let i = 0; i < nachbarL.length; i++) {
        GameBoard.gameFields[nachbarL[i]].neighborRight =
          GameBoard.gameFields[nachbarR[i]];
        GameBoard.gameFields[nachbarR[i]].neighborLeft =
          GameBoard.gameFields[nachbarL[i]];
      }
      // same for vertical connections
      let nachbarT: number[] = [
        0, 9, 3, 10, 6, 11, 1, 4, 16, 19, 8, 12, 5, 13, 2, 14,
      ];
      let nachbarB: number[] = [
        9, 21, 10, 18, 11, 15, 4, 7, 19, 22, 12, 17, 13, 20, 14, 23,
      ];
      for (let i = 0; i < nachbarT.length; i++) {
        GameBoard.gameFields[nachbarT[i]].neighborBottom =
          GameBoard.gameFields[nachbarB[i]];
        GameBoard.gameFields[nachbarB[i]].neighborTop =
          GameBoard.gameFields[nachbarT[i]];
      }
    }
    // remove old stones from html
    if (this.stones)
      this.stones.forEach((arr) => arr.forEach((s) => s.Remove()));
    // create stones and place them next to the game board
    this.stones = [new Array<GameStone>(9), new Array<GameStone>(9)];
    for (const color of [StoneColor.Black, StoneColor.White]) {
      for (let i = 0; i < 9; i++) {
        this.stones[color][i] = new GameStone(color, {
          x: 7 - 8 * color,
          y: (6 / 8) * i,
        } as FieldPosition);
      }
    }
    this.activeStone = this.stones[Game.currentPlayer][8];

    // Update stones and fields
    this.UpdateProperties();
  }

  static GetStonesOnField(color: StoneColor): Array<GameStone> {
    return this.stones[color].filter((s) => s.isPlaced);
  }

  /**
   * Updates properties and style of fields and stones.
   */
  static UpdateProperties(): void {
    this.gameFields.forEach((f) => f.UpdateProperties());
    this.stones.forEach((a) => a.forEach((s) => s.UpdateProperties()));
  }

  /**
   * Places a stone on a given field.
   * @param {GameStone} stone - The stone to move.
   * @param {GameField} field - The field where to move the stone.
   */
  private static PlaceStoneAtField(stone: GameStone, field: GameField): void {
    if (field.owner != null) {
      console.error("Cannot place stone on field that is already occupied!");
      return;
    }
    if (stone.field) stone.field.owner = null; // reset owner of old field
    field.owner = stone;
    stone.position = field.position;
    stone.field = field;
    this.activeStone = stone;

    this.CheckMuehleSwitchPlayer();
  }
  /**
   * Places the active stone at the given field.
   * @param {GameField} field - The field to move the active stone to.
   */
  private static PlaceCurrentStoneAtField(field: GameField): void {
    this.PlaceStoneAtField(this.activeStone, field);
  }

  static MoveStoneToField(stone: GameStone, field: GameField): boolean {
    if (!field.CanStoneMoveTo(stone)) return false;
    this.PlaceStoneAtField(stone, field);
    return true;
  }

  static MoveCurrentStoneToField(field: GameField): boolean {
    if (!this.activeStone || !field.CanStoneMoveTo(this.activeStone))
      return false;
    this.PlaceCurrentStoneAtField(field);
    return true;
  }

  static RemoveStoneFromField(stone: GameStone): boolean {
    if (!stone.field || stone.isInClosedMill || Game.phase != 3) {
      return false; // protected stone
    }
    this.stones[stone.color].splice(this.stones[stone.color].indexOf(stone), 1);
    stone.Remove();

    // Go back to the last game phase before removing a stone
    Game.phase = this.lastGamePhase;
    this.SwitchCurrentPlayer();
    return true;
  }

  static CheckMuehleSwitchPlayer(): boolean {
    if (this.activeStone && this.activeStone.isInClosedMill) {
      // update last turn where mill was closed -> for Remis decision
      this.lastTurnMill = Game.turn;

      if (
        Game.phase == GamePhase.MovingStones &&
        this.stones[1 - Game.currentPlayer].length <= 3
      ) {
        // mill created and enemy has only 3 stones left -> player wins
        Game.ShowWinnerScreen();
        return true;
      }
      // Check if there are any enemy stones that can be removed.
      // If not no stone can be removed and next player continues.
      if (
        this.GetStonesOnField(1 - Game.currentPlayer).some(
          (s) => !s.isInClosedMill,
        )
      ) {
        this.lastGamePhase = Game.phase; // to go back after removal
        Game.phase = GamePhase.RemovingStone; // Remove stone for closed Muehle
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
  }

  static SwitchCurrentPlayer(): void {
    // Check if next player can move some stones
    if (
      Game.turn >= 17 &&
      !this.GetStonesOnField(1 - Game.currentPlayer).some((s) => s.isMoveable)
    ) {
      // no moves possible anymore
      Game.ShowWinnerScreen();
      return;
    }
    // Check if phase has to switch from placing to moving stones
    if (Game.phase == GamePhase.PlacingStones && Game.turn >= 17) {
      Game.phase = GamePhase.MovingStones;
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
  }

  static GetUnsettledStone(color: StoneColor): GameStone {
    const unsettledStones = this.stones[color].filter((s) => !s.isPlaced);
    if (unsettledStones.length < 1) return null;
    return unsettledStones[unsettledStones.length - 1];
  }

  static TryAIMove(): boolean {
    if (Game.playerAI[Game.currentPlayer])
      return Game.playerAI[Game.currentPlayer].MakeMove();
    return false;
  }

  static CheckAndUpdateDraw(): boolean {
    // draw if 50 moves without a mill
    if (Game.turn - this.lastTurnMill >= 50) {
      return true;
    }

    // update placement datalist
    const curState = this.CurrentStateToNumber();
    // check if this is the third time the same field
    if (!this.hashForDraw[curState]) {
      this.hashForDraw[curState] = 1;
    } else if (++this.hashForDraw[curState] >= 3) {
      return true;
    }

    return false; // no draw
  }

  static CurrentStateToNumber(): number {
    return this.gameFields
      .map(
        (f, i) => Math.pow(3, i) * (f.owner ? (f.owner.color == 1 ? 2 : 1) : 0),
      )
      .reduce((a, b) => a + b, 0);
  }
}

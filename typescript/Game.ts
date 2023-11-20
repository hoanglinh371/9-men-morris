class Game {
  static phase: GamePhase;
  static turn: number;
  static currentPlayer: StoneColor;
  static playerAINumber: [GameAI, GameAI] = [GameAI.Easy, GameAI.Human];
  static playerAI: Array<EnemyAI> = [null, null];
  static aiDecisionTime = 2000;
  static statMode = false;
  static natureDesign = true;
  static debugLog = false;

  static Start(): void {
    Game.Reset();
    Game.phase = GamePhase.PlacingStones;

    GameBoard.UpdateProperties();
    GameBoard.TryAIMove();
  }

  static Reset(): void {
    this.InitializeAIs();
    Game.phase = GamePhase.Menu;
    Game.turn = 0;
    Game.currentPlayer = StoneColor.White;

    GameBoard.Initialize();
  }

  static ShowWinnerScreen(): void {
    Game.phase = GamePhase.WinnerScreen;
    GameBoard.UpdateProperties();
    winnerScreenText.innerText =
      (Game.currentPlayer == 1 ? "White" : "Black") + " wins!";
    winnerScreen.style.display = "table";
  }

  static ShowDrawScreen(): void {
    Game.phase = GamePhase.DrawScreen;
    GameBoard.UpdateProperties();
    winnerScreenText.innerText = "Game is drawn!";
    winnerScreen.style.display = "table";
  }

  static InitializeAIs(): void {
    [StoneColor.Black, StoneColor.White].forEach((color) => {
      switch (this.playerAINumber[color]) {
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
  }
}

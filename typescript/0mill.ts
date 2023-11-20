interface FieldPosition {
  x: number;
  y: number;
}

const enum GamePhase {
  Menu,
  PlacingStones,
  MovingStones,
  RemovingStone,
  WinnerScreen,
  DrawScreen,
}

const enum StoneColor {
  Black,
  White,
}
/** Enum with the different possible AIs */
enum GameAI {
  Human,
  Random,
  Easy,
  Medium,
  Strong,
}

let gameMenu: HTMLDivElement;
let gameBoard: HTMLDivElement;
let winnerScreen: HTMLDivElement;
let winnerScreenText: HTMLSpanElement;
let footer: HTMLParagraphElement;

function onLoad(): void {
  gameMenu = <HTMLDivElement>document.getElementById("gameMenu");
  gameBoard = <HTMLDivElement>document.getElementById("gameBoard");
  winnerScreen = <HTMLDivElement>document.getElementById("winnerScreen");
  winnerScreenText = <HTMLSpanElement>(
    document.getElementById("winnerScreenText")
  );
  footer = document
    .getElementsByTagName("footer")[0]
    .getElementsByTagName("p")[0];
  Game.Reset();

  window.onclick = function (event) {
    if (!(<HTMLElement>event.target).matches(".dropbtn")) {
      const dropdowns = document.getElementsByClassName("dropdown-content");
      for (let i = 0; i < dropdowns.length; i++)
        dropdowns[i].classList.remove("show");
    }
  };
}

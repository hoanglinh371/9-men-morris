/**
 * Implementing functions necessary for the menu.
 */
class Menu {
  /** If stat mode was never enabled before. For displaying infoOverlay. */
  private static statModeFirstEnabled = true;

  /**
   * Start new game and show game canvas.
   */
  static StartGame(): void {
    Game.Start();
    gameMenu.style.display = "none";
    gameBoard.style.display = "block";
    winnerScreen.style.display = "none";

    // initializing statistics mode
    if (Game.statMode) {
      footer.innerHTML =
        "Statistics Mode - Auto Restart and Result Logging enabled.";
    } else {
      footer.innerHTML = "Enjoy the game!";
    }
  }

  /**
   * Reset game and show menu.
   */
  static ReturnToMenu(): void {
    Game.Reset();
    gameMenu.style.display = "block";
    gameBoard.style.display = "none";
    winnerScreen.style.display = "none";
  }

  /**
   * This function is called if a menu setting is changed and updates the game values.
   */
  static ReadSettings(): void {
    // get input elements from the menu
    let checkboxStatMode = document.getElementById(
      "statMode",
    ) as HTMLInputElement;
    let checkboxClassicDesign = document.getElementById(
      "classicDesign",
    ) as HTMLInputElement;

    if (!checkboxStatMode || !checkboxClassicDesign) {
      console.error("Could not find all menu elements!");
      return;
    }

    Game.statMode = checkboxStatMode.checked;

    // Show some info concerning Stat Mode if turned on for the first time
    if (Game.statMode && this.statModeFirstEnabled) {
      this.statModeFirstEnabled = false;
      Menu.ShowInfoOverlay(
        "Statistics Mode is for long term probing of game results between two AI players. " +
          "Game will automatically restart and results are logged and displayed in the footer. " +
          "Stat Mode can be terminated by going to the menu.",
      );
    }
    Game.natureDesign = !checkboxClassicDesign.checked;
    this.UpdateNatureDesign();
  }

  /**
   * Called by AI select dropdown, sets the AI for a specified color.
   * @param {StoneColor} color - The color for which the AI is altered.
   * @param {GameAI} aiNum - Number describing which AI should be set.
   * @param {HTMLLinkElement} elem - Element that was clicked.
   */
  static SetPlayerAI(
    colorNum: number,
    aiNum: GameAI,
    elem: HTMLAnchorElement,
  ): void {
    let color: StoneColor; // StoneColor is const enum so we cannot directly access it in the html
    if (colorNum == 1) color = StoneColor.White;
    else if (colorNum == 0) color = StoneColor.Black;
    else return; // input invalid

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
      document.getElementById("blackAI") as HTMLButtonElement,
      document.getElementById("whiteAI") as HTMLButtonElement,
    ][color].innerHTML = elem.innerHTML;
  }

  /**
   * Triggered if clicked on button to toggle dropdown list.
   * @param {HTMLButtonElement} elem - The element clicked on.
   */
  static ToggleDropdown(elem: HTMLButtonElement): void {
    const content = elem.nextElementSibling as HTMLDivElement;
    if (content) {
      content.classList.toggle("show");
      // make all others disappear:
      const dropdowns = document.getElementsByClassName("dropdown-content");
      for (let i = 0; i < dropdowns.length; i++) {
        if (dropdowns[i] != content) {
          dropdowns[i].classList.remove("show");
        }
      }
    } else {
      console.error("Dropdown content could not be found.");
    }
  }

  /**
   * Shows an information overlay with given text.
   * @param {string} text - The text to print on the screen.
   */
  static ShowInfoOverlay(text: string, title?: string): void {
    let disp = document.getElementById("infoOverlay") as HTMLDivElement;
    (disp.getElementsByTagName("p")[0] as HTMLParagraphElement).innerHTML =
      text;
    (disp.getElementsByTagName("span")[0] as HTMLSpanElement).innerHTML =
      title != null ? title : "Information";
    disp.style.display = "table";
  }
  /**
   * Hides the information overlay.
   */
  static HideInfoOverlay(): void {
    (document.getElementById("infoOverlay") as HTMLDivElement).style.display =
      "none";
  }

  /**
   * Updates the nature design if active.
   */
  static UpdateNatureDesign(): void {
    if (Game.natureDesign) {
      // nature design turned on
      this.ChangeCSS("style/normal.css", 0);
    } else {
      // turned off
      this.ChangeCSS("style/nature.css", 0);
    }
  }

  /**
   * Changes a CSS style sheet on the fly.
   */
  static ChangeCSS(cssFile: string, cssLinkIndex: number) {
    const oldlink = document
      .getElementsByTagName("link")
      .item(cssLinkIndex) as HTMLLinkElement;
    const newlink = document.createElement("link") as HTMLLinkElement;

    newlink.setAttribute("rel", "stylesheet");
    newlink.setAttribute("type", "text/css");
    newlink.setAttribute("href", cssFile);

    document
      .getElementsByTagName("head")
      .item(0)
      .replaceChild(newlink, oldlink);
  }
}

/**
 * Class implementing game fields where stone can be placed.
 */
class GameField {
  private _position: FieldPosition;
  private _element: HTMLDivElement;
  private _accessible: boolean;

  /** Left neighbor of this field on the game board. */
  neighborLeft: GameField;
  /** Right neighbor of this field on the game board. */
  neighborRight: GameField;
  /** Top neighbor of this field on the game board. */
  neighborTop: GameField;
  /** Bottom neighbor of this field on the game board. */
  neighborBottom: GameField;

  /** Stone currently placed on this field. */
  owner: GameStone;

  /** Position of the field on the board in whole numbers. */
  get position(): FieldPosition {
    return this._position;
  }
  set position(newPos: FieldPosition) {
    this._position = newPos;
    if (this.element) {
      this.element.style.transform = `translate(${(newPos.x - 3) * 10}vmin, ${
        (newPos.y - 3) * 10
      }vmin)`;
    }
  }

  /**
   * The DIV element representing this field.
   */
  get element(): HTMLDivElement {
    return this._element;
  }

  /**
   * can a stone be moved onto the field
   */
  get accessible(): boolean {
    return this._accessible;
  }
  set accessible(newAccessible: boolean) {
    if (newAccessible) {
      this.element.classList.add("fieldMoveable");
    } else {
      this.element.classList.remove("fieldMoveable");
    }
    this._accessible = newAccessible;
  }

  /** Returns true if a horizontal mill is established using this field. */
  get isClosedMillHorizontal(): boolean {
    if (!this.owner || (!this.neighborLeft && !this.neighborRight))
      return false;
    if (!this.neighborLeft)
      return (
        this.neighborRight.neighborRight &&
        this.neighborRight.isClosedMillHorizontal
      );
    if (!this.neighborRight)
      return (
        this.neighborLeft.neighborLeft &&
        this.neighborLeft.isClosedMillHorizontal
      );
    return (
      this.neighborLeft.owner &&
      this.neighborLeft.owner.color == this.owner.color &&
      this.neighborRight.owner &&
      this.neighborRight.owner.color == this.owner.color
    );
  }
  /** Returns true if a vertical mill is established using this field. */
  get isClosedMillVertical(): boolean {
    if (!this.owner || (!this.neighborTop && !this.neighborBottom))
      return false;
    if (!this.neighborTop)
      return (
        this.neighborBottom.neighborBottom &&
        this.neighborBottom.isClosedMillVertical
      );
    if (!this.neighborBottom)
      return (
        this.neighborTop.neighborTop && this.neighborTop.isClosedMillVertical
      );
    return (
      this.neighborTop.owner &&
      this.neighborTop.owner.color == this.owner.color &&
      this.neighborBottom.owner &&
      this.neighborBottom.owner.color == this.owner.color
    );
  }

  /**
   * Creates a game field for the specified position. Neighbors have to be set later.
   * @param {number} xPos - X coordinate of position on screen in whole numbers.
   * @param {number} yPos - Y coordinate of position on screen in whole numbers.
   * @constructor
   */
  constructor(xPos: number, yPos: number) {
    this._element = document.createElement("div");
    this.position = { x: xPos, y: yPos }; // after creating the div element we can set the position
    this._element.setAttribute("class", "field");
    gameBoard.appendChild(this._element);
    this._element.onclick = () => this.OnClicked(); // lambda expression to avoid complications with 'this'
  }

  /**
   * Updates field properties and style converning accessible.
   */
  UpdateProperties(): void {
    // field is accessible if we are placing stones and it has no owner
    // or if stones are moved and the active stone can move on this field
    this.accessible =
      (Game.phase == GamePhase.PlacingStones && !this.owner) ||
      (Game.phase == GamePhase.MovingStones &&
        GameBoard.activeStone &&
        this.CanStoneMoveTo(GameBoard.activeStone));
  }

  /**
   * Method called if clicked on the game field.
   */
  OnClicked(): boolean {
    // If stone is placed on field redirect click to stone
    if (this.owner) return this.owner.OnClicked();

    switch (Game.phase) {
      case GamePhase.PlacingStones:
        if (GameBoard.activeStone && !this.owner)
          // Active stone can be placed on the field
          GameBoard.MoveCurrentStoneToField(this);
        else return false;
        break;
      case GamePhase.MovingStones:
        if (GameBoard.activeStone && this.CanStoneMoveTo(GameBoard.activeStone))
          // Active stone can be moved to the field
          GameBoard.MoveCurrentStoneToField(this);
        else return false;
        break;
      default:
        return false;
    }

    return true; // true if click consumed
  }

  /**
   * Checks if a given stone can move to the current field.
   * @param {GameStone} stone - The stone that needs to be checked.
   * @returns {boolean} indicating if a stone can moved on the field.
   */
  CanStoneMoveTo(stone: GameStone): boolean {
    // cannot move here if field is already occupied
    if (this.owner) return false;

    return (
      !stone.isPlaced ||
      GameBoard.GetStonesOnField(stone.color).length <= 3 ||
      (this.neighborBottom && this.neighborBottom.owner == stone) ||
      (this.neighborLeft && this.neighborLeft.owner == stone) ||
      (this.neighborRight && this.neighborRight.owner == stone) ||
      (this.neighborTop && this.neighborTop.owner == stone)
    );
  }
}

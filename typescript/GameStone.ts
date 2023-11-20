/**
 * Class implementing game stones.
 */
class GameStone {
  private _color: StoneColor;
  private _position: FieldPosition = null;
  private _element: HTMLDivElement;
  private _active: boolean = false;
  private _moveable: boolean = false;
  private _removeable: boolean = false;
  private _hoverable: boolean = false;

  /**
   * color of the stone (readonly)
   */
  get color(): StoneColor {
    return this._color;
  }

  /**
   * position of the stone in whole numbers
   */
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
   * field on which the stone currently is placed if any
   */
  field: GameField = null;

  /**
   * The DIV element representing this stone.
   */
  get element(): HTMLDivElement {
    return this._element;
  }

  /**
   * telling if the stone is the active one
   */
  get active(): boolean {
    return this._active;
  }
  set active(newActive: boolean) {
    if (newActive) {
      this.element.classList.add("stoneActive");
    } else {
      this.element.classList.remove("stoneActive");
    }
    this._active = newActive;
  }

  /**
   * can the stone be moved
   */
  get moveable(): boolean {
    return this._moveable;
  }
  set moveable(newMoveable: boolean) {
    if (newMoveable) {
      this.element.classList.add("stoneMoveable");
    } else {
      this.element.classList.remove("stoneMoveable");
    }
    this._moveable = newMoveable;
  }

  /**
   * can the stone be removed
   */
  get removeable(): boolean {
    return this._removeable;
  }
  set removeable(newRemoveable: boolean) {
    if (newRemoveable) {
      this.element.classList.add("stoneRemoveable");
    } else {
      this.element.classList.remove("stoneRemoveable");
    }
    this._removeable = newRemoveable;
  }

  /**
   * if the stone can be hovered at the moment
   */
  get hoverable(): boolean {
    return this._hoverable;
  }
  set hoverable(newHoverable: boolean) {
    if (newHoverable) {
      this.element.classList.add("stoneHoverable");
    } else {
      this.element.classList.remove("stoneHoverable");
    }
    this._hoverable = newHoverable;
  }

  /**
   * Returns true if stone is placed on the field.
   */
  get isPlaced(): boolean {
    return this.field != null;
  }

  /**
   * Returns true if the stone can be moved on the field.
   */
  get isMoveable(): boolean {
    // a stone is moveable if only three stones are left or it is placed
    // and at least one neighbor is not occupied
    return (
      GameBoard.stones[this.color].length <= 3 ||
      (this.field &&
        ((this.field.neighborBottom && !this.field.neighborBottom.owner) ||
          (this.field.neighborLeft && !this.field.neighborLeft.owner) ||
          (this.field.neighborRight && !this.field.neighborRight.owner) ||
          (this.field.neighborTop && !this.field.neighborTop.owner)))
    );
  }

  /**
   * Returns true if the stone is currently in a closed mill.
   */
  get isInClosedMill(): boolean {
    return (
      this.field &&
      (this.field.isClosedMillHorizontal || this.field.isClosedMillVertical)
    );
  }

  /**
   * If the stone can be clicked
   */
  get canBeClicked(): boolean {
    return (
      (Game.phase == GamePhase.MovingStones &&
        Game.currentPlayer == this.color &&
        !Game.playerAI[this.color] &&
        this.isMoveable &&
        !this.active) ||
      (Game.phase == GamePhase.RemovingStone &&
        Game.currentPlayer == 1 - this.color &&
        !Game.playerAI[1 - this.color] &&
        this.isPlaced &&
        !this.isInClosedMill)
    );
  }

  /**
   * Creates a stone of the given color.
   * @param {StoneColor} color - Color of the stone.
   * @constructor
   */
  constructor(color: StoneColor, position: FieldPosition) {
    this._color = color;

    this._element = document.createElement("div");
    this.position = position; // after creating the div element we can set the position
    this._element.setAttribute(
      "class",
      color == StoneColor.White ? "stoneWhite" : "stoneBlack",
    );
    if (Game.aiDecisionTime <= 200) {
      // instant transition moving stones
      this._element.classList.add("stoneMoveInstant");
    } else if (Game.aiDecisionTime <= 400) {
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

    this._element.onclick = () => this.OnClicked(); // lambda expression to avoid complications with 'this'
  }

  /**
   * Updates stone properties and style converning moveable and removeable.
   */
  UpdateProperties(): void {
    // Mark stones that can be moved
    this.moveable =
      Game.phase == GamePhase.MovingStones &&
      this.color == Game.currentPlayer &&
      this.isMoveable;
    // Mark stones that can be removed
    this.removeable =
      Game.phase == GamePhase.RemovingStone &&
      this.color != Game.currentPlayer &&
      !this.isInClosedMill &&
      this.isPlaced;
    // Set if the stone can be hovered (so if it may be clicked by player)
    this.hoverable = this.canBeClicked;
  }

  /**
   * Method called if clicked on stone.
   * @returns {boolean} if click was consumed by the stone or not.
   */
  OnClicked(): boolean {
    // if element cannot be clicked return false
    if (!this.canBeClicked) return false;

    if (
      Game.phase == GamePhase.MovingStones &&
      Game.currentPlayer == this.color &&
      this.isMoveable
    ) {
      // Stone can be moved -> activate him
      GameBoard.activeStone = this;
      return true;
    } else if (
      Game.phase == GamePhase.RemovingStone &&
      Game.currentPlayer != this.color &&
      !this.isInClosedMill
    ) {
      // Stone can be removed -> do it
      GameBoard.RemoveStoneFromField(this);
      return true;
    }
    return false;
  }

  Remove(): void {
    if (this.field) this.field.owner = null;
    this.field = null;
    this.element.remove();
  }
}

import { getExistingShapes } from "./http";

type Tool = "circle" | "rect" | "pencil" | "eraser" | "move";

export type Shape =
  | { type: "rect"; x: number; y: number; width: number; height: number; color: string; lineWidth: number }
  | { type: "circle"; centerX: number; centerY: number; radius: number; color: string; lineWidth: number }
  | { type: "pencil"; points: { x: number; y: number }[]; color: string; lineWidth: number }
  | { type: "move"; shape: Shape; offsetX: number; offsetY: number }
  | { type: "eraser"; x: number; y: number; width: number; height: number };

export class Game {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[] = [];
  private roomId: string;
  private clicked: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private selectedTool: Tool = "pencil";
  private currentPencilStroke: { x: number; y: number }[] = [];
  private activeShape: Shape | null = null;
  private currentMouseX: number = 0;
  private currentMouseY: number = 0;
  private currentColor: string = "black";
  private currentLineWidth: number = 2;

  // New properties for zoom and pan
  private scale: number = 1;
  private minScale: number = 0.1;
  private maxScale: number = 5;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;

  socket: WebSocket;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.roomId = roomId;
    this.socket = socket;
    this.init();
    this.initHandlers();
    this.initMouseHandlers();
    this.initZoomHandlers();
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.removeEventListener("wheel", this.wheelHandler);
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
  }

  setTool(tool: Tool) {
    this.selectedTool = tool;
    this.canvas.style.cursor = tool === "move" ? "move" : "crosshair";
  }

  setColor(color: string) {
    this.currentColor = color;
    this.redrawCanvas();
  }

  setLineWidth(lineWidth: number) {
    this.currentLineWidth = lineWidth;
    this.redrawCanvas();
  }

  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);
    this.redrawCanvas();
  }

  initHandlers() {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "chat") {
        const parsedShape = JSON.parse(message.message);
        if (parsedShape.type === "update") {
          // Update the shapes array
          this.existingShapes = parsedShape.shapes;
          
          // If it's a move update, keep any local active shape
          if (parsedShape.isMoving && this.activeShape) {
            const localActiveShape = this.activeShape;
            this.existingShapes = this.existingShapes.map(shape => 
              shape.type === "move" ? localActiveShape : shape
            );
          }
          
          this.redrawCanvas();
        } else {
          this.existingShapes.push(parsedShape.shape);
          this.redrawCanvas();
        }
      }
    };
  }

  // Convert screen coordinates to canvas coordinates
  private screenToCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale
    };
  }

  // Convert canvas coordinates to screen coordinates
  private canvasToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.scale + this.offsetX,
      y: y * this.scale + this.offsetY
    };
  }

  // New method to handle zooming
  private zoom(deltaY: number, centerX: number, centerY: number) {
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);
    
    if (newScale !== this.scale) {
      // Calculate how the offset should change to zoom around mouse position
      const canvasPoint = this.screenToCanvas(centerX, centerY);
      this.scale = newScale;
      const newScreenPoint = this.canvasToScreen(canvasPoint.x, canvasPoint.y);
      
      this.offsetX += centerX - newScreenPoint.x;
      this.offsetY += centerY - newScreenPoint.y;
      
      this.redrawCanvas();
    }
  }

  // New method to handle panning
  private pan(deltaX: number, deltaY: number) {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
    this.redrawCanvas();
  }

  redrawCanvas() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply transformation
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    this.existingShapes.forEach((shape) => this.drawShape(shape));
    
    this.ctx.restore();
  }

  drawShape(shape: Shape | undefined) {
    if (!shape || !shape.type) return;
  
    this.ctx.save();
  
    if (shape.type !== "eraser" && shape.type !== "move") {
      this.ctx.strokeStyle = shape.color;
      this.ctx.lineWidth = shape.lineWidth;
    }
  
    if (shape.type === "rect") {
      this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === "pencil") {
      if (shape.points.length > 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach((point) => this.ctx.lineTo(point.x, point.y));
        this.ctx.stroke();
        this.ctx.closePath();
      }
    } else if (shape.type === "circle") {
      this.ctx.beginPath();
      this.ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.closePath();
    } else if (shape.type === "move") {
      const movedShape = this.getMovedShape(shape);
      this.drawShape(movedShape);
    }
  
    this.ctx.restore();
  }

  getMovedShape(moveShape: Shape & { type: "move" }): Shape {
    const { shape, offsetX, offsetY } = moveShape;
    const movedShape = {
      ...shape,
      ...(shape.type !== "move" && "lineWidth" in shape && {
        color: shape.color,
        lineWidth: shape.lineWidth
      })
    };
    switch (shape.type) {
      case "rect":
        return {
          ...shape,
          x: shape.x + offsetX,
          y: shape.y + offsetY,
        };
      case "circle":
        return {
          ...shape,
          centerX: shape.centerX + offsetX,
          centerY: shape.centerY + offsetY,
        };
      case "pencil":
        return {
          ...shape,
          points: shape.points.map((point) => ({
            x: point.x + offsetX,
            y: point.y + offsetY,
          })),
        };
      default:
        return shape;
    }
  }

  private wheelHandler = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      // Zoom when Ctrl/Cmd is pressed
      this.zoom(e.deltaY, x, y);
    } else {
      // Pan otherwise
      this.pan(-e.deltaX, -e.deltaY);
    }
  };

  private keyDownHandler = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      this.isPanning = true;
      this.canvas.style.cursor = "grab";
    }
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      this.isPanning = false;
      this.canvas.style.cursor = this.selectedTool === "move" ? "move" : "crosshair";
    }
  };



  mouseDownHandler = (e: MouseEvent) => {
    this.clicked = true;
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isPanning) {
      this.lastPanX = screenX;
      this.lastPanY = screenY;
      return;
    }

    const canvasPoint = this.screenToCanvas(screenX, screenY);
    this.startX = canvasPoint.x;
    this.startY = canvasPoint.y;
    this.currentMouseX = this.startX;
    this.currentMouseY = this.startY;

    if (this.selectedTool === "pencil") {
      this.currentPencilStroke = [{ x: this.startX, y: this.startY }];
    } else if (this.selectedTool === "eraser") {
      this.eraseShape(this.startX, this.startY);
    } else if (this.selectedTool === "move") {
      const shapeToMove = [...this.existingShapes].reverse().find((shape) => {
        if (shape.type === "move") return false;
        if (shape.type === "rect") {
          return (
            this.startX >= shape.x &&
            this.startX <= shape.x + shape.width &&
            this.startY >= shape.y &&
            this.startY <= shape.y + shape.height
          );
        } else if (shape.type === "circle") {
          return (
            Math.hypot(this.startX - shape.centerX, this.startY - shape.centerY) <= shape.radius
          );
        } else if (shape.type === "pencil") {
          return shape.points.some(
            (point) => Math.hypot(this.startX - point.x, this.startY - point.y) <= 10 / this.scale
          );
        }
        return false;
      });

      if (shapeToMove) {
        this.existingShapes = this.existingShapes.filter(
          shape => shape !== shapeToMove && shape.type !== "move"
        );
        
        const moveShape = {
          type: "move" as const,
          shape: shapeToMove,
          offsetX: 0,
          offsetY: 0,
        };
        this.activeShape = moveShape;
        this.existingShapes.push(moveShape);

        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ 
              type: "update", 
              shapes: this.existingShapes,
              isMoving: true 
            }),
            roomId: this.roomId,
          })
        );

        this.redrawCanvas();
      }
    }
  };

  mouseUpHandler = (e: MouseEvent) => {
    if (!this.clicked) return;
  
    this.clicked = false;
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = this.screenToCanvas(screenX, screenY);
  
    if (this.selectedTool === "rect") {
      const width = canvasPoint.x - this.startX;
      const height = canvasPoint.y - this.startY;
      if (Math.abs(width) > 1 && Math.abs(height) > 1) {
        const newShape: Shape = {
          type: "rect",
          x: Math.min(this.startX, canvasPoint.x),
          y: Math.min(this.startY, canvasPoint.y),
          width: Math.abs(width),
          height: Math.abs(height),
          color: this.currentColor,
          lineWidth: this.currentLineWidth,
        };
        this.existingShapes.push(newShape);
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: newShape }),
            roomId: this.roomId,
          })
        );
      }
    } else if (this.selectedTool === "circle") {
      const radius = Math.hypot(canvasPoint.x - this.startX, canvasPoint.y - this.startY);
      if (radius > 1) {
        const newShape: Shape = {
          type: "circle",
          centerX: this.startX,
          centerY: this.startY,
          radius,
          color: this.currentColor,
          lineWidth: this.currentLineWidth,
        };
        this.existingShapes.push(newShape);
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: newShape }),
            roomId: this.roomId,
          })
        );
      }
    } else if (this.selectedTool === "pencil" && this.currentPencilStroke.length > 1) {
      const newShape: Shape = {
        type: "pencil",
        points: this.currentPencilStroke,
        color: this.currentColor,
        lineWidth: this.currentLineWidth,
      };
      this.existingShapes.push(newShape);
      this.socket.send(
        JSON.stringify({
          type: "chat",
          message: JSON.stringify({ shape: newShape }),
          roomId: this.roomId,
        })
      );
    } else if (this.selectedTool === "move" && this.activeShape) {
      const moveShape = this.activeShape as Shape & { type: "move" };
      const finalShape = this.getMovedShape(moveShape);
      
      // Remove any existing move shapes
      this.existingShapes = this.existingShapes.filter(shape => shape.type !== "move");
      
      // Add the final shape
      this.existingShapes.push(finalShape);
      
      // Sync with other users
      // this.socket.send(
      //   JSON.stringify({
      //     type: "chat",
      //     message: JSON.stringify({ type: "update", shapes: this.existingShapes }),
      //     roomId: this.roomId,
      //   })
      // );
      this.socket.send(
        JSON.stringify({
          type: "chat",
          message: JSON.stringify({ 
            type: "update", 
            shapes: this.existingShapes,
            isMoving: false // Flag to indicate movement is complete
          }),
          roomId: this.roomId,
        })
      );
      this.activeShape = null;
    }
  
    this.redrawCanvas();
  };
// ... [previous code remains the same until the mouseMoveHandler method]

mouseMoveHandler = (e: MouseEvent) => {
  const rect = this.canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  if (this.clicked && this.isPanning) {
    const deltaX = screenX - this.lastPanX;
    const deltaY = screenY - this.lastPanY;
    this.pan(deltaX, deltaY);
    this.lastPanX = screenX;
    this.lastPanY = screenY;
    return;
  }

  const canvasPoint = this.screenToCanvas(screenX, screenY);
  this.currentMouseX = canvasPoint.x;
  this.currentMouseY = canvasPoint.y;

  if (!this.clicked) return;

  if (this.selectedTool === "rect") {
    this.redrawCanvas();
    const width = canvasPoint.x - this.startX;
    const height = canvasPoint.y - this.startY;
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.strokeRect(
      Math.min(this.startX, canvasPoint.x),
      Math.min(this.startY, canvasPoint.y),
      Math.abs(width),
      Math.abs(height)
    );
    this.ctx.restore();
  } else if (this.selectedTool === "circle") {
    this.redrawCanvas();
    const radius = Math.hypot(canvasPoint.x - this.startX, canvasPoint.y - this.startY);
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.beginPath();
    this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.closePath();
    this.ctx.restore();
  } else if (this.selectedTool === "pencil") {
    this.currentPencilStroke.push({ x: canvasPoint.x, y: canvasPoint.y });
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.beginPath();
    this.ctx.moveTo(this.currentPencilStroke[0].x, this.currentPencilStroke[0].y);
    this.currentPencilStroke.forEach((point) => this.ctx.lineTo(point.x, point.y));
    this.ctx.stroke();
    this.ctx.closePath();
    this.ctx.restore();
  } else if (this.selectedTool === "eraser") {
    this.eraseShape(canvasPoint.x, canvasPoint.y);
  } else if (this.selectedTool === "move" && this.activeShape) {
    const moveShape = this.activeShape as Shape & { type: "move" };
    moveShape.offsetX = canvasPoint.x - this.startX;
    moveShape.offsetY = canvasPoint.y - this.startY;
    const shapes = this.existingShapes.map(shape => {
      if (shape === this.activeShape) {
        return moveShape;
      }
      return shape;
    });

    this.socket.send(
      JSON.stringify({
        type: "chat",
        message: JSON.stringify({ 
          type: "update", 
          shapes: shapes,
          isMoving: true // Flag to indicate ongoing movement
        }),
        roomId: this.roomId,
      })
    );
    this.redrawCanvas();
  }
};

eraseShape(x: number, y: number) {
  const threshold = 10 / this.scale; // Adjust threshold based on zoom level
  const previousShapesCount = this.existingShapes.length;
  
  this.existingShapes = this.existingShapes.filter((shape) => {
    if (shape.type === "rect") {
      return !(x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height);
    } else if (shape.type === "circle") {
      return Math.hypot(x - shape.centerX, y - shape.centerY) > shape.radius;
    } else if (shape.type === "pencil") {
      return shape.points.every((point) => Math.hypot(x - point.x, y - point.y) > threshold);
    }
    return true;
  });

  // If shapes were actually erased, sync with other users
  if (previousShapesCount !== this.existingShapes.length) {
    this.socket.send(
      JSON.stringify({
        type: "chat",
        message: JSON.stringify({ type: "update", shapes: this.existingShapes }),
        roomId: this.roomId,
      })
    );
  }

  this.redrawCanvas();
}

initMouseHandlers() {
  this.canvas.addEventListener("mousedown", this.mouseDownHandler);
  this.canvas.addEventListener("mouseup", this.mouseUpHandler);
  this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
}

initZoomHandlers() {
  this.canvas.addEventListener("wheel", this.wheelHandler);
  window.addEventListener("keydown", this.keyDownHandler);
  window.addEventListener("keyup", this.keyUpHandler);
}
}
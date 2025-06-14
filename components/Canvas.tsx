import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Circle, Pencil, RectangleHorizontalIcon, Eraser, Move, Trash2, Code, Cross, CodeSquareIcon, Code2Icon, MoveLeft, AlignLeft, ChevronLast, ChevronLeft, RectangleHorizontal, ChevronDown } from "lucide-react";
import { Game } from "@/draw/Game";
import axios from "axios";
import { HTTP_Backend } from "@/config";
import { MonacoEditor } from "@/app/editor-comp/editor";
import { VoiceChat } from "./VoiceChat";
import { Topbar } from "./Topbar";

export type Tool = "circle" | "rect" | "pencil" | "eraser" | "move";

export function Canvas({
  roomId,
  socket,
}: {
  socket: WebSocket;
  roomId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game>();
  const [selectedTool, setSelectedTool] = useState<Tool>("circle");
  const [language, setLanguage] = useState<"javascript" | "python" | "cpp">("javascript");
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    game?.setTool(selectedTool);
  }, [selectedTool, game]);

  useEffect(() => {
    if (canvasRef.current) {
      const g = new Game(canvasRef.current, roomId, socket);
      setGame(g);

      return () => {
        g.destroy();
      };
    }
  }, [canvasRef]);

  return (
    <div className="h-screen relative flex overflow-hidden">
      {showEditor && (
        <div className={`h-full fixed w-1/4 left-0 top-0 transform transition-transform duration-300 z-20 overflow-hidden`}>
          <MonacoEditor
            roomId={roomId}
            socket={socket}
            language={language}
            onLanguageChange={setLanguage}
          />
  
          {/* The new button on the right of the editor */}
          <button onClick={() => setShowEditor(false)} className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors">
            <ChevronLeft />
          </button>
        </div>
      )}
  
      {!showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="fixed left-4 top-4 z-30 bg-black rounded-xl shadow-lg p-3 hover:bg-gray-700 transition-colors"
        >
          <Code2Icon className="w-5 h-5" />
        </button>
      )}

      <VoiceChat roomId={roomId} socket={socket} />
  
      <div className={`h-full w-full transition-all duration-300 ${showEditor ? "pl-1/2" : ""}`}>
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight}
          className="absolute top-0 left-0"
        />
        <Topbar
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          game={game}
          roomId={roomId}
        />
      </div>
    </div>
  );
}


export async function clearCanvas(roomId: string,game?: Game) {
    const response = await axios.post(`${HTTP_Backend}/clear`, {
        data: {
            roomId
        }
    })
    if (response.status === 200) {
        console.log("Canvas cleared successfully!");
        window.location.reload();
      }
}
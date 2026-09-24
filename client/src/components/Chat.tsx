import React, { useState, useEffect, useRef } from "react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatProps {
  roomId: string;
  playerId: string;
  chatList?: Array<{ text: string; sender: string; timestamp?: number }>;
  playerNames?: Record<string, string>;
  onSendMessage?: (text: string) => Promise<boolean | void>;
}

export const Chat: React.FC<ChatProps> = ({
  roomId,
  playerId,
  chatList: externalChatList,
  playerNames,
  onSendMessage,
}) => {
  // If external chatList is not provided, fall back to hook (standalone usage)
  const hookResult = !externalChatList ? useGameRoom(roomId, playerId) : null;
  const chatList = externalChatList || (hookResult?.roomData?.chat as any) || [];
  const sendMessage = onSendMessage || (async (text: string) => {
    if (hookResult?.sendMessage) {
      await hookResult.sendMessage(roomId, { text });
    }
  });

  const [text, setText] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // scroll to bottom on new messages
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatList.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const msg = text.trim();
    setText("");
    await sendMessage(msg);
  };

  const getSenderName = (senderId: string) => {
    if (senderId === playerId) return "You";
    if (senderId === "sat_bot") return "SAT Bot 🤖";
    if (playerNames && playerNames[senderId] && playerNames[senderId] !== "You") {
      return playerNames[senderId];
    }
    return "Opponent";
  };

  return (
    <div className="chat-panel neon-container rounded-lg p-3 border border-zinc-800 bg-zinc-950/70">
      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-500 neon-text mb-2 px-1">
        Match Chat
      </div>
      <div
        ref={containerRef}
        className="chat-messages space-y-2 mb-3 pr-1"
        style={{ maxHeight: 160, overflowY: "auto" }}
      >
        {chatList.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1">No messages yet. Say hello!</p>
        ) : (
          chatList.map((m: any, idx: number) => {
            const isYou = m.sender === playerId;
            return (
              <div
                key={idx}
                className={`p-2 rounded-md text-sm ${
                  isYou
                    ? "bg-emerald-950/40 border border-emerald-800/40 ml-4"
                    : "bg-zinc-900 border border-zinc-800 mr-4"
                }`}
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <strong className={isYou ? "text-emerald-400" : "text-cyan-400"}>
                    {getSenderName(m.sender)}
                  </strong>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-zinc-200 text-xs break-words">{m.text}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Send a message..."
          className="h-9 text-xs bg-zinc-900 border-zinc-700"
        />
        <Button size="sm" onClick={handleSend} className="h-9 px-3">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default Chat;

import React, { useState, useEffect, useRef } from "react";
import { useGameRoom } from "@/hooks/useGameRoom";

interface ChatProps {
  roomId: string;
  playerId: string;
}

export const Chat: React.FC<ChatProps> = ({ roomId, playerId }) => {
  const { roomData, sendMessage } = useGameRoom(roomId, playerId) as any;
  const [text, setText] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const chatList: Array<any> = (roomData && (roomData as any).chat) || [];

  useEffect(() => {
    // scroll to bottom on new messages
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatList.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(roomId, { text: text.trim() });
    setText("");
  };

  return (
    <div className="chat-panel">
      <div ref={containerRef} className="chat-messages" style={{ maxHeight: 200, overflowY: "auto", padding: 8 }}>
        {chatList.map((m: any, idx: number) => (
          <div key={idx} className={`chat-message ${m.sender === playerId ? "you" : "other"}`}>
            <div className="chat-meta">
              <strong>{m.sender === playerId ? "You" : m.sender}</strong>
              <span className="chat-time">{new Date(m.timestamp || Date.now()).toLocaleTimeString()}</span>
            </div>
            <div className="chat-text">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="chat-input" style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Message the room..."
          className="input"
        />
        <button onClick={handleSend} className="btn">
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;

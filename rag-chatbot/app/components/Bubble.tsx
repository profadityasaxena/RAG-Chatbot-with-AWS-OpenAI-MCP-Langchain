import React from "react";
import type { Message } from "ai/react";

type BubbleProps = {
  message: Message;
};

const Bubble = ({ message }: BubbleProps) => {
  return (
    <div className="bubble">
      <strong>{message.role === "user" ? "You" : "Bot"}:</strong> {message.content}
    </div>
  );
};

export default Bubble;
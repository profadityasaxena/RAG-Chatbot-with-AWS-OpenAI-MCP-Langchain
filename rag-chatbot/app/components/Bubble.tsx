import React from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "ai/react";

type BubbleProps = {
  message: Message;
};

const Bubble = ({ message }: BubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div className={`bubble ${isUser ? "user" : "assistant"}`}>
      <strong>{isUser ? "You" : "Bot"}:</strong>
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  );
};

export default Bubble;
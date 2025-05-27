"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import logo from "./assets/logo.png";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";

const Home = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [showIntro, setShowIntro] = useState(true);

  const noMessages = messages.length === 0;

  const logoRef = useRef(null);
  const chatRef = useRef(null);
  const bubblesRef = useRef([]);
  const introRef = useRef(null);

  // Intro animation effect
  useEffect(() => {
    const tl = gsap.timeline();
  
    // Step 1: Show intro full screen
    tl.fromTo(
      introRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.5, ease: "power2.out" }
    );
  
    // Step 2: Wait, then hide intro and reveal main content
    tl.to(introRef.current, {
      opacity: 0,
      duration: 1,
      delay: 1.8,
      y: -50,
      ease: "power2.inOut",
      onComplete: () => setShowIntro(false),
    });
  
    // Step 3: Animate logo
    tl.from(logoRef.current, {
      opacity: 0,
      y: -40,
      duration: 1,
      ease: "power2.out",
    });
  
    // Step 4: Animate chat section
    tl.from(chatRef.current, {
      opacity: 0,
      y: 20,
      duration: 1,
      ease: "power2.out",
    }, "-=0.5"); // slight overlap
  }, []);
  
  // Logo and main container animation
  useEffect(() => {
    gsap.from(logoRef.current, { opacity: 0, y: -40, duration: 1 });
    gsap.from(chatRef.current, { opacity: 0, y: 20, duration: 1, delay: 0.5 });
  }, []);

  // Bubble animation
  useEffect(() => {
    if (bubblesRef.current.length > 0) {
      gsap.from(bubblesRef.current[bubblesRef.current.length - 1], {
        opacity: 0,
        x: 40,
        duration: 0.6,
        ease: "power2.out",
      });
    }
  }, [messages]);

  const handleInputChange = (e) => setInput(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setCurrentResponse("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMessage] }),
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      setCurrentResponse((prev) => prev + chunk);
    }

    setMessages((prev) => [...prev, { role: "assistant", content: fullText }]);
    setIsLoading(false);
  };

  const onPromptClick = (prompt) => {
    setInput(prompt);
    handleSubmit({ preventDefault: () => {} });
  };

  return (
    <>
      {/* Intro Overlay */}
      {showIntro && (
  <div
    ref={introRef}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "#ffffff",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      fontFamily: "Verdana, sans-serif",
    }}
  >
    <h1 style={{ fontSize: "3rem", marginBottom: "1rem", color: "#111" }}>
      Aditya Saxena
    </h1>
    <p style={{ fontSize: "1.2rem", color: "#444", maxWidth: "600px", padding: "0 20px" }}>
      This AI Assistant was built as a tutorial using OpenAI, TypeScript, Next.js, and Astra DB with Vector Search.
    </p>
  </div>
)}

      <main>
        <div ref={logoRef}>
          <Image src={logo} alt="Logo" width={600} height={100} />
        </div>
        <hr />

        <section className={noMessages ? "" : "populated"} ref={chatRef}>
          {noMessages ? (
            <>
              <p className="starter-text">
                Welcome to Aditya Saxena’s personal chatbot. This platform is
                designed to provide you with an interactive and informative
                overview of my professional journey.
              </p>
              <br />
              <PromptSuggestionsRow onPromptClick={onPromptClick} />
            </>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  ref={(el) => (bubblesRef.current[index] = el)}
                >
                  <Bubble message={msg} />
                </div>
              ))}
              {isLoading && <LoadingBubble />}
              {isLoading && currentResponse && (
                <Bubble message={{ role: "assistant", content: currentResponse }} />
              )}
            </>
          )}
        </section>

        <form onSubmit={handleSubmit}>
          <input
            className="question-box"
            onChange={handleInputChange}
            value={input}
            placeholder="What's your query?"
          />
          <input className="question-submit" type="submit" value="Send" />
        </form>
      </main>
    </>
  );
};

export default Home;
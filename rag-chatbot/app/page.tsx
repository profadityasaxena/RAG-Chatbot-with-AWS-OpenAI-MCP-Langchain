"use client";

import Image from "next/image";
import logo from "./assets/logo.png";
import { useChat } from "ai/react";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";

const Home = () => {
  const { append, isLoading, messages, input, handleInputChange, handleSubmit } = useChat();

  const noMessages = messages.length === 0;

  return (
    <main>
      <Image src={logo} alt="Logo" width={600} height={100} />
      <hr />

      <section className={noMessages ? "" : "populated"}>
        {noMessages ? (
          <>
            <p className="starter-text">
              Welcome to Aditya Saxena’s personal chatbot. This platform is designed to provide you with an interactive and informative overview of my professional journey. You can explore details about my educational background, work experience, achievements, certifications, technical skills, and current projects. Whether you’re a recruiter, collaborator, or industry peer, this chatbot offers a quick and comprehensive way to understand my profile, qualifications, and areas of expertise.
            </p>
            <br />
            <PromptSuggestionsRow />
          </>
        ) : (
          <>
            {/* Map messages onto text bubbles */}
            {messages.map((message, index) => (
                <Bubble key={`message-${index}`} message={message} />
            ))}

            {/* If the last message is from the user, show a loading bubble */}

            {/* Show animated loading bubble while waiting for reply */}
            {isLoading && <LoadingBubble />}
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
  );
};

export default Home;
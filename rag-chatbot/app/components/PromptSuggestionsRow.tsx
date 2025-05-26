import React from 'react';
import PromptSuggestionButton from './PromptSuggestionButton';

const PromptSuggestionsRow = () => {
  const prompts = [
    "What is your educational background?",
    "Tell me about your work experience.",
    "What are your key achievements?",
    "What certifications do you hold?",
    "What technical skills do you possess?",
    "What projects are you currently working on?"
  ];

  return (
    <div className="prompt-suggestions-row">
      {prompts.map((prompt, index) => (
        <PromptSuggestionButton key={index} prompt={prompt} />
      ))}
    </div>
  );
};

export default PromptSuggestionsRow;
import React from 'react';

const PromptSuggestionButton = ({ prompt, onClick }) => {
  return (
    <button
      className="prompt-suggestion-button"
      onClick={() => {
        console.log(`Prompt suggestion clicked: ${prompt}`);
        if (onClick) onClick(prompt);
      }}
    >
      {prompt}
    </button>
  );
};

export default PromptSuggestionButton;
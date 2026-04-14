/*
 * Copyright 2026 UCP Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type React from "react";
import { useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  theme?: string;
}

function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-label="Send"
      role="img"
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
  );
}

function ChatInput({ onSendMessage, isLoading, theme }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  if (theme === "gemini") {
    return (
      <div className="bg-[#131314] p-3 flex-shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center bg-[#1e1f20] rounded-full px-4 py-2 max-w-4xl mx-auto gap-2"
        >
          <button type="button" className="text-gray-400 hover:text-white flex items-center justify-center">
            <span className="material-symbols-outlined">add</span>
          </button>
          <button type="button" className="text-gray-400 hover:text-white flex items-center justify-center ml-1">
            <span className="material-symbols-outlined text-xl">shield</span>
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter a prompt for Gemini"
            className="flex-grow bg-transparent text-white focus:outline-none placeholder-gray-500 p-2"
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="w-10 h-10 bg-[#1a73e8] text-white rounded-full flex items-center justify-center disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
            aria-label="Send message"
          >
            <span className="material-symbols-outlined">{isLoading ? 'stop' : 'arrow_upward'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white p-3 border-t border-gray-200 shadow-t-sm flex-shrink-0">
      <form
        onSubmit={handleSubmit}
        className="flex items-center space-x-3 max-w-4xl mx-auto"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition"
          disabled={isLoading}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="bg-[var(--primary-color)] text-white p-3 rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-offset-2"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

export default ChatInput;

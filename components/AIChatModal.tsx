'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/useSpeechRecognition';
import { useAIChat, Message } from '@/hooks/useAIChat';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Required - identifies what we're chatting about
  chatType: string;

  // Context parameters - each parent passes what it has
  insightsId?: number | string;
  recommendationId?: number | string;
  teamName?: string;
  piName?: string;
  promptName?: string;
}

interface ChatHeaderProps {
  onClose: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
  hasInitialMessage: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

interface ChatInputProps {
  inputValue: string;
  loading: boolean;
  isListening: boolean;
  speechError: string | null;
  speechLanguage: SpeechLanguage;
  isSpeechRecognitionSupported: boolean;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onToggleListening: () => void;
  onSpeechErrorDismiss: () => void;
  onSpeechLanguageChange: (lang: SpeechLanguage) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose, onMouseDown }) => (
  <div
    className="flex items-center justify-between p-3 border-b border-gray-200 select-none md:cursor-move bg-gray-100 text-gray-900 rounded-t-lg"
    onMouseDown={onMouseDown}
  >
    <h3 className="text-sm font-semibold">AI Chat</h3>
    <button
      onClick={onClose}
      className="text-gray-600 hover:text-gray-800 transition-colors"
      aria-label="Close"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  loading,
  hasInitialMessage,
  messagesEndRef,
}) => (
  <div className="flex-1 overflow-y-auto p-4 min-h-[400px] space-y-4">
    {messages.length === 0 && !loading && !hasInitialMessage && (
      <div className="text-center text-gray-500 text-sm mt-8">
        Loading...
      </div>
    )}

    {messages.map((message, index) => (
      <div
        key={index}
        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[75%] rounded-lg px-4 py-2 ${
            message.role === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {message.role === 'assistant' ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside text-sm mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside text-sm mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-gray-200 px-1 rounded text-sm font-mono">{children}</code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-200 p-2 rounded text-sm overflow-x-auto mb-2">{children}</pre>
                ),
                h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-gray-300 pl-2 italic text-sm mb-2">{children}</blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    ))}

    {loading && (
      <div className="flex justify-center text-gray-500 text-sm italic">
        Sending your request to the LLM
      </div>
    )}

    <div ref={messagesEndRef} />
  </div>
);

const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  loading,
  isListening,
  speechError,
  speechLanguage,
  isSpeechRecognitionSupported,
  onInputChange,
  onKeyDown,
  onSend,
  onToggleListening,
  onSpeechErrorDismiss,
  onSpeechLanguageChange,
}) => (
  <div className="p-4 border-t border-gray-200">
    {speechError && (
      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
        {speechError}
        <button
          onClick={onSpeechErrorDismiss}
          className="ml-2 text-red-500 hover:text-red-700"
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
    )}

    <div className="flex items-end space-x-2">
      <div className="flex-1 relative">
        <textarea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your question here... (Press Enter to send, Shift+Enter for new line)"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading || isListening}
        />
        {isSpeechRecognitionSupported && (
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <select
              value={speechLanguage}
              onChange={(e) => onSpeechLanguageChange(e.target.value as SpeechLanguage)}
              disabled={loading || isListening}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Select speech recognition language"
            >
              <option value="auto">Auto (EN/HE)</option>
              <option value="en-US">English</option>
              <option value="he-IL">עברית (Hebrew)</option>
            </select>
            <button
              onClick={onToggleListening}
              disabled={loading}
              className={`p-2 rounded-full transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={isListening ? 'Stop recording' : 'Start voice input'}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm7.3-3.86c-.35-.35-.92-.35-1.27 0l-2.12 2.12c-.35.35-.35.92 0 1.27.35.35.92.35 1.27 0l2.12-2.12c.35-.35.35-.92 0-1.27zm-14.6 0c-.35.35-.35.92 0 1.27l2.12 2.12c.35.35.92.35 1.27 0 .35-.35.35-.92 0-1.27L5.03 10.14c-.35-.35-.92-.35-1.27 0zM12 16c-2.21 0-4-1.79-4-4h2c0 1.1.9 2 2 2s2-.9 2-2h2c0 2.21-1.79 4-4 4z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onSend}
        disabled={!inputValue.trim() || loading || isListening}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
      >
        Send
      </button>
    </div>
  </div>
);

export default function AIChatModal({
  isOpen,
  onClose,
  chatType,
  insightsId,
  recommendationId,
  teamName,
  piName,
  promptName,
}: AIChatModalProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const finalTranscriptRef = useRef<string>('');

  const {
    messages,
    loading,
    hasInitialMessage,
    sendMessage,
  } = useAIChat({
    isOpen,
    chatType,
    insightsId,
    recommendationId,
    teamName,
    piName,
    promptName,
  });

  const speech = useSpeechRecognition({
    loading,
    getInitialText: () => inputValue,
    onTextChange: (text) => {
      setInputValue(text);
      finalTranscriptRef.current = text;
    },
  });

  const onHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return;
    if (!panelRef.current) return;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - dragPos.x,
      y: e.clientY - dragPos.y,
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !panelRef.current) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = panelRef.current.getBoundingClientRect();
    const panelWidth = rect.width;
    const panelHeight = rect.height;

    let nextX = e.clientX - dragOffsetRef.current.x;
    let nextY = e.clientY - dragOffsetRef.current.y;

    const maxX = viewportWidth - panelWidth / 2;
    const minX = -maxX;
    const maxY = viewportHeight - panelHeight / 2;
    const minY = -maxY;

    if (nextX > maxX) nextX = maxX;
    if (nextX < minX) nextX = minX;
    if (nextY > maxY) nextY = maxY;
    if (nextY < minY) nextY = minY;

    setDragPos({ x: nextX, y: nextY });
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', onMouseMove);
  };

  // Reset local input + speech when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      finalTranscriptRef.current = '';
      speech.reset();
    }
  }, [isOpen, speech]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const question = inputValue.trim();
    if (!question || loading) return;

    if (speech.isListening) {
      speech.stopListening();
    }

    setInputValue('');
    finalTranscriptRef.current = '';
    await sendMessage(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={panelRef}
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col"
        style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}
      >
        <ChatHeader onClose={onClose} onMouseDown={onHeaderMouseDown} />

        <ChatMessages
          messages={messages}
          loading={loading}
          hasInitialMessage={hasInitialMessage}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          inputValue={inputValue}
          loading={loading}
          isListening={speech.isListening}
          speechError={speech.error}
          speechLanguage={speech.language}
          isSpeechRecognitionSupported={speech.isSupported}
          onInputChange={setInputValue}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          onToggleListening={speech.toggleListening}
          onSpeechErrorDismiss={() => speech.setError(null)}
          onSpeechLanguageChange={(newLang) => {
            speech.setLanguage(newLang);
            if (speech.isListening) {
              speech.stopListening();
              setTimeout(() => speech.startListening(), 100);
            }
          }}
        />
      </div>
    </div>
  );
}


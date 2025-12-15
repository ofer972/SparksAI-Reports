'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiService } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseAIChatParams {
  isOpen: boolean;
  chatType: string;
  insightsId?: number | string;
  recommendationId?: number | string;
  teamName?: string;
  piName?: string;
  promptName?: string;
}

interface UseAIChatResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasInitialMessage: boolean;
  sendMessage: (question: string) => Promise<void>;
  reset: () => void;
}

export function useAIChat(params: UseAIChatParams): UseAIChatResult {
  const { isOpen, chatType, insightsId, recommendationId, teamName, piName, promptName } = params;
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [hasInitialMessage, setHasInitialMessage] = useState(false);

  const apiService = useRef(new ApiService());
  const lastInitialSentAtRef = useRef<number>(0);
  const typingTimerRef = useRef<number | null>(null);

  const buildChatRequest = useCallback((
    question: string,
    convId: string | null
  ) => {
    const request: any = {
      question: question,
      user_id: user?.user_id || '',
      selected_team: teamName || '',
      selected_pi: piName || '',
      chat_type: chatType,
      recommendation_id: recommendationId !== undefined && recommendationId !== null ? String(recommendationId) : '',
      insights_id: insightsId !== undefined && insightsId !== null ? String(insightsId) : '',
    };

    if (promptName && promptName.trim() !== '' && promptName !== '[use default]') {
      request.prompt_name = promptName;
    }

    if (convId && convId.trim() !== '') {
      request.conversation_id = convId;
    }

    return request;
  }, [chatType, insightsId, recommendationId, teamName, piName, promptName, user]);

  const startTypewriter = useCallback((fullText: string, append: boolean = false) => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const words = (fullText || '').split(/(\s+)/);

    if (append) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    } else {
      setMessages([{ role: 'assistant', content: '' }]);
    }

    let index = 0;
    typingTimerRef.current = window.setInterval(() => {
      index += 1;
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const current = updated[lastIdx];
        if (!current || current.role !== 'assistant') return updated;
        const nextContent = words.slice(0, index).join('');
        updated[lastIdx] = { ...current, content: nextContent };
        return updated;
      });
      if (index >= words.length) {
        if (typingTimerRef.current) {
          window.clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
      }
    }, 30);
  }, []);

  const sendInitialMessage = useCallback(async () => {
    const now = Date.now();
    if (now - lastInitialSentAtRef.current < 500) {
      return;
    }
    lastInitialSentAtRef.current = now;

    setHasInitialMessage(true);
    setLoading(true);
    setError(null);
    setConversationId('');

    try {
      const initialQuestion = '';
      const requestPayload = buildChatRequest(initialQuestion, null);
      const response = await apiService.current.chatWithInsight(requestPayload);

      if (response.success && response.data) {
        const convId = response.data.input_parameters?.conversation_id || '';
        if (convId) {
          setConversationId(convId);
        }

        startTypewriter(response.data.response || '', false);
      } else {
        throw new Error(response.message || 'Failed to get AI response');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error sending initial chat message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setError(errorMessage);

      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${errorMessage}`,
      };
      setMessages([errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [buildChatRequest, startTypewriter]);

  const sendMessage = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const requestPayload = buildChatRequest(trimmed, conversationId);
      const response = await apiService.current.chatWithInsight(requestPayload);

      if (response.success && response.data) {
        const convId = response.data.input_parameters?.conversation_id || '';
        if (convId) {
          setConversationId(convId);
        }

        startTypewriter(response.data.response || '', true);
      } else {
        throw new Error(response.message || 'Failed to get AI response');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error sending chat message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setError(errorMessage);

      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${errorMessage}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [buildChatRequest, conversationId, loading, startTypewriter]);

  const reset = useCallback(() => {
    setMessages([]);
    setLoading(false);
    setError(null);
    setConversationId('');
    setHasInitialMessage(false);
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen && !hasInitialMessage) {
      sendInitialMessage();
    }
  }, [isOpen, hasInitialMessage, sendInitialMessage]);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  return {
    messages,
    loading,
    error,
    hasInitialMessage,
    sendMessage,
    reset,
  };
}

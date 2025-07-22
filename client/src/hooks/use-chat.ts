import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ChatMessage, CategorySelectionResponse, ChatResponse } from '@/types/chat';

export function useChat(sessionId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();

  // Get chat messages
  const { data: messagesResponse, isLoading } = useQuery<{success: boolean, messages: ChatMessage[]}>({
    queryKey: ['/api/chat/messages', sessionId],
    enabled: !!sessionId,
  });

  const messages = messagesResponse?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsTyping(true);
      const response = await apiRequest('POST', '/api/chat/send', {
        message,
        session_id: sessionId,
      });
      return response.json() as Promise<ChatResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', sessionId] });
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  // Select categories mutation
  const selectCategoriesMutation = useMutation({
    mutationFn: async (categories: string[]) => {
      const response = await apiRequest('POST', '/api/chat/select-categories', {
        categories,
        session_id: sessionId,
      });
      return response.json() as Promise<CategorySelectionResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/status', sessionId] });
    },
  });

  const sendMessage = useCallback((message: string) => {
    sendMessageMutation.mutate(message);
  }, [sendMessageMutation]);

  const selectCategories = useCallback((categories: string[]) => {
    selectCategoriesMutation.mutate(categories);
  }, [selectCategoriesMutation]);

  return {
    messages,
    isLoading,
    isTyping,
    isSending: sendMessageMutation.isPending,
    isSelectingCategories: selectCategoriesMutation.isPending,
    sendMessage,
    selectCategories,
    error: sendMessageMutation.error || selectCategoriesMutation.error,
  };
}

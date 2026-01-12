
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  Text,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { StreamdownRN } from 'streamdown-rn';
import { BACKEND_URL, apiGet } from '@/utils/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hey there! I\'m your buddy. How are you doing today? Feel free to talk to me about anything! 😊',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(params.conversationId || null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Load conversation history if conversationId is provided
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!conversationId) return;

      try {
        setIsLoadingHistory(true);
        console.log('[Chat] Loading conversation history:', conversationId);
        const history = await apiGet<Message[]>(`/api/conversations/${conversationId}/messages`);
        console.log('[Chat] Loaded conversation history:', history);
        
        if (history && history.length > 0) {
          setMessages(history);
        }
      } catch (error) {
        console.error('[Chat] Error loading conversation history:', error);
        // Keep the default welcome message if loading fails
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadConversationHistory();
  }, [conversationId]);

  const sendMessageWithXHR = (userMessage: Message, assistantMessageId: string) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BACKEND_URL}/api/chat/stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      let accumulatedContent = '';
      let lastProcessedIndex = 0;

      xhr.onprogress = () => {
        const responseText = xhr.responseText;
        const newText = responseText.substring(lastProcessedIndex);
        lastProcessedIndex = responseText.length;

        const lines = newText.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.chunk) {
                accumulatedContent += parsed.chunk;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }

              if (parsed.conversationId && !conversationId) {
                setConversationId(parsed.conversationId);
              }

              if (parsed.done) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.log('[Chat] Error parsing SSE data:', e);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Request failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network request failed'));
      };

      xhr.send(JSON.stringify({
        message: userMessage.content,
        conversationId: conversationId,
      }));
    });
  };

  const sendMessageWithFetch = async (userMessage: Message, assistantMessageId: string) => {
    console.log('[Chat] Sending message to backend:', BACKEND_URL);
    const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage.content,
        conversationId: conversationId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    let accumulatedContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.chunk) {
              accumulatedContent += parsed.chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            }

            if (parsed.conversationId && !conversationId) {
              setConversationId(parsed.conversationId);
            }

            if (parsed.done) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              );
            }
          } catch (e) {
            console.log('[Chat] Error parsing SSE data:', e);
          }
        }
      }
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Use XMLHttpRequest for iOS, fetch for other platforms
      if (Platform.OS === 'ios') {
        console.log('[Chat] Using XMLHttpRequest for iOS streaming');
        await sendMessageWithXHR(userMessage, assistantMessageId);
      } else {
        console.log('[Chat] Using fetch for streaming');
        await sendMessageWithFetch(userMessage, assistantMessageId);
      }
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      const errorMessage = error instanceof Error 
        ? `Sorry, I had trouble responding: ${error.message}` 
        : 'Sorry, I had trouble responding. Please try again!';
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: errorMessage,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const colors = {
    background: isDark ? '#0A0E1A' : '#F5F7FA',
    card: isDark ? '#1A1F2E' : '#FFFFFF',
    userBubble: isDark ? '#4A5FFF' : '#5B7CFF',
    assistantBubble: isDark ? '#1E2433' : '#E8ECFF',
    text: isDark ? '#FFFFFF' : '#1A1F2E',
    textSecondary: isDark ? '#A0A8C0' : '#6B7280',
    inputBackground: isDark ? '#1A1F2E' : '#FFFFFF',
    border: isDark ? '#2A3142' : '#E5E7EB',
    sendButton: '#5B7CFF',
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Chat with Buddy',
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {isLoadingHistory ? (
            <View style={styles.loadingHistoryContainer}>
              <ActivityIndicator size="large" color={colors.sendButton} />
              <Text style={[styles.loadingHistoryText, { color: colors.textSecondary }]}>
                Loading conversation...
              </Text>
            </View>
          ) : (
            messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? [styles.userBubble, { backgroundColor: colors.userBubble }]
                  : [styles.assistantBubble, { backgroundColor: colors.assistantBubble }],
              ]}
            >
              {message.role === 'assistant' ? (
                <StreamdownRN theme={isDark ? 'dark' : 'light'}>
                  {message.content}
                </StreamdownRN>
              ) : (
                <StreamdownRN theme="light" style={{ color: '#FFFFFF' }}>
                  {message.content}
                </StreamdownRN>
              )}
              {message.isStreaming && (
                <ActivityIndicator
                  size="small"
                  color={colors.textSecondary}
                  style={styles.streamingIndicator}
                />
              )}
            </View>
          ))
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: colors.sendButton },
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol
                  ios_icon_name="arrow.up"
                  android_material_icon_name="send"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    flexShrink: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  streamingIndicator: {
    marginTop: 8,
  },
  loadingHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 32,
  },
  loadingHistoryText: {
    fontSize: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

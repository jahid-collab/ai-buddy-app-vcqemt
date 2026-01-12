
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { apiGet, apiDelete, BACKEND_URL } from '@/utils/api';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
}

export default function ConversationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = {
    background: isDark ? '#0A0E1A' : '#F5F7FA',
    card: isDark ? '#1A1F2E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F2E',
    textSecondary: isDark ? '#A0A8C0' : '#6B7280',
    border: isDark ? '#2A3142' : '#E5E7EB',
    danger: '#FF3B30',
    primary: '#5B7CFF',
  };

  const fetchConversations = useCallback(async () => {
    try {
      console.log('[Conversations] Fetching conversations from:', BACKEND_URL);
      setError(null);
      const data = await apiGet<Conversation[]>('/api/conversations');
      console.log('[Conversations] Fetched conversations:', data);
      setConversations(data);
    } catch (err) {
      console.error('[Conversations] Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Conversations] Deleting conversation:', id);
              await apiDelete(`/api/conversations/${id}`);
              console.log('[Conversations] Conversation deleted successfully');
              setConversations((prev) => prev.filter((conv) => conv.id !== id));
            } catch (err) {
              console.error('[Conversations] Error deleting conversation:', err);
              Alert.alert('Error', 'Failed to delete conversation. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleOpenConversation = useCallback((conversation: Conversation) => {
    // Navigate to chat screen with conversation ID
    router.push({
      pathname: '/chat',
      params: { conversationId: conversation.id },
    });
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleOpenConversation(item)}
      activeOpacity={0.7}
    >
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.conversationDate, { color: colors.textSecondary }]}>
            {formatDate(item.updatedAt)}
          </Text>
        </View>
        <Text style={[styles.conversationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.lastMessage}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteConversation(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <IconSymbol
          ios_icon_name="trash"
          android_material_icon_name="delete"
          size={20}
          color={colors.danger}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol
        ios_icon_name="bubble.left.and.bubble.right"
        android_material_icon_name="chat"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        Start a new chat to begin your conversation history
      </Text>
      <TouchableOpacity
        style={[styles.startChatButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/chat')}
      >
        <Text style={styles.startChatButtonText}>Start New Chat</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol
        ios_icon_name="exclamationmark.triangle"
        android_material_icon_name="error"
        size={64}
        color={colors.danger}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Error Loading Conversations</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity
        style={[styles.startChatButton, { backgroundColor: colors.primary }]}
        onPress={fetchConversations}
      >
        <Text style={styles.startChatButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Conversations',
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/chat')} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={28}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading conversations...
            </Text>
          </View>
        ) : error ? (
          renderError()
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              conversations.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
    gap: 8,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  conversationDate: {
    fontSize: 12,
  },
  conversationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  startChatButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    marginRight: 8,
  },
});

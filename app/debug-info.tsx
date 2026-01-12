
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { BACKEND_URL, isBackendConfigured, apiGet } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';

export default function DebugInfoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [testResult, setTestResult] = useState<string>('Not tested');
  const [testing, setTesting] = useState(false);

  const colors = {
    background: isDark ? '#0A0E1A' : '#F5F7FA',
    card: isDark ? '#1A1F2E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F2E',
    textSecondary: isDark ? '#A0A8C0' : '#6B7280',
    border: isDark ? '#2A3142' : '#E5E7EB',
    success: '#34C759',
    error: '#FF3B30',
    primary: '#5B7CFF',
  };

  const testBackendConnection = async () => {
    setTesting(true);
    setTestResult('Testing...');
    
    try {
      const conversations = await apiGet('/api/conversations');
      setTestResult(`✅ Success! Backend is reachable. Found ${conversations.length} conversations.`);
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Debug Info',
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Backend Configuration</Text>
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Backend URL:</Text>
              <Text style={[styles.value, { color: colors.text }]} selectable>
                {BACKEND_URL || 'Not configured'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Status:</Text>
              <View style={styles.statusRow}>
                <IconSymbol
                  ios_icon_name={isBackendConfigured() ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                  android_material_icon_name={isBackendConfigured() ? 'check-circle' : 'cancel'}
                  size={20}
                  color={isBackendConfigured() ? colors.success : colors.error}
                />
                <Text style={[styles.value, { color: colors.text }]}>
                  {isBackendConfigured() ? 'Configured' : 'Not configured'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Connection Test</Text>
            
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.primary }]}
              onPress={testBackendConnection}
              disabled={testing || !isBackendConfigured()}
            >
              <Text style={styles.testButtonText}>
                {testing ? 'Testing...' : 'Test Backend Connection'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.resultBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.resultText, { color: colors.text }]}>{testResult}</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>API Endpoints</Text>
            
            <View style={styles.endpointList}>
              <Text style={[styles.endpoint, { color: colors.textSecondary }]}>
                POST /api/chat/stream
              </Text>
              <Text style={[styles.endpoint, { color: colors.textSecondary }]}>
                GET /api/conversations
              </Text>
              <Text style={[styles.endpoint, { color: colors.textSecondary }]}>
                GET /api/conversations/:id/messages
              </Text>
              <Text style={[styles.endpoint, { color: colors.textSecondary }]}>
                DELETE /api/conversations/:id
              </Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Integration Status</Text>
            
            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.success}
                />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Chat streaming integration
                </Text>
              </View>
              <View style={styles.featureRow}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.success}
                />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Conversation history loading
                </Text>
              </View>
              <View style={styles.featureRow}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.success}
                />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Conversation list view
                </Text>
              </View>
              <View style={styles.featureRow}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.success}
                />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Conversation deletion
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoRow: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
  endpointList: {
    gap: 8,
  },
  endpoint: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
});

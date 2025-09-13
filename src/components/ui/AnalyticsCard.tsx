import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useChecklistStore } from '../../stores/checklistStore';
import { Card } from './Card';

export const AnalyticsCard: React.FC = () => {
  const { getFrequentlyMissedItems } = useChecklistStore();
  const missedItems = getFrequentlyMissedItems();

  if (missedItems.length === 0) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 자주 놓치는 항목들</Text>
        <Text style={styles.subtitle}>
          다음에는 꼼꼼히 체크해보세요!
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemsContainer}
      >
        {missedItems.map((item, index) => (
          <View key={`${item.title}-${index}`} style={styles.itemCard}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.stats}>
              <Text style={styles.missRate}>
                {Math.round(item.missRate)}% 누락
              </Text>
              <Text style={styles.count}>
                {item.totalSeen}회 중 {item.missCount}회
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginBottom: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemsContainer: {
    paddingRight: 8,
  },
  itemCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 140,
    minHeight: 80,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
    lineHeight: 18,
  },
  stats: {
    marginTop: 'auto',
  },
  missRate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  count: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
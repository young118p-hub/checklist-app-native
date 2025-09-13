import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useChecklistStore } from '../../stores/checklistStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { RootStackParamList, CreateChecklistData } from '../../types';

type CreateChecklistNavigationProp = StackNavigationProp<RootStackParamList>;

interface ChecklistItemInput {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
}

const CreateChecklistScreen = () => {
  const navigation = useNavigation<CreateChecklistNavigationProp>();
  const { createChecklist, loading } = useChecklistStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    peopleCount: 1,
  });
  
  const [items, setItems] = useState<ChecklistItemInput[]>([
    {
      id: '1',
      title: '',
      description: '',
      quantity: 1,
      unit: '',
    }
  ]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        title: '',
        description: '',
        quantity: 1,
        unit: '',
      }
    ]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  const updateItem = (itemId: string, field: keyof ChecklistItemInput, value: string | number) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('오류', '체크리스트 제목을 입력해주세요.');
      return false;
    }

    const validItems = items.filter(item => item.title.trim());
    if (validItems.length === 0) {
      Alert.alert('오류', '최소 1개 이상의 항목을 입력해주세요.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const validItems = items.filter(item => item.title.trim());
    
    const checklistData: CreateChecklistData = {
      title: formData.title,
      description: formData.description || undefined,
      peopleCount: formData.peopleCount,
      items: validItems.map((item, index) => ({
        title: item.title,
        description: item.description || undefined,
        quantity: item.quantity,
        unit: item.unit || undefined,
        order: index,
      }))
    };

    try {
      await createChecklist(checklistData);
      Alert.alert(
        '체크리스트 생성 완료!',
        '새로운 체크리스트가 생성되었습니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.navigate('MyChecklists' as any),
          },
        ]
      );
    } catch (error) {
      Alert.alert('오류', '체크리스트 생성에 실패했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          
          <Input
            label="체크리스트 제목 *"
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder="예: 캠핑 준비물, 출근 필수템"
          />
          
          <Input
            label="설명 (선택사항)"
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="체크리스트에 대한 간단한 설명"
            multiline
            style={{ minHeight: 80 }}
          />
          
          <View style={styles.peopleCountContainer}>
            <Text style={styles.inputLabel}>인원 수</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => formData.peopleCount > 1 && 
                  setFormData(prev => ({ ...prev, peopleCount: prev.peopleCount - 1 }))}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{formData.peopleCount}명</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setFormData(prev => ({ ...prev, peopleCount: prev.peopleCount + 1 }))}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        <Card style={styles.itemsCard}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>체크리스트 항목</Text>
            <Button
              title="항목 추가"
              onPress={addItem}
              size="small"
              variant="outline"
            />
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.itemContainer}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>{index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Input
                placeholder="항목 제목 (예: 텐트, 침낭)"
                value={item.title}
                onChangeText={(text) => updateItem(item.id, 'title', text)}
                containerStyle={styles.itemInput}
              />
              
              <Input
                placeholder="설명 (선택사항)"
                value={item.description}
                onChangeText={(text) => updateItem(item.id, 'description', text)}
                containerStyle={styles.itemInput}
              />
              
              <View style={styles.quantityContainer}>
                <Input
                  placeholder="수량"
                  value={item.quantity.toString()}
                  onChangeText={(text) => updateItem(item.id, 'quantity', parseInt(text) || 1)}
                  keyboardType="numeric"
                  containerStyle={styles.quantityInput}
                />
                <Input
                  placeholder="단위 (예: 개, L, kg)"
                  value={item.unit}
                  onChangeText={(text) => updateItem(item.id, 'unit', text)}
                  containerStyle={styles.unitInput}
                />
              </View>
            </View>
          ))}
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? '생성 중...' : '체크리스트 생성'}
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  formCard: {
    margin: 16,
  },
  itemsCard: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  peopleCountContainer: {
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  counterButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    minWidth: 60,
    textAlign: 'center',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    color: '#DC2626',
  },
  itemInput: {
    marginVertical: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityInput: {
    flex: 1,
    marginVertical: 4,
  },
  unitInput: {
    flex: 1,
    marginVertical: 4,
  },
  buttonContainer: {
    paddingHorizontal: 16,
  },
  saveButton: {
    marginVertical: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

export default CreateChecklistScreen;
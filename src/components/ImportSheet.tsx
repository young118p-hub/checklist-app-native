import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Field, Sheet, T } from './ui/kit';
import { useChecklistStore } from '../stores/checklistStore';
import { parseImportText, sharedToChecklistData } from '../utils/shareUtils';

export const ImportSheet = ({ visible, onClose, onImported }: {
  visible: boolean; onClose: () => void; onImported: (id: string) => void;
}) => {
  const createChecklist = useChecklistStore(s => s.createChecklist);
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseImportText(text), [text]);

  const close = () => { setText(''); onClose(); };

  const submit = async () => {
    if (!parsed) return;
    const id = await createChecklist(sharedToChecklistData(parsed));
    if (!id) {
      Alert.alert('가져오지 못했어요', '잠시 후 다시 시도해 주세요.');
      return;
    }
    setText('');
    onImported(id);
  };

  return (
    <Sheet visible={visible} onClose={close} title="공유받은 리스트 가져오기">
      <T variant="body2" tone="text2" style={{ marginBottom: 12 }}>
        받은 메시지를 통째로 붙여 넣으면 리스트를 찾아서 가져와요
      </T>
      <Field
        value={text}
        onChangeText={setText}
        placeholder="여기에 붙여 넣기"
        multiline
        style={{ height: 120, textAlignVertical: 'top' }}
      />
      <View style={{ minHeight: 28, justifyContent: 'center', marginTop: 4 }}>
        {text.trim() !== '' && (
          parsed
            ? <T variant="caption" tone="accentStrong">'{parsed.title}' · {parsed.items.length}개 항목을 가져올 수 있어요</T>
            : <T variant="caption" tone="danger">아맞다이거!에서 '앱으로 보내기'로 공유한 내용이 아니에요</T>
        )}
      </View>
      <Button label="가져오기" disabled={!parsed} onPress={submit} style={{ marginTop: 8 }} />
    </Sheet>
  );
};

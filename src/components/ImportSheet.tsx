import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Field, Sheet, T } from './ui/kit';
import { useChecklistStore } from '../stores/checklistStore';
import { parseImportText, sharedToChecklistData } from '../utils/shareUtils';
import { findInviteCode } from './together';

export const ImportSheet = ({ visible, onClose, onImported, onInvite }: {
  visible: boolean; onClose: () => void; onImported: (id: string) => void; onInvite: (code: string) => void;
}) => {
  const createChecklist = useChecklistStore(s => s.createChecklist);
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseImportText(text), [text]);
  // 링크가 안 눌리는 메신저에서 초대 메시지를 붙여 넣은 경우
  const inviteCode = useMemo(() => findInviteCode(text), [text]);

  const close = () => { setText(''); onClose(); };

  const submit = async () => {
    if (inviteCode) {
      setText('');
      onInvite(inviteCode);
      return;
    }
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
          inviteCode
            ? <T variant="caption" tone="accentStrong">함께 챙기기 초대예요. 눌러서 초대를 열어요</T>
            : parsed
            ? <T variant="caption" tone="accentStrong">'{parsed.title}' · {parsed.items.length}개 항목을 가져올 수 있어요</T>
            : <T variant="caption" tone="danger">아맞다이거!에서 '앱으로 보내기'로 공유한 내용이 아니에요</T>
        )}
      </View>
      <Button label={inviteCode ? '초대 열기' : '가져오기'} disabled={!parsed && !inviteCode} onPress={submit} style={{ marginTop: 8 }} />
    </Sheet>
  );
};

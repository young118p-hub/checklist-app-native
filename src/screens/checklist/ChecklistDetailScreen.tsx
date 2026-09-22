import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChecklistStore } from '../../stores/checklistStore';
import { Icon } from '../../components/ui/Icon';
import {
  Button, Checkbox, Chip, ChipRow, Field, IconButton, ProgressBar, Sheet, SheetRow, T, Tap, TopBar, haptic,
} from '../../components/ui/kit';
import { Badge } from '../create/CreateScreen';
import { fonts, makeStyles, useColors } from '../../theme';
import { Checklist, ChecklistItem, Member, RootStackParamList } from '../../types';
import { cleanText, daysUntil, formatDday, formatMeta, getProgress, getStartDate } from '../../utils/format';
import { getReminderDate } from '../../utils/reminders';
import { AssigneeSheet, Avatar, AvatarStack, MembersSheet, TogetherSheet, isShared, memberName } from '../../components/together';
import { latestCheck } from '../../sync/mapping';
import { realtime, sync } from '../../sync/engine';

type Nav = StackNavigationProp<RootStackParamList>;
type Filter = 'all' | 'left' | 'done';

const DEFAULT_SECTION = '준비물';

interface Section { name: string; items: ChecklistItem[]; done: number; total: number }

// 섹션은 처음 나온 순서대로. 섹션 안에서는 안 챙긴 것 먼저, 챙긴 것은 아래로
export const SHARED_GROUP = '같이 챙길 것';
export const PERSONAL_GROUP = '각자 챙길 것';

// 함께 쓰는 리스트는 '같이 챙길 것 / 각자 챙길 것'으로 나눈다 (시안 DetailShared)
const groupKey = (item: ChecklistItem, shared: boolean) =>
  shared ? (item.scope === 'personal' ? PERSONAL_GROUP : SHARED_GROUP) : item.section || DEFAULT_SECTION;

export const groupSections = (checklist: Checklist, filter: Filter): Section[] => {
  const shared = isShared(checklist);
  const map = new Map<string, ChecklistItem[]>();
  if (shared) { map.set(SHARED_GROUP, []); if (checklist.items.some(i => i.scope === 'personal')) map.set(PERSONAL_GROUP, []); }
  [...checklist.items].sort((a, b) => a.order - b.order).forEach(item => {
    const key = groupKey(item, shared);
    map.set(key, [...(map.get(key) ?? []), item]);
  });
  return [...map.entries()].map(([name, items]) => {
    const visible = items.filter(i => (filter === 'left' ? !i.isCompleted : filter === 'done' ? i.isCompleted : true));
    return {
      name,
      items: [...visible.filter(i => !i.isCompleted), ...visible.filter(i => i.isCompleted)],
      done: items.filter(i => i.isCompleted).length,
      total: items.length,
    };
  });
};

const ChecklistDetailScreen = () => {
  const s = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'ChecklistDetail'>>();
  const navigation = useNavigation<Nav>();
  const { id } = route.params;
  // 상세 화면이 여러 개 쌓일 수 있어서(초대 링크 등) 전역 currentChecklist가 아니라 내 id로 찾는다
  const checklist = useChecklistStore(st => st.checklists.find(c => c.id === id) ?? null);
  const {
    fetchChecklist, toggleItemComplete, addItem, updateItem, deleteItem,
    updateChecklist, deleteChecklist, resetChecklist, setReminder, trackChecklistCompletion, setAssignee,
  } = useChecklistStore();

  const [filter, setFilter] = useState<Filter>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState('');
  const [targetSection, setTargetSection] = useState<string | undefined>();
  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [menu, setMenu] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [cautionsOpen, setCautionsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [assigning, setAssigning] = useState<ChecklistItem | null>(null);
  const [perPerson, setPerPerson] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // 체크·추가 같은 동작은 스토어의 currentChecklist 기준이라, 이 화면이 보일 때마다 다시 고른다
  useFocusEffect(useCallback(() => { fetchChecklist(id); }, [id]));

  // 서버에 올라간 리스트는 열어둔 동안 다른 멤버의 변경을 실시간으로 받는다
  const synced = !!checklist?.remote;
  useEffect(() => (synced ? realtime.watch(id) : undefined), [id, synced]);

  const sections = useMemo(() => (checklist ? groupSections(checklist, filter) : []), [checklist, filter]);
  const sectionNames = useMemo(() => (checklist ? groupSections(checklist, 'all').map(x => x.name) : []), [checklist]);
  const shared = !!checklist && isShared(checklist);
  const members = checklist?.remote?.members ?? [];

  if (!checklist) {
    return (
      <View style={s.root}>
        <TopBar onBack={() => navigation.goBack()} />
        <View style={s.center}>
          <T variant="title3">리스트를 찾을 수 없어요</T>
          <T variant="body2" tone="text2">삭제됐거나 아직 불러오는 중이에요</T>
        </View>
      </View>
    );
  }

  const { total, done, ratio } = getProgress(checklist);
  const left = total - done;
  const start = getStartDate(checklist);
  const days = start ? daysUntil(start) : undefined;
  const meta = formatMeta(checklist);
  const abroad = checklist.source?.kind === 'destination' && checklist.source.destinationId !== 'korea';
  const section = targetSection && sectionNames.includes(targetSection) ? targetSection : sectionNames[0] ?? DEFAULT_SECTION;

  const toggle = (item: ChecklistItem) => {
    const willComplete = !item.isCompleted;
    haptic.light();
    toggleItemComplete(item.id);
    if (willComplete && done + 1 === total) {
      haptic.success();
      const updated = useChecklistStore.getState().currentChecklist;
      if (updated) trackChecklistCompletion(updated);
      setTimeout(() => setCompleted(true), 350);
    }
  };

  const add = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const maxOrder = checklist.items.reduce((m, i) => Math.max(m, i.order), -1);
    await addItem(checklist.id, {
      title,
      description: '',
      quantity: 1,
      unit: '',
      order: maxOrder + 1,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(shared
        ? { scope: section === PERSONAL_GROUP ? 'personal' as const : 'shared' as const }
        : { section: section === DEFAULT_SECTION && !checklist.items.some(i => i.section) ? undefined : section }),
    });
    setNewTitle('');
    haptic.select();
  };

  const focusAdd = (name: string) => {
    setTargetSection(name);
    inputRef.current?.focus();
  };

  const cycleSection = () => {
    if (sectionNames.length < 2) return;
    const i = sectionNames.indexOf(section);
    setTargetSection(sectionNames[(i + 1) % sectionNames.length]);
    haptic.select();
  };

  const amOwner = !checklist.remote || members.find(m => m.isMe)?.role === 'owner';
  const confirmDelete = () => {
    setMenu(false);
    const message = !shared
      ? '이 리스트를 삭제할까요? 되돌릴 수 없어요.'
      : amOwner
        ? `함께 챙기는 ${members.length - 1}명에게서도 사라져요. 되돌릴 수 없어요.`
        : '이 리스트에서 나갈까요? 다시 들어오려면 초대를 받아야 해요.';
    Alert.alert(checklist.title, message, [
      { text: '취소', style: 'cancel' },
      {
        text: shared && !amOwner ? '나가기' : '삭제', style: 'destructive', onPress: async () => {
          await deleteChecklist(checklist.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const reuse = async () => {
    setMenu(false);
    setCompleted(false);
    await resetChecklist(checklist.id);
    haptic.select();
  };

  const canRemind = !!start && getReminderDate(start).getTime() > Date.now();
  const toggleReminder = async () => {
    const on = !checklist.reminderId;
    const ok = await setReminder(checklist.id, on);
    if (on && !ok) Alert.alert('알림을 켜지 못했어요', '휴대폰 설정에서 아맞다이거! 알림을 허용해 주세요.');
  };

  return (
    <View style={s.root}>
      <TopBar
        onBack={() => navigation.goBack()}
        right={
          <>
            {shared && (
              <Tap accessibilityRole="button" accessibilityLabel={`함께 챙기는 사람 ${members.length}명`}
                onPress={() => setMembersOpen(true)} style={{ height: 48, paddingHorizontal: 8, justifyContent: 'center' }}>
                <AvatarStack members={members} ring={c.bg} />
              </Tap>
            )}
            <IconButton icon="share" label="함께 챙기기" onPress={() => setSharing(true)} />
            <IconButton icon="more" label="더 보기" onPress={() => setMenu(true)} />
          </>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={synced ? (
            <RefreshControl refreshing={refreshing} tintColor={c.accent} colors={[c.accent]}
              onRefresh={async () => { setRefreshing(true); await sync.now(); setRefreshing(false); }} />
          ) : undefined}
        >
          <View style={s.head}>
            {!!meta && <T size={14} tone="text3">{meta}</T>}
            <View style={s.titleRow}>
              <T variant="title1" style={{ flex: 1 }}>{checklist.title}</T>
              {start && days != null && days >= 0 && <T variant="title1" tone="accent">{formatDday(start)}</T>}
            </View>
            <ProgressBar ratio={ratio} style={{ marginTop: 16 }} />
            <View style={s.progressRow}>
              <T variant="body2" tone="text2">
                {total === 0 ? '아래에서 첫 항목을 추가해 보세요'
                  : shared ? sharedSummary(checklist)
                    : done === total ? `${total}개 모두 챙겼어요` : `${total}개 중 ${done}개 챙겼어요`}
              </T>
              {total > 0 && <T size={15} weight="semibold">{Math.round(ratio * 100)}%</T>}
            </View>
          </View>

          {total > 0 && (
            <ChipRow style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <Chip label={`전체 ${total}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
              <Chip label={`남은 것 ${left}`} selected={filter === 'left'} onPress={() => setFilter('left')} />
              <Chip label={`챙긴 것 ${done}`} selected={filter === 'done'} onPress={() => setFilter('done')} />
            </ChipRow>
          )}

          {!!checklist.cautions?.length && (
            <Tap accessibilityRole="button" onPress={() => setCautionsOpen(!cautionsOpen)} style={s.caution}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="info" size={20} color={c.accentStrong} />
                <T size={15} weight="semibold" style={{ flex: 1 }}>주의할 점 {checklist.cautions.length}가지</T>
                <Icon name={cautionsOpen ? 'chevronUp' : 'chevronDown'} size={18} color={c.text3} strokeWidth={2} />
              </View>
              {cautionsOpen && checklist.cautions.map((text, i) => (
                <T key={i} variant="caption" tone="text2" style={{ marginTop: 8, paddingLeft: 30 }}>· {text}</T>
              ))}
            </Tap>
          )}

          {sections.map(sec => {
            if (filter !== 'all' && sec.items.length === 0) return null;
            const isCollapsed = collapsed[sec.name];
            return (
              <View key={sec.name}>
                <View style={s.band} />
                <Tap
                  accessibilityRole="button"
                  accessibilityState={{ expanded: !isCollapsed }}
                  onPress={() => setCollapsed({ ...collapsed, [sec.name]: !isCollapsed })}
                  style={s.sectionHead}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <T variant="title3">{sec.name}</T>
                    <T size={14} tone="text3">{sec.done}/{sec.total}</T>
                  </View>
                  {sec.name === PERSONAL_GROUP ? (
                    <View style={s.segment}>
                      {[true, false].map(on => (
                        <Tap key={String(on)} accessibilityRole="button" accessibilityState={{ selected: perPerson === on }}
                          onPress={() => setPerPerson(on)} style={[s.segmentItem, perPerson === on && s.segmentOn]}>
                          <T size={13} weight={perPerson === on ? 'semibold' : 'medium'} tone={perPerson === on ? 'text1' : 'text2'}>
                            {on ? '1인 기준' : '전체'}
                          </T>
                        </Tap>
                      ))}
                    </View>
                  ) : (
                    <Icon name={isCollapsed ? 'chevronDown' : 'chevronUp'} size={20} color={c.text3} strokeWidth={2} />
                  )}
                </Tap>
                {!isCollapsed && sec.items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    abroad={abroad}
                    members={shared ? members : undefined}
                    perPerson={perPerson}
                    peopleCount={checklist.peopleCount ?? 1}
                    onAssign={() => setAssigning(item)}
                    onPress={() => toggle(item)}
                    onLongPress={() => { haptic.light(); setEditing(item); }}
                  />
                ))}
                {!isCollapsed && filter === 'all' && (
                  <Tap accessibilityRole="button" onPress={() => focusAdd(sec.name)} style={s.addRow}>
                    <View style={{ width: 24, alignItems: 'center' }}><Icon name="plus" size={20} color={c.text3} strokeWidth={2} /></View>
                    <T size={15} tone="text3">{sec.name}에 추가</T>
                  </Tap>
                )}
              </View>
            );
          })}
          {total > 0 && (
            <T variant="caption" tone="text3" center style={{ marginTop: 16 }}>항목을 길게 누르면 고치거나 지울 수 있어요</T>
          )}
        </ScrollView>

        <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={s.inputPill}>
            <TextInput
              ref={inputRef}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="항목 추가"
              placeholderTextColor={c.placeholder}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={add}
              maxLength={100}
              style={s.input}
            />
            {sectionNames.length > 1 && (
              <Tap accessibilityRole="button" accessibilityLabel={`추가할 섹션: ${section}`} onPress={cycleSection} style={s.sectionPick}>
                <T size={13} weight="semibold" tone="text2" numberOfLines={1} style={{ maxWidth: 90 }}>{section}</T>
                <Icon name="chevronDown" size={14} color={c.text2} strokeWidth={2.2} />
              </Tap>
            )}
          </View>
          <Tap accessibilityRole="button" accessibilityLabel="항목 추가" onPress={add} disabled={!newTitle.trim()}
            style={[s.addButton, !newTitle.trim() && { opacity: 0.5 }]}>
            <Icon name="plus" size={24} color={c.onAccent} strokeWidth={2.2} />
          </Tap>
        </View>
      </KeyboardAvoidingView>

      <EditItemSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={async (patch) => { if (editing) await updateItem(editing.id, patch); setEditing(null); }}
        onDelete={async () => { if (editing) await deleteItem(editing.id); setEditing(null); }}
      />

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <SheetRow icon="pencil" label="이름 바꾸기" onPress={() => { setMenu(false); setRenaming(true); }} />
        {canRemind && (
          <SheetRow
            icon="bell"
            label={checklist.reminderId ? '전날 알림 끄기' : '전날 알림 켜기'}
            sub="출발 전날 오후 8시"
            onPress={() => { setMenu(false); toggleReminder(); }}
          />
        )}
        {done > 0 && <SheetRow icon="refresh" label="다시 쓰기" sub="체크만 모두 풀어요" onPress={reuse} />}
        {shared && <SheetRow icon="list" label="함께 챙기는 사람" sub={`${members.length}명`} onPress={() => { setMenu(false); setMembersOpen(true); }} />}
        <SheetRow icon="trash" label={shared && !amOwner ? '이 리스트에서 나가기' : '리스트 삭제'} danger onPress={confirmDelete} />
      </Sheet>

      <TogetherSheet visible={sharing} onClose={() => setSharing(false)} checklist={checklist} onMembers={() => setMembersOpen(true)} />
      {checklist.remote && (
        <MembersSheet
          visible={membersOpen}
          onClose={() => setMembersOpen(false)}
          checklist={checklist}
          onInvite={() => setSharing(true)}
          onLeave={confirmDelete}
        />
      )}
      <AssigneeSheet
        visible={!!assigning}
        onClose={() => setAssigning(null)}
        members={members}
        current={assigning?.assigneeUserId}
        onPick={async (userId) => { if (assigning) await setAssignee(assigning.id, userId); setAssigning(null); }}
      />

      <RenameSheet
        visible={renaming}
        initial={checklist.title}
        onClose={() => setRenaming(false)}
        onSave={async (title) => { await updateChecklist(checklist.id, { title }); setRenaming(false); }}
      />

      <Sheet visible={completed} onClose={() => setCompleted(false)}>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
          <View style={s.doneIcon}><Icon name="check" size={32} color={c.onAccent} strokeWidth={3} /></View>
          <T variant="title2" center style={{ marginTop: 8 }}>다 챙겼어요</T>
          <T variant="body2" tone="text2" center>{total}개를 모두 챙겼어요. 다음에 또 쓸 때는{'\n'}'다시 쓰기'로 체크만 풀 수 있어요</T>
        </View>
        <Button label="확인" onPress={() => setCompleted(false)} style={{ marginTop: 8 }} />
        <Button label="지금 다시 쓰기" kind="ghost" onPress={reuse} />
      </Sheet>
    </View>
  );
};

const findMember = (members: Member[], key?: string) => (key ? members.find(m => m.memberKey === key) : undefined);

// 함께 쓰는 리스트의 항목 아래 한 줄: 누가 챙겼는지 / 담당 / 다른 멤버 체크
const sharedLine = (item: ChecklistItem, members: Member[]): { text?: string; avatar?: Member; assign?: boolean } => {
  if (item.scope === 'personal') {
    const others = (item.checks ?? [])
      .filter(ch => ch.checked)
      .map(ch => findMember(members, ch.memberKey))
      .filter((m): m is Member => !!m && !m.isMe);
    return others.length ? { text: `${others.map(memberName).join(', ')}님은 챙겼어요` } : {};
  }
  if (item.isCompleted) {
    const who = findMember(members, latestCheck(item.checks ?? [])?.memberKey);
    if (!who) return { text: '챙겼어요' };
    return { text: who.isMe ? '내가 챙겼어요' : `${memberName(who)}님이 챙겼어요`, avatar: who };
  }
  const assignee = members.find(m => m.userId === item.assigneeUserId);
  if (assignee) return { text: assignee.isMe ? '내 담당' : `${memberName(assignee)}님 담당`, avatar: assignee };
  return { assign: true };
};

const ItemRow = ({ item, abroad, members, perPerson, peopleCount, onAssign, onPress, onLongPress }: {
  item: ChecklistItem; abroad: boolean; members?: Member[]; perPerson: boolean; peopleCount: number;
  onAssign: () => void; onPress: () => void; onLongPress: () => void;
}) => {
  const s = useStyles();
  const c = useColors();
  const extra = members ? sharedLine(item, members) : {};
  const sub = extra.text ?? (item.isCompleted ? '' : cleanText(item.reason || item.description));
  const qty = members && item.scope === 'personal' && perPerson
    ? item.quantityPerPerson ?? Math.max(1, Math.ceil((item.quantity ?? 1) / Math.max(1, peopleCount)))
    : item.quantity ?? 1;
  const showQty = members && item.scope === 'personal' ? true : qty > 1;
  return (
    <Tap
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.isCompleted }}
      accessibilityLabel={item.title}
      onPress={onPress}
      onLongPress={onLongPress}
      pressedOpacity={0.7}
      style={[s.item, !!sub && { paddingVertical: 10 }]}
    >
      <Checkbox checked={item.isCompleted} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T variant="body1" tone={item.isCompleted ? 'text3' : 'text1'} style={{ flexShrink: 1 }}>{item.title}</T>
          {abroad && item.baggage === 'carry_on' && !item.isCompleted && <Badge label="기내만" />}
        </View>
        {!!sub && <T variant="caption" tone="text3" numberOfLines={2}>{sub}</T>}
      </View>
      {extra.avatar && <Avatar member={extra.avatar} size={28} />}
      {extra.assign && (
        // 항목이 많아도 시끄럽지 않게, 담당이 정해지면 아바타가 들어갈 자리에 점선 원 하나만
        <Tap accessibilityRole="button" accessibilityLabel={`${item.title} 담당 정하기`} hitSlop={10} onPress={onAssign} style={s.assign}>
          <Icon name="plus" size={14} color={c.text3} strokeWidth={2.2} />
        </Tap>
      )}
      {showQty && !extra.assign && <T size={15} tone="text3">{qty}{item.unit || '개'}</T>}
    </Tap>
  );
};

// '같이 챙길 것 20개 중 12개 · 내 준비물 6개 중 3개'
const sharedSummary = (checklist: Checklist) => {
  const sharedItems = checklist.items.filter(i => i.scope !== 'personal');
  const personal = checklist.items.filter(i => i.scope === 'personal');
  const parts = [`같이 챙길 것 ${sharedItems.length}개 중 ${sharedItems.filter(i => i.isCompleted).length}개`];
  if (personal.length) parts.push(`내 준비물 ${personal.length}개 중 ${personal.filter(i => i.isCompleted).length}개`);
  return parts.join(' · ');
};

const EditItemSheet = ({ item, onClose, onSave, onDelete }: {
  item: ChecklistItem | null; onClose: () => void;
  onSave: (patch: Partial<ChecklistItem>) => void; onDelete: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(cleanText(item.description));
      setQuantity(item.quantity ?? 1);
    }
  }, [item]);
  const c = useColors();
  return (
    <Sheet visible={!!item} onClose={onClose} title="항목 고치기">
      <View style={{ gap: 12 }}>
        <Field label="이름" value={title} onChangeText={setTitle} maxLength={100} />
        <Field label="메모" value={description} onChangeText={setDescription} placeholder="예: 여분 하나 더" maxLength={200} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size={14} weight="semibold" tone="text2" style={{ flex: 1 }}>수량</T>
          <IconButton icon="minus" label="수량 줄이기" color={c.text1} onPress={() => setQuantity(Math.max(1, quantity - 1))} />
          <T size={17} weight="bold" center style={{ minWidth: 48 }}>{quantity}{item?.unit || '개'}</T>
          <IconButton icon="plus" label="수량 늘리기" color={c.text1} onPress={() => setQuantity(Math.min(9999, quantity + 1))} />
        </View>
      </View>
      <Button
        label="저장"
        disabled={!title.trim()}
        style={{ marginTop: 16 }}
        onPress={() => onSave({
          title: title.trim(),
          // 메모를 고쳤을 때만 바꾼다 (템플릿 원문 보존)
          ...(description !== cleanText(item?.description) ? { description: description.trim() || undefined } : {}),
          quantity,
        })}
      />
      <Button label="이 항목 지우기" kind="dangerGhost" onPress={onDelete} />
    </Sheet>
  );
};

const RenameSheet = ({ visible, initial, onClose, onSave }: {
  visible: boolean; initial: string; onClose: () => void; onSave: (title: string) => void;
}) => {
  const [title, setTitle] = useState(initial);
  useEffect(() => { if (visible) setTitle(initial); }, [visible, initial]);
  return (
    <Sheet visible={visible} onClose={onClose} title="이름 바꾸기">
      <Field value={title} onChangeText={setTitle} autoFocus maxLength={40} onSubmitEditing={() => title.trim() && onSave(title.trim())} />
      <Button label="저장" disabled={!title.trim()} style={{ marginTop: 16 }} onPress={() => onSave(title.trim())} />
    </Sheet>
  );
};

const useStyles = makeStyles(c => ({
  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  head: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  titleRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caution: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, backgroundColor: c.fillSubtle, padding: 16 },
  band: { height: 8, backgroundColor: c.band },
  sectionHead: { height: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  item: { minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  addRow: { height: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  assign: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.control,
    alignItems: 'center', justifyContent: 'center',
  },
  segment: { height: 44, borderRadius: 22, backgroundColor: c.fill, padding: 3, flexDirection: 'row' },
  segmentItem: { height: 38, paddingHorizontal: 12, borderRadius: 19, justifyContent: 'center' },
  segmentOn: { backgroundColor: c.raised },
  bottom: {
    backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  inputPill: {
    flex: 1, height: 56, borderRadius: 28, backgroundColor: c.fill, paddingLeft: 18, paddingRight: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  input: { flex: 1, height: 56, fontSize: 16, fontFamily: fonts.regular, color: c.text1, padding: 0 },
  sectionPick: {
    height: 44, paddingLeft: 14, paddingRight: 12, borderRadius: 22, backgroundColor: c.raised,
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  addButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentStrong, alignItems: 'center', justifyContent: 'center' },
  doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
}));

export default ChecklistDetailScreen;

-- 아맞다이거! v2 초기 스키마
--
-- 원칙
-- 1. 항목은 한 행씩, 체크는 (항목, 멤버) 한 행씩 저장한다. 여러 명이 동시에 체크해도 서로 덮어쓰지 않는다.
-- 2. 모든 행은 클라이언트가 만든 uuid를 쓴다. 오프라인에서 만든 행을 나중에 그대로 upsert하기 위해서다.
-- 3. 삭제는 deleted_at(soft delete)으로 한다. 오프라인이던 기기가 삭제를 놓치지 않게 하기 위해서다.
-- 4. 체크한 사람 이름은 옵트인이다. 체크 행에는 user_id 대신 멤버마다 무작위로 만든 member_key만 남긴다.
--    member_key가 누구인지는 그 멤버가 이름 공개를 켰을 때만 다른 멤버에게 보인다(member_keys 테이블 RLS).
--    Realtime은 RLS를 통과한 행을 그대로 보내므로, 이 분리가 없으면 네트워크에서 이름이 새어 나간다.

-- ───────────────────────── 공통 ─────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ───────────────────────── 프로필 ─────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null default '' check (char_length(nickname) <= 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 가입하면 프로필을 자동으로 만든다. 닉네임은 소셜 계정 이름을 20자로 자른다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      ''
    ), 20)
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── 체크리스트 ─────────────────────────

create table public.checklists (
  id            uuid primary key,
  owner_id      uuid not null references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 100),
  description   text,
  people_count  int not null default 1 check (people_count between 1 and 50),
  category_id   text,              -- '생활/여행' 분류명 (앱의 categoryId 그대로)
  source        jsonb,             -- ChecklistSource (템플릿·여행지·날짜·인원)
  start_date    date,              -- D-day 계산용. source.startDate와 같은 값
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index checklists_owner_idx on public.checklists (owner_id);

create trigger checklists_touch before update on public.checklists
  for each row execute function public.touch_updated_at();

-- 멤버. 만든 사람도 role = 'owner'로 한 행을 가진다.
create table public.checklist_members (
  checklist_id  uuid not null references public.checklists (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'member')),
  -- 내가 챙긴 항목에 이름 보이기 (기본 꺼짐)
  show_name     boolean not null default false,
  -- 멤버 구분 색 번호 (시안 토큰 member-1..6)
  color_index   smallint not null default 0 check (color_index between 0 and 5),
  joined_at     timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (checklist_id, user_id)
);

create index checklist_members_user_idx on public.checklist_members (user_id);

create trigger checklist_members_touch before update on public.checklist_members
  for each row execute function public.touch_updated_at();

-- 멤버별 익명 키. 체크 행에는 이 키만 남는다.
create table public.member_keys (
  member_key    uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null,
  user_id       uuid not null,
  unique (checklist_id, user_id),
  foreign key (checklist_id, user_id)
    references public.checklist_members (checklist_id, user_id) on delete cascade
);

-- 체크리스트를 만들면 만든 사람을 owner 멤버로 넣는다.
create or replace function public.handle_new_checklist()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.checklist_members (checklist_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end $$;

create trigger on_checklist_created after insert on public.checklists
  for each row execute function public.handle_new_checklist();

-- 멤버가 생기면 익명 키를 만든다.
create or replace function public.handle_new_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.member_keys (checklist_id, user_id)
  values (new.checklist_id, new.user_id)
  on conflict do nothing;
  return new;
end $$;

create trigger on_member_created after insert on public.checklist_members
  for each row execute function public.handle_new_member();

-- ───────────────────────── 항목 ─────────────────────────

create table public.checklist_items (
  id                  uuid primary key,
  checklist_id        uuid not null references public.checklists (id) on delete cascade,
  title               text not null check (char_length(title) between 1 and 100),
  description         text,
  quantity            numeric,
  unit                text,
  sort_order          double precision not null default 0,  -- 드래그 정렬: 두 값 사이에 끼워 넣는다
  -- GeneratedItemMeta
  key                 text,
  section             text,
  quantity_per_person numeric,
  scope               text not null default 'shared' check (scope in ('shared', 'personal')),
  reason              text,
  baggage             text check (baggage in ('carry_on', 'checked')),
  added_because       text[],
  -- 같이 챙길 것의 담당. 담당은 스스로 맡거나 맡겨진 역할이라 이름 공개 설정과 관계없이 보인다.
  assignee_user_id    uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  foreign key (checklist_id, assignee_user_id)
    references public.checklist_members (checklist_id, user_id) on delete set null (assignee_user_id)
);

create index checklist_items_checklist_idx on public.checklist_items (checklist_id);

create trigger checklist_items_touch before update on public.checklist_items
  for each row execute function public.touch_updated_at();

-- ───────────────────────── 체크 ─────────────────────────
-- 같이 챙길 것(shared): 멤버 중 가장 최근 행이 그 항목의 상태다 (마지막으로 누른 사람 기준).
-- 각자 챙길 것(personal): 멤버마다 자기 행이 자기 상태다.
-- 그래서 두 경우 모두 "항목 × 멤버" 한 행이면 충분하다.

create table public.item_checks (
  item_id       uuid not null references public.checklist_items (id) on delete cascade,
  member_key    uuid not null references public.member_keys (member_key) on delete cascade,
  checklist_id  uuid not null references public.checklists (id) on delete cascade,  -- Realtime 필터용
  checked       boolean not null,
  -- 기기에서 누른 시각. 오프라인 체크가 늦게 도착해도 더 최근에 누른 쪽이 이긴다.
  checked_at    timestamptz not null,
  primary key (item_id, member_key)
);

create index item_checks_checklist_idx on public.item_checks (checklist_id);

-- 늦게 도착한 오래된 체크가 최근 체크를 덮어쓰지 않게 막는다.
create or replace function public.keep_latest_check()
returns trigger language plpgsql as $$
begin
  if new.checked_at < old.checked_at then
    return old;
  end if;
  -- 미래 시각으로 조작해 영원히 이기는 것을 막는다 (기기 시계 오차 5분 허용)
  if new.checked_at > now() + interval '5 minutes' then
    new.checked_at := now();
  end if;
  return new;
end $$;

create trigger item_checks_latest before update on public.item_checks
  for each row execute function public.keep_latest_check();

create or replace function public.clamp_check_time()
returns trigger language plpgsql as $$
begin
  if new.checked_at > now() + interval '5 minutes' then
    new.checked_at := now();
  end if;
  return new;
end $$;

create trigger item_checks_clamp before insert on public.item_checks
  for each row execute function public.clamp_check_time();

-- item_id와 checklist_id가 서로 맞는지 확인한다 (다른 리스트 항목에 체크를 끼워 넣지 못하게).
create or replace function public.check_item_belongs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.checklist_items i
    where i.id = new.item_id and i.checklist_id = new.checklist_id
  ) then
    raise exception 'item does not belong to checklist';
  end if;
  if not exists (
    select 1 from public.member_keys k
    where k.member_key = new.member_key and k.checklist_id = new.checklist_id
  ) then
    raise exception 'member_key does not belong to checklist';
  end if;
  return new;
end $$;

create trigger item_checks_belongs before insert or update on public.item_checks
  for each row execute function public.check_item_belongs();

-- ───────────────────────── 초대 ─────────────────────────

create table public.invites (
  code          text primary key,  -- 링크에 들어가는 추측 불가능한 코드
  checklist_id  uuid not null references public.checklists (id) on delete cascade,
  created_by    uuid not null references auth.users (id) on delete cascade,
  expires_at    timestamptz not null default now() + interval '7 days',
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index invites_checklist_idx on public.invites (checklist_id);

-- ───────────────────────── 권한 판단 함수 ─────────────────────────
-- RLS 정책 안에서 checklist_members를 직접 조회하면 그 테이블의 RLS가 다시 걸려 재귀가 된다.
-- security definer 함수로 한 번만 확인한다.

create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.checklist_members m
    join public.checklists c on c.id = m.checklist_id
    where m.checklist_id = cid and m.user_id = auth.uid() and c.deleted_at is null
  );
$$;

create or replace function public.is_owner(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.checklists c
    where c.id = cid and c.owner_id = auth.uid()
  );
$$;

create or replace function public.shares_checklist_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.checklist_members a
    join public.checklist_members b on a.checklist_id = b.checklist_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table public.profiles          enable row level security;
alter table public.checklists        enable row level security;
alter table public.checklist_members enable row level security;
alter table public.member_keys       enable row level security;
alter table public.checklist_items   enable row level security;
alter table public.item_checks       enable row level security;
alter table public.invites           enable row level security;

-- 프로필: 나 자신 + 같은 리스트를 쓰는 사람만 본다. 수정은 나만.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_checklist_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 체크리스트: 멤버가 보고 수정한다. 만드는 건 본인 명의로만. 지우는 건 만든 사람만(soft delete).
-- 삭제된 리스트도 owner는 본다 (다른 기기가 삭제를 동기화해야 하므로).
create policy checklists_select on public.checklists for select to authenticated
  using (public.is_member(id) or owner_id = auth.uid());
create policy checklists_insert on public.checklists for insert to authenticated
  with check (owner_id = auth.uid());
create policy checklists_update on public.checklists for update to authenticated
  using (public.is_member(id))
  with check (public.is_member(id) or public.is_owner(id));
-- owner_id는 바꿀 수 없고, deleted_at은 owner만 바꿀 수 있다.
create or replace function public.guard_checklist_update()
returns trigger language plpgsql as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'owner_id cannot change';
  end if;
  if new.deleted_at is distinct from old.deleted_at and old.owner_id <> auth.uid() then
    raise exception 'only owner can delete';
  end if;
  return new;
end $$;
create trigger checklists_guard before update on public.checklists
  for each row execute function public.guard_checklist_update();
-- 물리 삭제는 계정 삭제 때만 (cascade). 클라이언트는 delete 권한 없음.

-- 멤버: 같은 리스트 멤버끼리 본다. 내 행의 show_name/color_index만 내가 바꾼다.
-- 가입은 accept_invite()로만. 나가기는 내 행 삭제. owner는 다른 멤버를 내보낼 수 있다.
create policy members_select on public.checklist_members for select to authenticated
  using (public.is_member(checklist_id));
create policy members_update on public.checklist_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_delete on public.checklist_members for delete to authenticated
  using ((user_id = auth.uid() and role <> 'owner') or (public.is_owner(checklist_id) and role <> 'owner'));

create or replace function public.guard_member_update()
returns trigger language plpgsql as $$
begin
  if new.role <> old.role or new.checklist_id <> old.checklist_id or new.user_id <> old.user_id then
    raise exception 'only show_name and color_index can change';
  end if;
  return new;
end $$;
create trigger checklist_members_guard before update on public.checklist_members
  for each row execute function public.guard_member_update();

-- 익명 키: 내 키는 항상, 다른 멤버 키는 그 멤버가 이름 공개를 켰을 때만 보인다.
create policy member_keys_select on public.member_keys for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.checklist_members m
      where m.checklist_id = member_keys.checklist_id
        and m.user_id = member_keys.user_id
        and m.show_name
        and public.is_member(member_keys.checklist_id)
    )
  );

-- 항목: 멤버가 보고 추가·수정한다. 삭제는 deleted_at으로.
create policy items_select on public.checklist_items for select to authenticated
  using (public.is_member(checklist_id) or public.is_owner(checklist_id));
create policy items_insert on public.checklist_items for insert to authenticated
  with check (public.is_member(checklist_id));
create policy items_update on public.checklist_items for update to authenticated
  using (public.is_member(checklist_id)) with check (public.is_member(checklist_id));

create or replace function public.guard_item_update()
returns trigger language plpgsql as $$
begin
  if new.checklist_id <> old.checklist_id then
    raise exception 'checklist_id cannot change';
  end if;
  return new;
end $$;
create trigger checklist_items_guard before update on public.checklist_items
  for each row execute function public.guard_item_update();

-- 체크: 멤버는 리스트의 모든 체크를 본다(진행률 계산). 쓰기는 내 키로만.
create policy checks_select on public.item_checks for select to authenticated
  using (public.is_member(checklist_id));
create policy checks_insert on public.item_checks for insert to authenticated
  with check (
    public.is_member(checklist_id)
    and exists (select 1 from public.member_keys k
                where k.member_key = item_checks.member_key and k.user_id = auth.uid())
  );
create policy checks_update on public.item_checks for update to authenticated
  using (exists (select 1 from public.member_keys k
                 where k.member_key = item_checks.member_key and k.user_id = auth.uid()))
  with check (
    public.is_member(checklist_id)
    and exists (select 1 from public.member_keys k
                where k.member_key = item_checks.member_key and k.user_id = auth.uid())
  );

-- 초대: 멤버가 만들고, 만든 사람과 owner가 본다·취소한다. 받는 사람은 RPC로만 접근.
create policy invites_select on public.invites for select to authenticated
  using (created_by = auth.uid() or public.is_owner(checklist_id));
-- 만들기는 create_invite()로만 (코드를 서버에서 만들어야 추측할 수 없다).
create policy invites_update on public.invites for update to authenticated
  using (created_by = auth.uid() or public.is_owner(checklist_id))
  with check (created_by = auth.uid() or public.is_owner(checklist_id));

-- ───────────────────────── RPC ─────────────────────────

-- 초대 링크 만들기. 이미 유효한 링크가 있으면 그걸 돌려준다 (링크를 여러 번 눌러도 하나만 쓰도록).
create or replace function public.create_invite(target_checklist uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  c text;
begin
  if not public.is_member(target_checklist) then
    raise exception 'not a member';
  end if;
  select v.code into c from public.invites v
  where v.checklist_id = target_checklist and v.created_by = auth.uid()
    and v.revoked_at is null and v.expires_at > now() + interval '1 day'
  order by v.created_at desc limit 1;
  if c is null then
    -- gen_random_uuid()는 암호학적 난수 122비트
    c := replace(gen_random_uuid()::text, '-', '');
    insert into public.invites (code, checklist_id, created_by) values (c, target_checklist, auth.uid());
  end if;
  return c;
end $$;

-- 초대 받은 화면: 참여 전에 리스트 요약을 보여준다 (항목 내용은 보여주지 않음).
create or replace function public.preview_invite(invite_code text)
returns table (
  checklist_id uuid, title text, start_date date, people_count int,
  item_count bigint, member_count bigint, inviter_nickname text, already_member boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.start_date, c.people_count,
         (select count(*) from public.checklist_items i where i.checklist_id = c.id and i.deleted_at is null),
         (select count(*) from public.checklist_members m where m.checklist_id = c.id),
         p.nickname,
         exists (select 1 from public.checklist_members m where m.checklist_id = c.id and m.user_id = auth.uid())
  from public.invites v
  join public.checklists c on c.id = v.checklist_id
  left join public.profiles p on p.id = v.created_by
  where v.code = invite_code
    and v.revoked_at is null and v.expires_at > now() and c.deleted_at is null;
$$;

-- 참여하기. 멤버 수 상한 20명. 이미 멤버면 그대로 성공.
create or replace function public.accept_invite(invite_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  n   int;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  select v.checklist_id into cid
  from public.invites v
  join public.checklists c on c.id = v.checklist_id
  where v.code = invite_code
    and v.revoked_at is null and v.expires_at > now() and c.deleted_at is null;

  if cid is null then
    raise exception 'invite invalid or expired';
  end if;

  -- 동시에 여러 명이 참여해도 상한을 넘지 않게 리스트 행을 잠근다.
  perform 1 from public.checklists where id = cid for update;
  select count(*) into n from public.checklist_members where checklist_id = cid;
  if n >= 20 and not exists (
    select 1 from public.checklist_members where checklist_id = cid and user_id = auth.uid()
  ) then
    raise exception 'member limit reached';
  end if;

  insert into public.checklist_members (checklist_id, user_id, color_index)
  values (cid, auth.uid(), (n % 6)::smallint)
  on conflict do nothing;

  return cid;
end $$;

-- 계정 삭제 (Play 정책: 앱 안에서 계정 삭제 가능해야 함).
-- 내가 만든 리스트는 함께 쓰던 사람 것도 같이 사라진다. 앱에서 삭제 전에 이 점을 안내한다.
-- auth.users 삭제가 cascade로 profiles, checklists(→ 항목·체크·멤버·초대), 내 멤버 행을 지운다.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;
  -- 다른 사람 리스트의 담당 표시는 on delete set null로 풀린다.
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.create_invite(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
revoke all on function public.preview_invite(text) from public, anon;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.preview_invite(text) to authenticated;

-- ───────────────────────── Realtime ─────────────────────────
-- 상세 화면을 열어둔 동안 항목·체크·멤버 변경을 받는다. 구독은 checklist_id 필터로 한다.

alter publication supabase_realtime add table
  public.checklists, public.checklist_items, public.item_checks,
  public.checklist_members, public.member_keys;

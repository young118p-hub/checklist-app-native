-- 앱 연결에 필요한 추가분

-- 여행지 리스트의 '주의할 점' (전압, 입국 등). 앱의 Checklist.cautions
alter table public.checklists add column cautions text[];

-- 초대 받은 화면은 로그인 전에 보여준다 (참여할 때만 로그인).
-- 코드가 128비트 난수라서 코드를 가진 사람에게만 요약(제목·날짜·인원·항목 수·초대한 사람 닉네임)이 보인다.
grant execute on function public.preview_invite(text) to anon;

-- 닉네임 수정 시 앞뒤 공백 정리, 빈 이름 방지
create or replace function public.clean_nickname()
returns trigger language plpgsql as $$
begin
  new.nickname := left(btrim(new.nickname), 20);
  return new;
end $$;

create trigger profiles_clean_nickname before insert or update on public.profiles
  for each row execute function public.clean_nickname();

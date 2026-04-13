-- ============================================================
-- ChatGPT Usage Tracker - Supabase 초기 세팅
-- 새 프로젝트를 만들 때 이 파일 하나만 실행하면 된다.
-- `update_display_name.sql`에 있던 display_name 반영도 포함되어 있다.
-- ============================================================

-- 1. 팀 테이블
CREATE TABLE teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 2. 프로필 테이블 (auth.users 확장)
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  display_name text,
  team_id    uuid REFERENCES teams(id) ON DELETE SET NULL,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. 활동 이벤트 테이블
CREATE TABLE activity_events (
  id                        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ts                        bigint NOT NULL,
  server_ts                 timestamptz NOT NULL DEFAULT now(),
  model_id                  text NOT NULL,
  display_name              text,
  app                       text NOT NULL,
  features                  text[] NOT NULL DEFAULT '{}',
  attachment_count          int NOT NULL DEFAULT 0,
  attachment_mime_types     text[] NOT NULL DEFAULT '{}',
  attachment_sources        text[] NOT NULL DEFAULT '{}',
  image_count               int NOT NULL DEFAULT 0,
  tool_count                int NOT NULL DEFAULT 0,
  tool_names                text[] NOT NULL DEFAULT '{}',
  connector_ids             text[] NOT NULL DEFAULT '{}',
  connector_count           int NOT NULL DEFAULT 0,
  has_connector_mention     boolean NOT NULL DEFAULT false,
  source_count              int NOT NULL DEFAULT 0,
  github_repo_count         int NOT NULL DEFAULT 0,
  selected_all_github_repos boolean NOT NULL DEFAULT false,
  system_hints              text[] NOT NULL DEFAULT '{}',
  conversation_mode         text,
  gizmo_id                  text,
  thinking_effort           text,
  model_tier                text NOT NULL DEFAULT 'standard',
  path                      text,
  skill_ids                 text[] NOT NULL DEFAULT '{}',
  skill_count               int NOT NULL DEFAULT 0
);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_activity_events_dedup ON activity_events (user_id, ts, model_id);
CREATE INDEX idx_activity_events_user_ts ON activity_events (user_id, ts DESC);
CREATE INDEX idx_activity_events_server_ts ON activity_events (server_ts DESC);
CREATE INDEX idx_activity_events_model ON activity_events (model_id);
CREATE INDEX idx_activity_events_app ON activity_events (app);

-- 4. 모델 사용 시각 기록 테이블
CREATE TABLE model_timestamps (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id  text NOT NULL,
  ts        bigint NOT NULL,
  server_ts timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE model_timestamps ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_model_timestamps_dedup ON model_timestamps (user_id, model_id, ts);
CREATE INDEX idx_model_timestamps_user_model_ts ON model_timestamps (user_id, model_id, ts DESC);

-- ============================================================
-- 기본 팀 데이터
-- ============================================================

INSERT INTO teams (name) VALUES
  ('TI Image 운영본부'),
  ('TI Image 팀 PM'),
  ('TI Image PM파트1'),
  ('TI Image PM파트2'),
  ('TI Image 팀 DM'),
  ('TI Image 사업개발실'),
  ('TI Image 사업개발팀'),
  ('TI 경영지원팀'),
  ('TI 경영관리팀'),
  ('TI QA 팀'),
  ('TI R&D Team'),
  ('TI 관리본부'),
  ('TI 사업개발팀'),
  ('TI 고객가치혁신팀'),
  ('TI 정보보호팀'),
  ('TI EDC 팀'),
  ('TI IMT 팀'),
  ('TI CTMS 팀'),
  ('TI TDH 팀'),
  ('TI AX 팀')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- RLS 정책
-- ============================================================

CREATE POLICY "Authenticated users see all teams" ON teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users manage teams" ON teams
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users see all profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users manage profiles" ON profiles
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users see all events" ON activity_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users manage activity_events" ON activity_events
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users see all timestamps" ON model_timestamps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users manage model_timestamps" ON model_timestamps
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 회원가입 시 프로필 자동 생성
-- 첫 가입자는 admin, 이후 가입자는 member로 저장한다.
-- display_name이 있으면 auth 메타데이터에서 함께 저장한다.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role text := 'member';
  user_display_name text := nullif(trim(coalesce(NEW.raw_user_meta_data->>'display_name', '')), '');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles) THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO profiles (id, email, display_name, role)
  VALUES (NEW.id, NEW.email, user_display_name, assigned_role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

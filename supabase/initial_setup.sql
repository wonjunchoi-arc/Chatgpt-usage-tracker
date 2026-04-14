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
  signup_source text NOT NULL DEFAULT 'extension' CHECK (signup_source IN ('dashboard', 'extension', 'unknown')),
  is_bootstrap_admin boolean NOT NULL DEFAULT false,
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
  month_key                 text NOT NULL,
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
CREATE INDEX idx_activity_events_month_key ON activity_events (month_key);
CREATE INDEX idx_activity_events_model ON activity_events (model_id);
CREATE INDEX idx_activity_events_app ON activity_events (app);

-- 4. 일별 활동 유형 집계
CREATE TABLE daily_activity_breakdown (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date        date NOT NULL,
  month_key   text NOT NULL,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity    text NOT NULL,
  usage_count int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, user_id, activity)
);

ALTER TABLE daily_activity_breakdown ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_daily_activity_breakdown_user_month ON daily_activity_breakdown (user_id, month_key);
CREATE INDEX idx_daily_activity_breakdown_date ON daily_activity_breakdown (date);

-- 5. 월별 모델 사용량 집계
CREATE TABLE monthly_usage_summary (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month_key   text NOT NULL,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id    text NOT NULL,
  usage_count int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_key, user_id, model_id)
);

ALTER TABLE monthly_usage_summary ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_monthly_usage_summary_month_user ON monthly_usage_summary (month_key, user_id);
CREATE INDEX idx_monthly_usage_summary_model ON monthly_usage_summary (model_id);

-- 5. 월별 앱 사용량 집계
CREATE TABLE monthly_app_summary (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month_key   text NOT NULL,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app         text NOT NULL,
  usage_count int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_key, user_id, app)
);

ALTER TABLE monthly_app_summary ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_monthly_app_summary_month_user ON monthly_app_summary (month_key, user_id);
CREATE INDEX idx_monthly_app_summary_app ON monthly_app_summary (app);

-- 6. 월별 기능 사용량 집계
CREATE TABLE monthly_feature_summary (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month_key   text NOT NULL,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature     text NOT NULL,
  usage_count int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_key, user_id, feature)
);

ALTER TABLE monthly_feature_summary ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_monthly_feature_summary_month_user ON monthly_feature_summary (month_key, user_id);
CREATE INDEX idx_monthly_feature_summary_feature ON monthly_feature_summary (feature);

-- 7. 월별 팀 모델 사용량 집계
CREATE TABLE monthly_team_model_summary (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month_key   text NOT NULL,
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  model_id    text NOT NULL,
  usage_count int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_key, team_id, model_id)
);

ALTER TABLE monthly_team_model_summary ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_monthly_team_model_summary_month_team ON monthly_team_model_summary (month_key, team_id);
CREATE INDEX idx_monthly_team_model_summary_model ON monthly_team_model_summary (model_id);

-- 8. 월별 팀 앱 사용량 집계
CREATE TABLE monthly_team_app_summary (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month_key   text NOT NULL,
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  app         text NOT NULL,
  usage_count int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_key, team_id, app)
);

ALTER TABLE monthly_team_app_summary ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_monthly_team_app_summary_month_team ON monthly_team_app_summary (month_key, team_id);

-- 9. 월별 팀 기능 사용량 집계
CREATE TABLE monthly_team_feature_summary (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month_key   text NOT NULL,
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  feature     text NOT NULL,
  usage_count int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_key, team_id, feature)
);

ALTER TABLE monthly_team_feature_summary ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_monthly_team_feature_summary_month_team ON monthly_team_feature_summary (month_key, team_id);

-- 10. 월별 팀 활성 멤버 수 집계
CREATE TABLE monthly_team_active_members (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month_key          text NOT NULL,
  team_id            uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  active_member_count int NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_key, team_id)
);

ALTER TABLE monthly_team_active_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_monthly_team_active_members_month_team ON monthly_team_active_members (month_key, team_id);

-- 11. activity_events 적재 시 월별·일별 집계 자동 갱신 (유저 + 팀)
CREATE OR REPLACE FUNCTION sync_monthly_activity_summaries()
RETURNS trigger AS $$
DECLARE
  v_team_id              uuid;
  v_is_first_event_month boolean;
  v_date                 date;
BEGIN
  -- 이번 달 이 유저의 첫 이벤트인지 먼저 확인 (upsert 전에 체크해야 정확함)
  v_is_first_event_month := NOT EXISTS (
    SELECT 1 FROM monthly_usage_summary
    WHERE user_id = NEW.user_id AND month_key = NEW.month_key
  );

  v_date := date(NEW.server_ts);

  -- 유저 레벨 집계
  INSERT INTO monthly_usage_summary (month_key, user_id, model_id, usage_count, updated_at)
  VALUES (NEW.month_key, NEW.user_id, NEW.model_id, 1, now())
  ON CONFLICT (month_key, user_id, model_id)
  DO UPDATE
    SET usage_count = monthly_usage_summary.usage_count + 1,
        updated_at = now();

  INSERT INTO monthly_app_summary (month_key, user_id, app, usage_count, updated_at)
  VALUES (NEW.month_key, NEW.user_id, NEW.app, 1, now())
  ON CONFLICT (month_key, user_id, app)
  DO UPDATE
    SET usage_count = monthly_app_summary.usage_count + 1,
        updated_at = now();

  IF coalesce(array_length(NEW.features, 1), 0) > 0 THEN
    INSERT INTO monthly_feature_summary (month_key, user_id, feature, usage_count, updated_at)
    SELECT NEW.month_key, NEW.user_id, feature, count(*), now()
    FROM unnest(NEW.features) AS feature
    GROUP BY feature
    ON CONFLICT (month_key, user_id, feature)
    DO UPDATE
      SET usage_count = monthly_feature_summary.usage_count + EXCLUDED.usage_count,
          updated_at = now();
  END IF;

  -- 일별 활동 유형 집계
  IF NEW.app = 'chat' THEN
    INSERT INTO daily_activity_breakdown (date, month_key, user_id, activity, usage_count, updated_at)
    VALUES (v_date, NEW.month_key, NEW.user_id, 'chat', 1, now())
    ON CONFLICT (date, user_id, activity)
    DO UPDATE
      SET usage_count = daily_activity_breakdown.usage_count + 1,
          updated_at = now();
  END IF;

  IF coalesce(array_length(NEW.features, 1), 0) > 0 THEN
    INSERT INTO daily_activity_breakdown (date, month_key, user_id, activity, usage_count, updated_at)
    SELECT v_date, NEW.month_key, NEW.user_id, feature, count(*), now()
    FROM unnest(NEW.features) AS feature
    WHERE feature = ANY(ARRAY['file-analysis','connector-app','skill-invocation','project-context','image-generation','search','pro-model'])
    GROUP BY feature
    ON CONFLICT (date, user_id, activity)
    DO UPDATE
      SET usage_count = daily_activity_breakdown.usage_count + EXCLUDED.usage_count,
          updated_at = now();
  END IF;

  -- 팀 레벨 집계
  SELECT team_id INTO v_team_id FROM profiles WHERE id = NEW.user_id;

  IF v_team_id IS NOT NULL THEN
    INSERT INTO monthly_team_model_summary (month_key, team_id, model_id, usage_count, updated_at)
    VALUES (NEW.month_key, v_team_id, NEW.model_id, 1, now())
    ON CONFLICT (month_key, team_id, model_id)
    DO UPDATE
      SET usage_count = monthly_team_model_summary.usage_count + 1,
          updated_at = now();

    INSERT INTO monthly_team_app_summary (month_key, team_id, app, usage_count, updated_at)
    VALUES (NEW.month_key, v_team_id, NEW.app, 1, now())
    ON CONFLICT (month_key, team_id, app)
    DO UPDATE
      SET usage_count = monthly_team_app_summary.usage_count + 1,
          updated_at = now();

    IF coalesce(array_length(NEW.features, 1), 0) > 0 THEN
      INSERT INTO monthly_team_feature_summary (month_key, team_id, feature, usage_count, updated_at)
      SELECT NEW.month_key, v_team_id, feature, count(*), now()
      FROM unnest(NEW.features) AS feature
      GROUP BY feature
      ON CONFLICT (month_key, team_id, feature)
      DO UPDATE
        SET usage_count = monthly_team_feature_summary.usage_count + EXCLUDED.usage_count,
            updated_at = now();
    END IF;

    IF v_is_first_event_month THEN
      INSERT INTO monthly_team_active_members (month_key, team_id, active_member_count, updated_at)
      VALUES (NEW.month_key, v_team_id, 1, now())
      ON CONFLICT (month_key, team_id)
      DO UPDATE
        SET active_member_count = monthly_team_active_members.active_member_count + 1,
            updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_monthly_activity_summaries
  AFTER INSERT ON activity_events
  FOR EACH ROW EXECUTE FUNCTION sync_monthly_activity_summaries();

-- 12. 기존 activity_events 기준 일별·월별 집계 백필
INSERT INTO monthly_usage_summary (month_key, user_id, model_id, usage_count, updated_at)
SELECT
  month_key,
  user_id,
  model_id,
  count(*) AS usage_count,
  now()
FROM activity_events
GROUP BY month_key, user_id, model_id
ON CONFLICT (month_key, user_id, model_id)
DO UPDATE
  SET usage_count = EXCLUDED.usage_count,
      updated_at = now();

INSERT INTO monthly_app_summary (month_key, user_id, app, usage_count, updated_at)
SELECT
  month_key,
  user_id,
  app,
  count(*) AS usage_count,
  now()
FROM activity_events
GROUP BY month_key, user_id, app
ON CONFLICT (month_key, user_id, app)
DO UPDATE
  SET usage_count = EXCLUDED.usage_count,
      updated_at = now();

INSERT INTO monthly_feature_summary (month_key, user_id, feature, usage_count, updated_at)
SELECT
  ae.month_key,
  ae.user_id,
  feature,
  count(*) AS usage_count,
  now()
FROM activity_events ae
CROSS JOIN LATERAL unnest(ae.features) AS feature
GROUP BY ae.month_key, ae.user_id, feature
ON CONFLICT (month_key, user_id, feature)
DO UPDATE
  SET usage_count = EXCLUDED.usage_count,
      updated_at = now();

-- 일별 활동 유형 백필
INSERT INTO daily_activity_breakdown (date, month_key, user_id, activity, usage_count, updated_at)
SELECT
  date(server_ts) AS date,
  month_key,
  user_id,
  'chat' AS activity,
  count(*) AS usage_count,
  now()
FROM activity_events
WHERE app = 'chat'
GROUP BY date(server_ts), month_key, user_id
ON CONFLICT (date, user_id, activity)
DO UPDATE
  SET usage_count = EXCLUDED.usage_count,
      updated_at = now();

INSERT INTO daily_activity_breakdown (date, month_key, user_id, activity, usage_count, updated_at)
SELECT
  date(ae.server_ts) AS date,
  ae.month_key,
  ae.user_id,
  feature AS activity,
  count(*) AS usage_count,
  now()
FROM activity_events ae
CROSS JOIN LATERAL unnest(ae.features) AS feature
WHERE feature = ANY(ARRAY['file-analysis','connector-app','skill-invocation','project-context','image-generation','search','pro-model'])
GROUP BY date(ae.server_ts), ae.month_key, ae.user_id, feature
ON CONFLICT (date, user_id, activity)
DO UPDATE
  SET usage_count = EXCLUDED.usage_count,
      updated_at = now();

-- 팀 레벨 백필
INSERT INTO monthly_team_model_summary (month_key, team_id, model_id, usage_count, updated_at)
SELECT
  ae.month_key,
  p.team_id,
  ae.model_id,
  count(*) AS usage_count,
  now()
FROM activity_events ae
JOIN profiles p ON p.id = ae.user_id
WHERE p.team_id IS NOT NULL
GROUP BY ae.month_key, p.team_id, ae.model_id
ON CONFLICT (month_key, team_id, model_id)
DO UPDATE
  SET usage_count = EXCLUDED.usage_count,
      updated_at = now();

INSERT INTO monthly_team_app_summary (month_key, team_id, app, usage_count, updated_at)
SELECT
  ae.month_key,
  p.team_id,
  ae.app,
  count(*) AS usage_count,
  now()
FROM activity_events ae
JOIN profiles p ON p.id = ae.user_id
WHERE p.team_id IS NOT NULL
GROUP BY ae.month_key, p.team_id, ae.app
ON CONFLICT (month_key, team_id, app)
DO UPDATE
  SET usage_count = EXCLUDED.usage_count,
      updated_at = now();

INSERT INTO monthly_team_feature_summary (month_key, team_id, feature, usage_count, updated_at)
SELECT
  ae.month_key,
  p.team_id,
  feature,
  count(*) AS usage_count,
  now()
FROM activity_events ae
JOIN profiles p ON p.id = ae.user_id
CROSS JOIN LATERAL unnest(ae.features) AS feature
WHERE p.team_id IS NOT NULL
GROUP BY ae.month_key, p.team_id, feature
ON CONFLICT (month_key, team_id, feature)
DO UPDATE
  SET usage_count = EXCLUDED.usage_count,
      updated_at = now();

INSERT INTO monthly_team_active_members (month_key, team_id, active_member_count, updated_at)
SELECT
  ae.month_key,
  p.team_id,
  count(DISTINCT ae.user_id) AS active_member_count,
  now()
FROM activity_events ae
JOIN profiles p ON p.id = ae.user_id
WHERE p.team_id IS NOT NULL
GROUP BY ae.month_key, p.team_id
ON CONFLICT (month_key, team_id)
DO UPDATE
  SET active_member_count = EXCLUDED.active_member_count,
      updated_at = now();

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

CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = check_user_id
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY "Authenticated users see all teams" ON teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage teams" ON teams
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users see all profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage profiles" ON profiles
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins delete profiles" ON profiles
  FOR DELETE USING (is_admin());

CREATE POLICY "Authenticated users see all events" ON activity_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users insert activity_events" ON activity_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage activity_events" ON activity_events
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins delete activity_events" ON activity_events
  FOR DELETE USING (is_admin());

CREATE POLICY "Authenticated users see daily activity breakdown" ON daily_activity_breakdown
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage daily activity breakdown" ON daily_activity_breakdown
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users see monthly usage summary" ON monthly_usage_summary
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage monthly usage summary" ON monthly_usage_summary
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users see monthly app summary" ON monthly_app_summary
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage monthly app summary" ON monthly_app_summary
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users see monthly feature summary" ON monthly_feature_summary
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage monthly feature summary" ON monthly_feature_summary
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users see monthly team model summary" ON monthly_team_model_summary
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage monthly team model summary" ON monthly_team_model_summary
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users see monthly team app summary" ON monthly_team_app_summary
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage monthly team app summary" ON monthly_team_app_summary
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users see monthly team feature summary" ON monthly_team_feature_summary
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage monthly team feature summary" ON monthly_team_feature_summary
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users see monthly team active members" ON monthly_team_active_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage monthly team active members" ON monthly_team_active_members
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- 회원가입 시 프로필 자동 생성
-- dashboard 경로로 가입한 첫 2명만 bootstrap admin으로 저장한다.
-- display_name / signup_source는 auth 메타데이터에서 함께 저장한다.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role text := 'member';
  assigned_bootstrap_admin boolean := false;
  user_display_name text := nullif(trim(coalesce(NEW.raw_user_meta_data->>'display_name', '')), '');
  user_signup_source text := lower(nullif(trim(coalesce(NEW.raw_user_meta_data->>'signup_source', '')), ''));
BEGIN
  IF user_signup_source IS NULL THEN
    user_signup_source := 'unknown';
  END IF;

  -- Serialize bootstrap admin assignment so concurrent signups cannot exceed two admins.
  PERFORM pg_advisory_xact_lock(hashtextextended('chatgpt_usage_tracker_bootstrap_admins', 0));

  IF user_signup_source = 'dashboard'
     AND (
       SELECT count(*)
       FROM profiles
       WHERE is_bootstrap_admin = true
     ) < 2 THEN
    assigned_role := 'admin';
    assigned_bootstrap_admin := true;
  END IF;

  INSERT INTO profiles (id, email, display_name, signup_source, is_bootstrap_admin, role)
  VALUES (NEW.id, NEW.email, user_display_name, user_signup_source, assigned_bootstrap_admin, assigned_role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

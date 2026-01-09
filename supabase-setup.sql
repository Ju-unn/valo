-- Supabase 데이터베이스 설정 SQL
-- Supabase 대시보드의 SQL Editor에서 이 스크립트를 실행하세요

-- 기존 auction_items 테이블 삭제 (있다면)
DROP TABLE IF EXISTS auction_items CASCADE;

-- auction_items 테이블 생성 (선수 정보)
CREATE TABLE auction_items (
  id BIGSERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  agent1 TEXT,
  agent2 TEXT,
  agent3 TEXT,
  comment TEXT,
  order_index INTEGER DEFAULT 0,
  sold BOOLEAN DEFAULT FALSE,
  price INTEGER DEFAULT 0,
  team_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- auction_state 테이블 생성
CREATE TABLE IF NOT EXISTS auction_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Realtime 활성화 (이미 추가된 경우 에러 무시)
DO $$
BEGIN
  -- auction_items를 Realtime에 추가 (없는 경우만)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'auction_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE auction_items;
  END IF;
  
  -- auction_state를 Realtime에 추가 (없는 경우만)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'auction_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE auction_state;
  END IF;
END $$;

-- RLS (Row Level Security) 정책 설정 (모든 사용자가 읽고 쓸 수 있도록)
ALTER TABLE auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_state ENABLE ROW LEVEL SECURITY;

-- auction_items 테이블 정책 설정 (이미 존재하면 삭제 후 재생성)
DROP POLICY IF EXISTS "Allow public read access on auction_items" ON auction_items;
DROP POLICY IF EXISTS "Allow public write access on auction_items" ON auction_items;
DROP POLICY IF EXISTS "Allow public update access on auction_items" ON auction_items;
DROP POLICY IF EXISTS "Allow public delete access on auction_items" ON auction_items;

CREATE POLICY "Allow public read access on auction_items" ON auction_items
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public write access on auction_items" ON auction_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access on auction_items" ON auction_items
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access on auction_items" ON auction_items
  FOR DELETE
  USING (true);

-- auction_state 테이블 정책 설정 (이미 존재하면 삭제 후 재생성)
DROP POLICY IF EXISTS "Allow public read access" ON auction_state;
DROP POLICY IF EXISTS "Allow public write access" ON auction_state;
DROP POLICY IF EXISTS "Allow public update access" ON auction_state;

-- 모든 사용자가 읽을 수 있도록
CREATE POLICY "Allow public read access" ON auction_state
  FOR SELECT
  USING (true);

-- 모든 사용자가 쓸 수 있도록
CREATE POLICY "Allow public write access" ON auction_state
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access" ON auction_state
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 설정 (이미 존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS update_auction_items_updated_at ON auction_items;
DROP TRIGGER IF EXISTS update_auction_state_updated_at ON auction_state;

CREATE TRIGGER update_auction_items_updated_at BEFORE UPDATE ON auction_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auction_state_updated_at BEFORE UPDATE ON auction_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


# 빠른 설정 가이드

## 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ppojvuyoxhpbghjpvaft.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_NYGvT7IcYGVLIRFGbs7sFg_Blbh4qvX
```

## 2. Supabase 데이터베이스 설정

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. `supabase-setup.sql` 파일의 전체 내용을 복사하여 붙여넣기
5. **RUN** 버튼 클릭하여 실행

## 3. Realtime 활성화

1. Supabase 대시보드에서 **Database** → **Replication** 메뉴로 이동
2. `auction_state` 테이블 찾기
3. Realtime 토글을 **ON**으로 설정

## 4. 개발 서버 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 5. Vercel 배포 시 환경 변수 설정

Vercel 대시보드에서 프로젝트 설정 → Environment Variables에 다음을 추가:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://ppojvuyoxhpbghjpvaft.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_NYGvT7IcYGVLIRFGbs7sFg_Blbh4qvX`


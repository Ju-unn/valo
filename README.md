# 발로란트 팀 경매 시스템

실시간 멀티플레이어 경매 시스템입니다. Supabase와 Vercel을 사용하여 구축되었습니다.

## 기능

- ✅ 실시간 동기화 (Supabase Realtime)
- ✅ 팀 등록 및 예산 관리
- ✅ 선수 등록 및 순서 조정
- ✅ 실시간 입찰 시스템
- ✅ 타이머 기반 자동 낙찰/유찰
- ✅ 재경매 기능
- ✅ 반응형 디자인

## 시작하기

### 1. 저장소 클론 및 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정에서 다음 정보 확인:
   - Project URL
   - Anon (public) key
3. SQL Editor에서 `supabase-setup.sql` 파일의 내용 실행

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## Vercel 배포

### 1. GitHub에 푸시

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo-url
git push -u origin main
```

### 2. Vercel 배포

1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 선택
4. 환경 변수 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. "Deploy" 클릭

### 3. Supabase Realtime 활성화

Supabase 대시보드에서:
1. Database → Replication으로 이동
2. `auction_state` 테이블의 Realtime 활성화

## 사용 방법

1. **설정 단계**: 팀과 선수를 등록합니다
2. **경매 시작**: "경매 시작" 버튼을 클릭합니다
3. **입찰**: 각 선수마다 팀이 입찰할 수 있습니다
4. **자동 낙찰**: 15초 타이머가 끝나면 자동으로 낙찰 또는 유찰됩니다
5. **재경매**: 유찰된 선수는 자동으로 재경매됩니다

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Deployment**: Vercel

## 라이선스

MIT


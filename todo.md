# Todo List

## 1. Slack 앱 및 권한 준비
1. Slack App 생성, Socket Mode 활성화
2. App Token(`xapp-...`)과 Bot Token(`xoxb-...`) 발급
3. OAuth 권한(scopes) 추가: `channels:read`, `chat:write`, `files:read` 등
4. 워크스페이스에 설치 후 토큰을 **.env**에만 저장

## 2. 환경 변수와 공통 설정
1. 루트에 `.env` 생성: `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN`, `NEXT_PUBLIC_API_BASE` 등 작성
2. NestJS `ConfigModule`과 Joi로 환경 변수 검증 로직 추가
3. Next.js에서는 `NEXT_PUBLIC_` 접두 변수를 읽도록 설정

## 3. 프로젝트 레이아웃
1. pnpm 워크스페이스 초기화
2. `apps/api`(NestJS)와 `apps/web`(Next.js) 디렉터리 생성
3. DTO/타입 공유를 위해 `packages/shared` 생성

## 4. NestJS API 개발
### 4.1 기본 세팅
1. `pnpm create nest apps/api`로 API 프로젝트 생성
2. `SlackModule`/`SlackService` 생성, Socket Mode 연결 설정
3. `@slack/bolt`와 `@slack/web-api` 패키지 설치

### 4.2 컨트롤러 구현
- **ConversationsController**
  1. `GET /api/conversations` 구현, `types` 필터와 페이지네이션 지원
  2. SlackService `listConversations()` 호출, DTO 검증 및 에러 처리
- **MessagesController**
  1. `GET /api/conversations/:id/messages` 구현, `cursor` 기반 페이징
  2. `POST /api/conversations/:id/messages` 구현, 텍스트·파일·`thread_ts` 지원
  3. `GET /api/messages/events` SSE 엔드포인트 구현
- **FilesController**
  1. `GET /api/files/:fileId` 프록시 다운로드 구현
  2. 승인된 확장자·크기 검증 및 다운로드 로그 남기기

### 4.3 서비스 로직
1. SlackService에 `listConversations`, `getMessages`, `postMessage`, `downloadFile` 메서드 작성
2. EventService: Socket Mode 이벤트 수신 → SSE 클라이언트에 브로드캐스트
3. RateLimitService: 사용자·채널별 호출 횟수 제한 로직 추가

### 4.4 공통 구조
1. `ConfigModule`, `ValidationPipe`, 로깅 인터셉터 설정
2. 민감정보 마스킹 로그 및 전역 에러 필터 작성

## 5. Next.js UI 개발
### 5.1 기본 세팅
1. `pnpm create next-app apps/web`으로 프로젝트 생성
2. React Query, SSE polyfill, 스타일 라이브러리(Tailwind 등) 설치

### 5.2 페이지 및 컴포넌트
- `/` 페이지
  1. `ChannelList` 컴포넌트: `/api/conversations` 호출, 채널 선택 시 `/c/[channelId]` 이동
- `/c/[channelId]` 페이지
  1. `MessageList` 컴포넌트: `useInfiniteQuery` 기반 무한 스크롤 구현
  2. `MessageInput` 컴포넌트: 메시지 및 파일 업로드 구현
  3. SSE 이벤트 수신하여 새 메시지 실시간 반영

### 5.3 상태 관리 및 유틸
1. React Query Provider 설정, 에러/로딩 UI 작성
2. SSE 연결 훅 또는 Context 작성
3. 파일 다운로드 시 항상 API 프록시 URL 사용

## 6. 로컬 실행 및 스크립트
1. 워크스페이스 루트 `pnpm -w dev` 스크립트 작성
2. API: `pnpm --filter @app/api start:dev`
3. Web: `pnpm --filter @app/web dev`

## 7. 보안 및 로깅
1. 토큰/민감정보는 로그에서 마스킹
2. 파일 다운로드 로그에 파일명·용량·채널·요청자 정보 기록
3. CSP 또는 코드 검증으로 브라우저가 Slack URL에 직접 접근하지 않도록 차단

## 8. 테스트 작성
1. **Backend Unit**: SlackService 및 각 Controller를 `@nestjs/testing`으로 mock 테스트
2. **Frontend Unit**: React 컴포넌트/훅을 `@testing-library/react`로 테스트
3. **E2E**: supertest(Nest)와 Playwright/Cypress(Next)로 채널 조회→메시지 전송 시나리오 검증
4. 최소 커버리지 설정 및 GitHub Actions CI 구성

## 9. 추가 로드맵
1. 쓰레드 답글, 리액션, 북마크 기능
2. 메모리 캐시 용량 관리
3. 다중 워크스페이스 전환 지원

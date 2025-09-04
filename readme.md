# Slack‑Proxy WebApp (Next.js + NestJS) — Local‑only Edition

> 로컬(내 노트북)에서만 사용하는 **Slack 프록시 웹앱**. 브라우저는 slack.com에 직접 접근하지 않고, **NestJS 서버만 Slack과 통신**합니다. DB/Redis 없이 동작하며, **위로 스크롤 시 과거 메시지를 커서 기반으로 불러옵니다.**

---

## ✨ 목적

* 사내 정책으로 **브라우저 → slack.com 접근 금지** 상황에서 사용
* **Next.js 프런트** + **NestJS 백엔드** 두 프로세스만 구동
* **DB/Redis 없음** (상태는 메모리/프런트 캐시)
* 기능: 채널 선택, 메시지 읽기/쓰기, **무한 스크롤(위로) 과거 로딩**, 파일/이미지 프록시 다운로드

---

## 🧱 아키텍처

```
Browser  ⇄  Next.js (UI)  ⇄  NestJS API  ⇄  Slack Web API + Socket Mode
 (no slack.com)             (proxy)          (outbound only)
```

* 브라우저는 **오직 Nest API**만 호출
* Nest는 `@slack/web-api` + `@slack/bolt`(Socket Mode) 로 Slack과 통신
* 파일 다운로드는 항상 **서버 프록시**를 통해 스트리밍

---

## 📦 기술 스택

* **Frontend**: Next.js 14+ (App Router), React Query, Mantine (or any), SSE(옵션)
* **Backend**: NestJS 10+, `@slack/bolt`(Socket Mode), `@slack/web-api`, class‑validator
* **Runtime**: Node 20+, pnpm
* **Infra**: 없음 (Docker/DB/Redis 불필요)

---

## 🔐 Slack 앱 준비

1. Slack App 생성 → **Socket Mode** 활성화, **App Token**(`xapp-…`) 발급
2. OAuth & Permissions → Bot Token Scopes (예시 최소)

    * `channels:read`, `groups:read`, `im:read`, `mpim:read`
    * `channels:history`, `groups:history`, `im:history`, `mpim:history`
    * `chat:write`, `files:read`, `files:write`, `users:read`
3. 워크스페이스에 설치 → **Bot Token**(`xoxb-…`) 확보

> 토큰은 **백엔드 환경변수**에만 저장 (클라이언트에 노출 금지)

---

## 🔧 환경 설정

`.env`

```dotenv
NODE_ENV=development
PORT=4000

# Nest API
SLACK_APP_TOKEN=xapp-…
SLACK_BOT_TOKEN=xoxb-…
SLACK_SIGNING_SECRET=…  # Socket Mode에선 필수 아님

# Next.js
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

> 브라우저는 \*\*항상 `NEXT_PUBLIC_API_BASE`\*\*로만 호출합니다.

---

## 🗂️ 레이아웃(권장)

```
repo/
  apps/
    api/    # NestJS (proxy + socket mode)
    web/    # Next.js (App Router UI)
  packages/
    shared/ # DTO/타입 공유 (선택)
  .env
```

---

## 🚀 로컬 실행

두 프로세스만 구동합니다.

```bash
# terminal 1 (API)
cd apps/api && pnpm install && pnpm start:dev

# terminal 2 (Web)
cd apps/web && pnpm install && pnpm dev
```

---

## 🧩 NestJS API 설계 (간단)

**Base**: `http://localhost:4000`

### Channels

* `GET /api/conversations?types=public_channel,private_channel,im,mpim&limit=…&cursor=…`
* `GET /api/conversations/:id`

### Messages

* `GET /api/messages?channel={id}&limit=50&cursor=…`
  ↳ Slack `conversations.history`/`conversations.replies` 래핑, 커서 기반 페이지네이션
* `POST /api/messages` — `{ channel, text?, blocks?, thread_ts? }`
* `GET /api/messages/stream?channel={id}` — **SSE 실시간 수신(옵션)**

### Files

* `POST /api/files.download` — `{ fileId? | urlPrivate? }` → **프록시 스트림** 응답
* `POST /api/files.upload` — 멀티파트 업로드 `{ channel, file, filename?, initial_comment? }`

### Socket Mode 이벤트 처리

* Bolt App(Socket Mode) 구동 → `message.*`, `file_shared` 등 구독
* **인메모리 브로드캐스트**로 SSE 구독자에게 전달 (외부 스토리지/브로커 없음)

### 레이트 리밋

* Slack 429 응답의 `retry_after`를 준수, 지수 백오프 재시도

---

## 🖥️ Next.js UI 동작

* 라우트: `/` (채널 선택) → `/c/[channelId]` (채널 화면)
* 데이터: React Query로 Nest API 호출, 필요 시 SSE 연결

### 무한 스크롤(위로) 과거 로딩

1. 진입 시 `GET /api/messages?channel=C123&limit=50` (최근 50개)
2. 스크롤 상단 임계 도달 → 응답의 `nextCursor`로 `GET …&cursor=XXXX`
3. **prepend**로 이전 메시지 추가, `ts` 중복 제거
4. 429 시 `retry_after` 만큼 대기 후 재요청

---

## 🔒 보안/로깅

* 토큰/민감정보는 로그에서 마스킹
* 파일 프록시 다운로드 로그(파일명/용량/채널/요청자) 남김
* 브라우저가 Slack URL에 직접 접근하지 않도록 CSP/코드 점검

---

## 🧪 테스트

* Unit: SlackService mock(`nock`)으로 Web API 호출 검증
* E2E: 샌드박스 워크스페이스에 실제 토큰으로 최소 시나리오 수행

---

## ✅ 체크리스트

* [x] 브라우저→Slack 직접 호출 금지
* [x] 서버 프록시 경유
* [x] DB/Redis 없이 동작
* [x] 위로 스크롤 시 **커서 기반** 과거 메시지 로딩
* [x] 파일은 항상 서버 프록시로 다운로드

---

## 🧰 명령어 (예시)

```bash
pnpm -w dev            # (필요 시) 워크스페이스 실행 단축키
pnpm --filter @app/api start:dev
pnpm --filter @app/web dev
```

## 로드맵(옵션)

* 쓰레드 보기/답글, 리액션, 핀/북마크
* 간단한 로컬 캐시 용량 관리(메모리 한도)
* 단일/다중 워크스페이스 토글

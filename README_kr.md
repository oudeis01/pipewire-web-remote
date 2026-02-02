# PipeWire Web Remote

PipeWire 오디오 시스템을 위한 원격 제어 웹 인터페이스입니다.

## 주요 기능

- **볼륨 제어**: `wpctl`을 이용한 원격 볼륨 및 음소거 관리.
- **패치베이**: SVG 시각화 및 드래그 앤 드롭 방식을 지원하는 실시간 오디오 라우팅.
- **동기화**: 레이스 컨디션 방지를 위한 시퀀스 추적 기능이 포함된 다중 클라이언트 상태 동기화.
- **모바일 최적화**: 터치 기기를 위한 반응형 믹서 레이아웃, 패닝(Panning), 핀치 줌(Pinch-to-Zoom) 지원.
- **실시간 로그**: 설정(Setup) 뷰에서 WebSocket을 통한 실시간 시스템 로그 스트리밍.
- **아키텍처**: Rust/Axum 백엔드 및 내장된(Embedded) Vanilla JS/Web Components 프론트엔드.

## 사전 요구 사항

- PipeWire 및 WirePlumber가 설치된 Linux OS.
- 시스템 라이브러리: `libpipewire-0.3-dev`, `pkg-config`, `clang`.
- Rust 툴체인 (최신 안정 버전).

## 설치 방법

### Arch Linux (AUR)

`yay`와 같은 AUR 헬퍼를 사용하여 설치할 수 있습니다:

**소스에서 빌드:**
```bash
yay -S pipewire-web-remote
```

**사전 빌드된 바이너리 (권장):**
```bash
yay -S pipewire-web-remote-bin
```

#### 지원 아키텍처

- `x86_64`: 일반 PC/노트북 (Intel/AMD)
- `aarch64`: 64비트 ARM (예: 64비트 OS가 설치된 라즈베리 파이 4/5)
- `armv7h`: 32비트 ARM (예: 32비트 OS가 설치된 라즈베리 파이 2/3/4)

### 소스에서 빌드

1. 저장소 복제:
   ```bash
   git clone https://github.com/oudeis01/pipewire-web-remote.git
   cd pipewire-web-remote
   ```

2. 애플리케이션 빌드:
   ```bash
   cargo build --release
   ```

## 사용 방법

### 명령줄 옵션

```bash
pipewire-web-remote [OPTIONS] [COMMAND]

Options:
  -l, --listen <HOST:PORT>  서버 주소 및 포트 지정 [기본값: 127.0.0.1:8449]
      --allow-external      외부 접속 허용 (0.0.0.0으로 바인딩)
  -h, --help                도움말 출력
  -V, --version             버전 정보 출력

Commands:
  systemd    systemd 유저 서비스 설치 관리
```

### 서버 실행

**로컬호스트만 (기본값, 안전):**
```bash
pipewire-web-remote
# 서버가 http://127.0.0.1:8449 에서 실행됩니다
```

**커스텀 포트:**
```bash
pipewire-web-remote --listen 127.0.0.1:9000
```

**외부 접속 허용 (⚠ 보안 경고):**
```bash
pipewire-web-remote --allow-external
# 서버가 http://0.0.0.0:8449 에서 실행됩니다
# 방화벽 설정을 확인하세요!
```

### 웹 인터페이스

웹 브라우저에서 `http://localhost:8449` (또는 지정한 포트)로 접속하세요.

## 배포

### Systemd 유저 서비스

#### AUR 패키지에서 설치한 경우

systemd 유저 서비스 파일이 `/usr/lib/systemd/user/`에 자동으로 설치됩니다.

서비스 활성화 및 시작:

```bash
systemctl --user enable --now pipewire-web-remote.service
```

부팅 시 자동 시작 (로그아웃 상태에서도):

```bash
loginctl enable-linger $USER
```

#### 소스에서 빌드한 경우 (cargo install)

`cargo install pipewire-web-remote`로 설치한 후:

```bash
pipewire-web-remote systemd install --enable --now
```

또는 자동 활성화 없이 설치만:

```bash
pipewire-web-remote systemd install
systemctl --user enable --now pipewire-web-remote.service
```

#### 수동 서비스 파일 생성

수동 설정을 선호하는 경우, `~/.config/systemd/user/pipewire-web-remote.service` 파일 생성:

```ini
[Unit]
Description=PipeWire Web Remote Service
Documentation=https://github.com/oudeis01/pipewire-web-remote
After=pipewire.service
Requires=pipewire.service

[Service]
Type=simple
ExecStart=/usr/bin/pipewire-web-remote --listen 127.0.0.1:8449
Restart=on-failure
RestartSec=5

NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=default.target
```

그 후 활성화 및 시작:

```bash
systemctl --user daemon-reload
systemctl --user enable --now pipewire-web-remote.service
```

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 배포됩니다.

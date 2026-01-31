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

1. 서버 실행:
   ```bash
   ./target/release/pipewire-web-remote [port]
   ```
   (포트를 지정하지 않으면 기본값으로 8449가 사용됩니다)

2. 웹 브라우저에서 `http://localhost:8449`(또는 지정한 포트)로 접속.

## 배포 (systemd --user)

서비스로 상시 구동하려면 다음 단계를 따르세요:

1. 서비스 디렉토리 생성:
   ```bash
   mkdir -p ~/.config/systemd/user/
   ```

2. 바이너리 복사 (예: `~/.local/bin/`):
   ```bash
   mkdir -p ~/.local/bin/
   cp target/release/pipewire-web-remote ~/.local/bin/
   ```

3. `~/.config/systemd/user/pwr.service` 파일 작성:
   ```ini
   [Unit]
   Description=PipeWire Web Remote Service
   After=pipewire.service

   [Service]
   ExecStart=%h/.local/bin/pipewire-web-remote
   Restart=always

   [Install]
   WantedBy=default.target
   ```

4. 서비스 활성화 및 시작:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now pwr
   ```

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 배포됩니다.

# PipeWire Web Remote

A remote control web interface for PipeWire audio systems.

## Features

- **Volume Control**: Remote volume and mute management using `wpctl`.
- **Patchbay**: Real-time audio routing with SVG visualization and drag-and-drop linking.
- **Synchronization**: Multi-client state synchronization with sequence tracking to prevent race conditions.
- **Mobile Optimized**: Responsive mixer layout, panning, and pinch-to-zoom support for touch devices.
- **Live Logging**: Real-time system log streaming via WebSockets in the Setup view.
- **Architecture**: Rust/Axum backend with embedded Vanilla JS/Web Components frontend.

## Prerequisites

- Linux OS with PipeWire and WirePlumber.
- System libraries: `libpipewire-0.3-dev`, `pkg-config`, `clang`.
- Rust toolchain (latest stable).

## Installation

### Arch Linux (AUR)

Install using an AUR helper like `yay`:

**Build from source:**
```bash
yay -S pipewire-web-remote
```

**Pre-compiled binary (recommended):**
```bash
yay -S pipewire-web-remote-bin
```

#### Supported Architectures

- `x86_64`: Standard PC/Laptop (Intel/AMD)
- `aarch64`: 64-bit ARM (e.g., Raspberry Pi 4/5 with 64-bit OS)
- `armv7h`: 32-bit ARM (e.g., Raspberry Pi 2/3/4 with 32-bit OS)

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/oudeis01/pipewire-web-remote.git
   cd pipewire-web-remote
   ```

2. Build the application:
   ```bash
   cargo build --release
   ```

## Usage

### Command Line Options

```bash
pipewire-web-remote [OPTIONS] [COMMAND]

Options:
  -l, --listen <HOST:PORT>  Address and port to listen on [default: 127.0.0.1:8449]
      --allow-external      Allow external connections (binds to 0.0.0.0)
  -h, --help                Print help
  -V, --version             Print version

Commands:
  systemd    Manage systemd user service installation
```

### Running the Server

**Localhost only (default, secure):**
```bash
pipewire-web-remote
# Server runs at http://127.0.0.1:8449
```

**Custom port:**
```bash
pipewire-web-remote --listen 127.0.0.1:9000
```

**Allow external connections (⚠ Security Warning):**
```bash
pipewire-web-remote --allow-external
# Server runs at http://0.0.0.0:8449
# Make sure to check your firewall settings!
```

### Web Interface

Open a web browser and navigate to `http://localhost:8449` (or your chosen port).

## Deployment

### Systemd User Service

#### From AUR Package

The systemd user service file is automatically installed to `/usr/lib/systemd/user/`.

To enable and start the service:

```bash
systemctl --user enable --now pipewire-web-remote.service
```

To start on boot (even when not logged in):

```bash
loginctl enable-linger $USER
```

#### From Source (cargo install)

After installing with `cargo install pipewire-web-remote`:

```bash
pipewire-web-remote systemd install --enable --now
```

Or install without auto-enabling:

```bash
pipewire-web-remote systemd install
systemctl --user enable --now pipewire-web-remote.service
```

#### Manual Service File Creation

If you prefer manual setup, create `~/.config/systemd/user/pipewire-web-remote.service`:

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

Then enable and start:

```bash
systemctl --user daemon-reload
systemctl --user enable --now pipewire-web-remote.service
```

## License

This project is licensed under the MIT License.

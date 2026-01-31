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

1. Clone the repository:
   ```bash
   git clone https://github.com/username/pipewire-web-remote.git
   cd pipewire-web-remote
   ```

2. Build the application:
   ```bash
   cargo build --release
   ```

## Usage

1. Start the server:
   ```bash
   ./target/release/pipewire-web-remote
   ```

2. Open a web browser and navigate to `http://localhost:8449`.

## Configuration

Server connection settings (Address and Port) can be modified in the **Setup** view. These settings are persisted in the browser's `localStorage`.

## Deployment

To install as a systemd user service:

1. Create the user systemd directory:
   ```bash
   mkdir -p ~/.config/systemd/user/
   ```

2. Copy the binary to a local bin directory (e.g., `~/.local/bin/`):
   ```bash
   mkdir -p ~/.local/bin/
   cp target/release/pipewire-web-remote ~/.local/bin/
   ```

3. Create `~/.config/systemd/user/pwr.service`:
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

4. Enable and start:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now pwr
   ```

## License

This project is licensed under the MIT License.

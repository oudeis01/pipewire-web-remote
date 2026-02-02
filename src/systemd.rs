use anyhow::{bail, Context, Result};
use std::fs;
use std::process::Command;
use tracing::{info, warn};

pub fn install_user_service(enable: bool, now: bool) -> Result<()> {
    if now && !enable {
        bail!("--now requires --enable flag");
    }

    let config_dir = dirs::config_dir().context("Cannot find user config directory")?;

    let systemd_user_dir = config_dir.join("systemd/user");
    fs::create_dir_all(&systemd_user_dir).context("Failed to create systemd user directory")?;

    let service_path = systemd_user_dir.join("pipewire-web-remote.service");

    let binary_path = std::env::current_exe().context("Cannot determine binary path")?;

    let service_content = format!(
        r#"[Unit]
Description=PipeWire Web Remote Service
Documentation=https://github.com/oudeis01/pipewire-web-remote
After=pipewire.service
Requires=pipewire.service

[Service]
Type=simple
ExecStart={} --listen 127.0.0.1:8449
Restart=on-failure
RestartSec=5

NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=default.target
"#,
        binary_path.display()
    );

    fs::write(&service_path, service_content).context("Failed to write service file")?;

    info!("✓ Created {}", service_path.display());

    let daemon_reload = Command::new("systemctl")
        .args(&["--user", "daemon-reload"])
        .status();

    match daemon_reload {
        Ok(status) if status.success() => {
            info!("✓ Reloaded systemd user daemon");
        }
        Ok(_) | Err(_) => {
            warn!("Failed to reload systemd daemon. Run manually: systemctl --user daemon-reload");
        }
    }

    if enable {
        let mut enable_cmd = Command::new("systemctl");
        enable_cmd.args(&["--user", "enable", "pipewire-web-remote.service"]);

        if now {
            enable_cmd.arg("--now");
        }

        match enable_cmd.status() {
            Ok(status) if status.success() => {
                if now {
                    info!("✓ Enabled and started service");
                } else {
                    info!("✓ Enabled service");
                }
            }
            Ok(_) | Err(_) => {
                warn!("Failed to enable service. Run manually: systemctl --user enable --now pipewire-web-remote.service");
            }
        }
    } else {
        println!("\nTo enable and start the service:");
        println!("  systemctl --user enable --now pipewire-web-remote.service");
        println!("\nTo start on boot (even when not logged in):");
        println!("  loginctl enable-linger $USER");
    }

    Ok(())
}

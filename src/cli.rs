use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "pipewire-web-remote",
    version,
    about = "A remote control web interface for PipeWire audio systems",
    long_about = None
)]
pub struct Cli {
    #[arg(
        short = 'l',
        long,
        value_name = "HOST:PORT",
        default_value = "127.0.0.1:8449",
        help = "Address and port to listen on"
    )]
    pub listen: String,

    #[arg(
        long,
        help = "Allow external connections (binds to 0.0.0.0 instead of 127.0.0.1)"
    )]
    pub allow_external: bool,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Subcommand)]
pub enum Commands {
    Systemd {
        #[command(subcommand)]
        action: SystemdAction,
    },
}

#[derive(Subcommand)]
pub enum SystemdAction {
    Install {
        #[arg(long, help = "Enable the service after installation")]
        enable: bool,

        #[arg(long, help = "Start the service immediately (requires --enable)")]
        now: bool,
    },
}

impl Cli {
    pub fn get_listen_address(&self) -> String {
        if self.allow_external {
            if let Some(port) = self.listen.split(':').nth(1) {
                format!("0.0.0.0:{}", port)
            } else {
                "0.0.0.0:8449".to_string()
            }
        } else {
            self.listen.clone()
        }
    }

    pub fn is_external(&self) -> bool {
        self.allow_external || self.listen.starts_with("0.0.0.0:")
    }
}

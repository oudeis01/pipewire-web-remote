use crate::models::device::{AudioDevice, Channel, DeviceState, DeviceType};
use crate::models::graph::{Link, Port, PortDirection};
use crossbeam_channel::{Receiver, Sender};
use pipewire as pw;
use pipewire::context::Context;
use pipewire::main_loop::MainLoop;
use pipewire::types::ObjectType;
use std::process::Command;
use std::thread;

pub enum PwCommand {
    SetVolume(u32, f32, Option<u64>),
    SetMute(u32, bool),
    CreateLink(u32, u32, u32, u32), // out_node, out_port, in_node, in_port
    DeleteLink(u32),                // link_id
}

pub enum PwEvent {
    DeviceAdded(AudioDevice),
    DeviceRemoved(u32),
    VolumeChanged(u32, f32, Option<u64>),
    PortAdded(Port),
    PortRemoved(u32),
    LinkAdded(Link),
    LinkRemoved(u32),
}

pub struct PipeWireHandler {
    sender: Sender<PwCommand>,
}

impl PipeWireHandler {
    pub fn new(event_sender: Sender<PwEvent>) -> anyhow::Result<Self> {
        let (cmd_sender, cmd_receiver) = crossbeam_channel::unbounded();

        thread::spawn(move || {
            if let Err(e) = run_pipewire_loop(cmd_receiver, event_sender) {
                eprintln!("PipeWire loop error: {}", e);
            }
        });

        Ok(Self { sender: cmd_sender })
    }

    pub fn set_volume(&self, id: u32, vol: f32, timestamp: Option<u64>) {
        let _ = self.sender.send(PwCommand::SetVolume(id, vol, timestamp));
    }

    pub fn set_mute(&self, id: u32, muted: bool) {
        let _ = self.sender.send(PwCommand::SetMute(id, muted));
    }

    pub fn create_link(&self, out_node: u32, out_port: u32, in_node: u32, in_port: u32) {
        let _ = self
            .sender
            .send(PwCommand::CreateLink(out_node, out_port, in_node, in_port));
    }

    pub fn delete_link(&self, link_id: u32) {
        let _ = self.sender.send(PwCommand::DeleteLink(link_id));
    }
}

fn get_real_volume(id: u32) -> (f32, bool) {
    if let Ok(output) = Command::new("wpctl")
        .arg("get-volume")
        .arg(id.to_string())
        .output()
    {
        if output.status.success() {
            let s = String::from_utf8_lossy(&output.stdout);
            let volume = s
                .split_whitespace()
                .nth(1)
                .and_then(|v| v.parse::<f32>().ok())
                .unwrap_or(1.0);

            let muted = s.contains("[MUTED]");
            return (volume, muted);
        }
    }
    (1.0, false)
}

fn run_pipewire_loop(
    cmd_receiver: Receiver<PwCommand>,
    event_sender: Sender<PwEvent>,
) -> anyhow::Result<()> {
    pw::init();
    let mainloop = MainLoop::new(None)?;
    let context = Context::new(&mainloop)?;
    let core = context.connect(None)?;
    let registry = core.get_registry()?;

    let sender_global = event_sender.clone();
    let sender_remove = event_sender.clone();
    let sender_cmd = event_sender.clone();

    let _listener = registry
        .add_listener_local()
        .global(move |global| {
            if let Some(props) = global.props {
                match global.type_ {
                    ObjectType::Node => {
                        let media_class = props.get("media.class");
                        let (_device_type, _is_device) = match media_class {
                            Some("Audio/Sink") => (DeviceType::Sink, true),
                            Some("Audio/Source") => (DeviceType::Source, true),
                            Some(s) if s.starts_with("Stream/") => (DeviceType::Sink, false),
                            _ => (DeviceType::Sink, false),
                        };

                        let name = props.get("node.name").unwrap_or("Unknown").to_string();
                        let description =
                            props.get("node.description").unwrap_or(&name).to_string();
                        let id = global.id;

                        let (vol, muted) = get_real_volume(id);

                        let channels = vec![Channel {
                            index: 0,
                            name: "Master".to_string(),
                            volume: vol,
                        }];

                        let device = AudioDevice {
                            id,
                            name,
                            description,
                            device_type: DeviceType::Sink,
                            state: DeviceState::Idle,
                            channels,
                            muted,
                            base_volume: vol,
                        };

                        let _ = sender_global.send(PwEvent::DeviceAdded(device));
                    }
                    ObjectType::Port => {
                        let node_id = props
                            .get("node.id")
                            .and_then(|s| s.parse::<u32>().ok())
                            .unwrap_or(0);

                        let direction = match props.get("port.direction") {
                            Some("in") => PortDirection::Input,
                            Some("out") => PortDirection::Output,
                            _ => return,
                        };

                        let port = Port {
                            id: global.id,
                            node_id,
                            name: props.get("port.name").unwrap_or("").to_string(),
                            direction,
                        };
                        let _ = sender_global.send(PwEvent::PortAdded(port));
                    }
                    ObjectType::Link => {
                        let output_node = props
                            .get("link.output.node")
                            .and_then(|s| s.parse::<u32>().ok())
                            .unwrap_or(0);
                        let output_port = props
                            .get("link.output.port")
                            .and_then(|s| s.parse::<u32>().ok())
                            .unwrap_or(0);
                        let input_node = props
                            .get("link.input.node")
                            .and_then(|s| s.parse::<u32>().ok())
                            .unwrap_or(0);
                        let input_port = props
                            .get("link.input.port")
                            .and_then(|s| s.parse::<u32>().ok())
                            .unwrap_or(0);

                        let link = Link {
                            id: global.id,
                            output_node,
                            output_port,
                            input_node,
                            input_port,
                        };
                        let _ = sender_global.send(PwEvent::LinkAdded(link));
                    }
                    _ => {}
                }
            }
        })
        .global_remove(move |id| {
            let _ = sender_remove.send(PwEvent::DeviceRemoved(id));
            let _ = sender_remove.send(PwEvent::PortRemoved(id));
            let _ = sender_remove.send(PwEvent::LinkRemoved(id));
        })
        .register();

    let loop_ = mainloop.loop_();
    let timer = loop_.add_timer(move |_| {
        while let Ok(cmd) = cmd_receiver.try_recv() {
            match cmd {
                PwCommand::SetVolume(id, vol, timestamp) => {
                    let vol_pct = format!("{}%", (vol * 100.0) as u32);
                    println!("EXEC: wpctl set-volume {} {}", id, vol_pct);
                    if let Ok(out) = Command::new("wpctl")
                        .arg("set-volume")
                        .arg(id.to_string())
                        .arg(vol_pct)
                        .output()
                    {
                        if !out.status.success() {
                            eprintln!("wpctl error: {}", String::from_utf8_lossy(&out.stderr));
                        } else {
                            // Signal volume change back to main loop for broadcasting
                            let _ = sender_cmd.send(PwEvent::VolumeChanged(id, vol, timestamp));
                        }
                    }
                }
                PwCommand::SetMute(id, muted) => {
                    let arg = if muted { "1" } else { "0" };
                    println!("EXEC: wpctl set-mute {} {}", id, arg);
                    let _ = Command::new("wpctl")
                        .arg("set-mute")
                        .arg(id.to_string())
                        .arg(arg)
                        .spawn();
                }
                PwCommand::CreateLink(_out_node, out_port, _in_node, in_port) => {
                    println!("EXEC: pw-link {} {}", out_port, in_port);
                    let _ = Command::new("pw-link")
                        .arg(out_port.to_string())
                        .arg(in_port.to_string())
                        .spawn();
                }
                PwCommand::DeleteLink(link_id) => {
                    println!("EXEC: pw-link -d {}", link_id);
                    if let Ok(out) = Command::new("pw-link")
                        .arg("-d")
                        .arg(link_id.to_string())
                        .output()
                    {
                        if !out.status.success() {
                            eprintln!("pw-link error: {}", String::from_utf8_lossy(&out.stderr));
                        }
                    }
                }
            }
        }
    });

    timer.update_timer(
        Some(std::time::Duration::from_millis(1)),
        Some(std::time::Duration::from_millis(50)),
    );

    mainloop.run();
    Ok(())
}

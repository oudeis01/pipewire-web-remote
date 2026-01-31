use crate::models::device::{AudioDevice, Channel, DeviceState, DeviceType};
use crate::models::graph::{Link, Port, PortDirection};
use crossbeam_channel::{Receiver, Sender};
use pipewire as pw;
use pipewire::context::Context;
use pipewire::main_loop::MainLoop;
use pipewire::types::ObjectType;
use std::thread;

pub enum PwCommand {
    SetVolume(u32, f32),
    SetMute(u32, bool),
}

pub enum PwEvent {
    DeviceAdded(AudioDevice),
    DeviceRemoved(u32),
    VolumeChanged(u32, f32),
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
}

fn run_pipewire_loop(
    _cmd_receiver: Receiver<PwCommand>,
    event_sender: Sender<PwEvent>,
) -> anyhow::Result<()> {
    pw::init();
    let mainloop = MainLoop::new(None)?;
    let context = Context::new(&mainloop)?;
    let core = context.connect(None)?;
    let registry = core.get_registry()?;

    let _listener = registry
        .add_listener_local()
        .global(move |global| {
            if let Some(props) = global.props {
                match global.type_ {
                    ObjectType::Node => {
                        let media_class = props.get("media.class");
                        let device_type = match media_class {
                            Some("Audio/Sink") => DeviceType::Sink,
                            Some("Audio/Source") => DeviceType::Source,
                            _ => return,
                        };

                        let name = props.get("node.name").unwrap_or("Unknown").to_string();
                        let description = props
                            .get("node.description")
                            .unwrap_or("Unknown")
                            .to_string();
                        let id = global.id;

                        // Mocking channels for now
                        let channels = vec![Channel {
                            index: 0,
                            name: "Master".to_string(),
                            volume: 1.0,
                        }];

                        let device = AudioDevice {
                            id,
                            name,
                            description,
                            device_type,
                            state: DeviceState::Idle, // Default
                            channels,
                            muted: false,
                            base_volume: 1.0,
                        };

                        let _ = event_sender.send(PwEvent::DeviceAdded(device));
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
                        let _ = event_sender.send(PwEvent::PortAdded(port));
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
                        let _ = event_sender.send(PwEvent::LinkAdded(link));
                    }
                    _ => {}
                }
            }
        })
        .register();

    mainloop.run();
    Ok(())
}

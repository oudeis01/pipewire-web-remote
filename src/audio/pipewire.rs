use crate::models::device::{AudioDevice, Channel, DeviceState, DeviceType};
use crossbeam_channel::{Receiver, Sender};
use pipewire as pw;
use pipewire::prelude::*;
use std::thread;

pub enum PwCommand {
    SetVolume(u32, f32),
    SetMute(u32, bool),
}

pub enum PwEvent {
    DeviceAdded(AudioDevice),
    DeviceRemoved(u32),
    VolumeChanged(u32, f32),
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
    let mainloop = pw::MainLoop::new()?;
    let context = pw::Context::new(&mainloop)?;
    let core = context.connect(None)?;
    let registry = core.get_registry()?;

    let _listener = registry
        .add_listener_local()
        .global(move |global| {
            if global.type_ != pw::types::ObjectType::Node {
                return;
            }

            if let Some(props) = global.props {
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

                // Mocking channels for now as we need to bind to the node to get real volume/channels
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
        })
        .register();

    mainloop.run();
    Ok(())
}

use crate::models::device::{AudioDevice, Channel, DeviceState, DeviceType};
use anyhow::Result;
use std::collections::HashMap;

pub struct AudioController {
    devices: HashMap<u32, AudioDevice>,
}

impl AudioController {
    pub fn new() -> Result<Self> {
        let mut devices = HashMap::new();

        // Mock Data for Phase 1 verification
        devices.insert(
            1,
            AudioDevice {
                id: 1,
                name: "alsa_output.pci-0000_00_1f.3.analog-stereo".to_string(),
                description: "Built-in Audio Analog Stereo".to_string(),
                device_type: DeviceType::Sink,
                state: DeviceState::Running,
                channels: vec![
                    Channel {
                        index: 0,
                        name: "FL".to_string(),
                        volume: 0.75,
                    },
                    Channel {
                        index: 1,
                        name: "FR".to_string(),
                        volume: 0.75,
                    },
                ],
                muted: false,
                base_volume: 1.0,
            },
        );

        Ok(Self { devices })
    }

    pub fn list_devices(&self) -> Vec<AudioDevice> {
        self.devices.values().cloned().collect()
    }

    pub fn get_device(&self, id: u32) -> Option<&AudioDevice> {
        self.devices.get(&id)
    }
}

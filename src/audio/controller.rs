use crate::models::device::AudioDevice;
use anyhow::Result;
use std::collections::HashMap;

pub struct AudioController {
    devices: HashMap<u32, AudioDevice>,
}

impl AudioController {
    pub fn new() -> Result<Self> {
        Ok(Self {
            devices: HashMap::new(),
        })
    }

    pub fn add_device(&mut self, device: AudioDevice) {
        self.devices.insert(device.id, device);
    }

    pub fn remove_device(&mut self, id: u32) {
        self.devices.remove(&id);
    }

    pub fn list_devices(&self) -> Vec<AudioDevice> {
        self.devices.values().cloned().collect()
    }

    pub fn get_device(&self, id: u32) -> Option<&AudioDevice> {
        self.devices.get(&id)
    }
}

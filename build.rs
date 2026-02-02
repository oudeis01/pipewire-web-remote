fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    println!("cargo:warning=");
    println!("cargo:warning=━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("cargo:warning=PipeWire Web Remote - Build Complete!");
    println!("cargo:warning=");
    println!("cargo:warning=To install systemd user service:");
    println!("cargo:warning=  pipewire-web-remote systemd install --enable --now");
    println!("cargo:warning=");
    println!("cargo:warning=To run the server:");
    println!("cargo:warning=  pipewire-web-remote");
    println!("cargo:warning=");
    println!("cargo:warning=For all options:");
    println!("cargo:warning=  pipewire-web-remote --help");
    println!("cargo:warning=━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("cargo:warning=");
}

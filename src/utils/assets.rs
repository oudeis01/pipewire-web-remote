use rust_embed::RustEmbed;
use axum::{
    body::Body,
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};

#[derive(RustEmbed)]
#[folder = "web/"]
pub struct Assets;

pub async fn static_handler(path: axum::extract::Path<String>) -> impl IntoResponse {
    let path = path.0.trim_start_matches('/');
    if path.is_empty() || path == "index.html" {
        return get_asset("index.html");
    }
    get_asset(path)
}

pub async fn index_handler() -> impl IntoResponse {
    get_asset("index.html")
}

fn get_asset(path: &str) -> Response {
    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            Response::builder()
                .header(header::CONTENT_TYPE, HeaderValue::from_str(mime.as_ref()).unwrap())
                .body(Body::from(content.data))
                .unwrap()
        }
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

//! Helper functions for making requests to AmeoTrack using multipart/form data

use std::io::Read;

use hyper::Client;
use hyper::header::{Headers, ContentType};
use hyper::net::HttpsConnector;
use hyper_native_tls::NativeTlsClient;
use serde_json;

use super::debug;
use secret::{FEEDBACK_URL, FEEDBACK_PASSWORD};

#[derive(Deserialize)]
#[allow(dead_code)]
struct FeedbackResponse {
    id: String,
    message: String,
}

#[derive(Serialize)]
#[allow(non_snake_case)]
struct Feedback<'a> {
    pub appName: &'a str,
    pub email: &'a str,
    pub message: &'a str,
    pub password: &'a str,
}

/// Creates and sends a HTTPS request to AmeoTrack with the content of the feedback.  Once recieved there, it will trigger
/// an email to be sent to me with the contents of the feedback message.  The response is attempted to be parsed into
/// the expected format and the result passed back as `{success: bool}`.
pub fn deliver_feedback(email: &str, message: &str) -> Result<(), String> {
    let ssl = NativeTlsClient::new().unwrap();
    let connector = HttpsConnector::new(ssl);
    let client = Client::with_connector(connector);

    // create a request, add the body, set the content-type headers, and forward it on to AmeoTrack
    let feedback = Feedback {
        appName: "PoloTrack",
        email: email,
        message: message,
        password: FEEDBACK_PASSWORD,
    };
    let mut headers = Headers::new();
    headers.set(ContentType::json());
    let body = serde_json::to_string(&feedback).unwrap();
    let mut res = client.post(FEEDBACK_URL)
        .headers(headers)
        .body(&body)
        .send()
        .map_err(debug)?;

    // attempt to parse the response into a `FeedbackResponse`; if failed it means feedback submission failed
    let mut buf = String::new();
    res.read_to_string(&mut buf).map_err(debug)?;
    match serde_json::from_str::<FeedbackResponse>(&buf) {
        Ok(_) => Ok(()),
        Err(_) => Err(format!("Got unexpected response from feedback API: {}", buf)),
    }
}

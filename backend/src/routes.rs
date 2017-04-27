//! Sets up the API endpoints that are exposed via the Rocket webserver to the clients.

use std::io::Read;

use chrono::NaiveDateTime;
use rayon::prelude::*;
use rocket::{Data, Request, State};
use rocket::http::Method;
use rocket::data::{self, FromData};
use rocket::http::Status;
use rocket::Outcome::*;
use rocket_contrib::JSON;
use serde_json;

use super::{debug, DbPool, RateCache, MYSQL_DATE_FORMAT};
use db_query::get_rate;
use cors::*;

#[derive(Serialize)]
pub struct RateResponse {
    pub pair: String,
    pub rate: Option<f32>,
    pub no_data: bool,
    pub cached: bool,
    pub date: NaiveDateTime,
}

#[derive(Deserialize)]
pub struct RateRequest {
    pub date: NaiveDateTime,
    pub pair: String,
}

#[derive(Deserialize)]
pub struct RawRateRequest {
    pub date: String,
    pub pair: String,
}

impl RawRateRequest {
    pub fn to_rate_request(self) -> Result<RateRequest, String> {
        Ok(RateRequest {
            date: NaiveDateTime::parse_from_str(&self.date, MYSQL_DATE_FORMAT)
                .map_err(|err| format!("Error parsing `NaiveDateTime` from String: {:?}", err))?,
            pair: self.pair,
        })
    }
}

pub struct BatchRateRequest(Vec<RateRequest>);

impl FromData for BatchRateRequest {
    type Error = String;

    fn from_data(_: &Request, data: Data) -> data::Outcome<Self, String> {
        // Read the data into a String.
        let mut s = String::new();
        if let Err(err) = data.open().read_to_string(&mut s) {
            println!("Error reading data into String: {:?}", err);
            return Failure((Status::InternalServerError, format!("Error reading data into String: {:?}", err)));
        }

        match serde_json::from_str::<Vec<RawRateRequest>>(&s) {
            Ok(raw_requests) => {
                let mut mapped = Vec::with_capacity(raw_requests.len());
                for raw_req in raw_requests {
                    let req = match raw_req.to_rate_request() {
                        Ok(r) => r,
                        Err(err) => {
                            return Failure((Status::InternalServerError, err));
                        }
                    };
                    mapped.push(req);
                }
                Success(BatchRateRequest(mapped))
            },
            Err(err) => {
                println!("Error parsing data out of JSON: {:?}", err);
                Failure((Status::InternalServerError, format!("Error parsing data out of JSON: {:?}", err)))
            },
        }
    }
}

/// Implement CORS for `OPTION` queries on the historical rate API
#[route(OPTIONS, "/rate/<pair>/<timestamp_string>")]
#[allow(unused_variables)]
fn hist_rate_cors_preflight(pair: &str, timestamp_string: &str) -> PreflightCORS {
    CORS::preflight("*")
        .methods(vec![Method::Options, Method::Post])
        .headers(vec!["Content-Type"])
}

/// Implement CORS for `OPTION` queries on the historical batch rate API
#[route(OPTIONS, "/batch_rate")]
#[allow(unused_variables)]
fn hist_batch_rate_cors_preflight() -> PreflightCORS {
    CORS::preflight("*")
        .methods(vec![Method::Options, Method::Post])
        .headers(vec!["Content-Type"])
}

/// Fetches the value for a historical exchange rate.  First attempts to read it from the cache.  If not in the cache,
/// makes a query to the database and inserts the response into the cache.
fn retrieve_hist_rate(db_pool: &DbPool, rate_cache: &RateCache, pair: String, timestamp: NaiveDateTime) -> RateResponse {
    // attempt to fetch the value from the rate cache and, if it is found, return it without making any DB queries
    match rate_cache.get(pair.clone(), timestamp) {
        Some(rate) => {
            return RateResponse {
                pair: pair.clone(),
                rate: rate,
                no_data: rate.is_none(),
                cached: true,
                date: timestamp,
            };
        },
        None => (),
    }

    // perform the database query for the historical rate and return the result
    let db_conn = &*db_pool.get_conn();
    let query_result = get_rate(&pair, timestamp, db_conn);

    // since we didn't find the value in the cache, insert the current one if it was recorded over an hour.
    if query_result.is_ok() {
        let res_inner = *query_result.as_ref().unwrap();

        // only cache results older than the last 60 minutes
        if res_inner.is_none() || res_inner.as_ref().unwrap().1 > 60 {
            rate_cache.set(pair.clone(), res_inner, timestamp);
        }
    }

    if query_result.is_err() {
        println!("{:?}", query_result);
    }
    match query_result {
        Ok(Some(qr)) => RateResponse{
            pair: pair,
            rate: Some(qr.0),
            no_data: false,
            cached: false,
            date: timestamp,
        },
        Ok(None) | Err(_) => RateResponse{
            pair: pair,
            rate: None,
            no_data: true,
            cached: false,
            date: timestamp,
        },
    }
}

/// Exposes the historical rate API.  Attempts to find the nearest exchange rate for the given currency pair and timestamp
/// within one day on either side.
#[get("/rate/<pair>/<timestamp_string>")]
pub fn get_hist_rate(
    db_pool: State<DbPool>, rate_cache_state: State<RateCache>, pair: String, timestamp_string: String
) -> CORS<Result<JSON<RateResponse>, String>> {
    let rate_cache = rate_cache_state.inner();

    let timestamp_res = NaiveDateTime::parse_from_str(&timestamp_string, MYSQL_DATE_FORMAT)
        .map_err(debug);
    let timestamp = match timestamp_res {
        Ok(timestamp) => timestamp,
        Err(err) => {
            return CORS::any(Err(err));
        },
    };

    let hist_rate = retrieve_hist_rate(&db_pool, rate_cache, pair, timestamp);
    CORS::any(Ok(JSON(hist_rate)))
}

/// Exposes the historical rate API with batch retrieval capabilities.  Allows for multiple pair/date
/// rates to be queried at once in a single request.
#[post("/batch_rate", format = "application/json", data="<requests>")]
pub fn get_batch_hist_rates(
    db_pool: State<DbPool>, rate_cache_state: State<RateCache>, requests: BatchRateRequest
) -> CORS<JSON<Vec<RateResponse>>> {
    let rate_cache = rate_cache_state.inner();

    // process each of the rate requests one by one
    let results: Vec<RateResponse> = requests.0
        .par_iter()
        .map(|req| {
            retrieve_hist_rate(&db_pool, rate_cache, req.pair.clone(), req.date)
        })
        .collect();

    CORS::any(JSON(results))
}

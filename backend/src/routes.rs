//! Sets up the API endpoints that are exposed via the Rocket webserver to the clients.

use chrono::NaiveDateTime;
use rocket::State;
use rocket::http::Method;
use rocket_contrib::JSON;

use super::{debug, DbPool, RateCache, MYSQL_DATE_FORMAT};
use db_query::get_rate;
use cors::*;

#[derive(Serialize)]
pub struct RateResponse {
    rate: Option<f32>,
    no_data: bool,
    cached: bool,
}

/// Implement CORS for `OPTION` queries on the historical rate API
#[route(OPTIONS, "/rate/<pair>/<timestamp_string>")]
fn hist_rate_cors_preflight(pair: &str, timestamp_string: &str) -> PreflightCORS {
    CORS::preflight("http://host.tld")
        .methods(vec![Method::Options, Method::Post])
        .headers(vec!["Content-Type"])
}

/// Exposes the historical rate API.  Attempts to find the nearest exchange rate for the given currency pair and timestamp
/// within one day on either side.
#[get("/rate/<pair>/<timestamp_string>")]
pub fn get_hist_rate(
    db_pool: State<DbPool>, rate_cache_state: State<RateCache>, pair: String, timestamp_string: String
) -> CORS<Result<JSON<RateResponse>, String>> {
    let db_conn = &*db_pool.get_conn();
    let rate_cache = rate_cache_state.inner();

    let timestamp_res = NaiveDateTime::parse_from_str(&timestamp_string, MYSQL_DATE_FORMAT)
        .map_err(debug);
    let timestamp = match timestamp_res {
        Ok(timestamp) => timestamp,
        Err(err) => {
            return CORS::any(Err(err));
        },
    };

    // attempt to fetch the value from the rate cache and, if it is found, return it without making any DB queries
    match rate_cache.get(pair.clone(), timestamp) {
        Some(rate) => {
            return CORS::any(Ok(JSON(RateResponse{
                rate: rate,
                no_data: rate.is_none(),
                cached: true,
            })))
        },
        None => (),
    }

    // perform the database query for the historical rate and return the result
    let rate = get_rate(&pair, timestamp, db_conn);

    // since we didn't find the value in the cache, insert the current one.
    if rate.is_ok() {
        rate_cache.set(pair, *rate.as_ref().unwrap(), timestamp);
    }

    CORS::any(match rate {
        Ok(Some(rate)) => Ok(JSON(RateResponse{
            rate: Some(rate),
            no_data: false,
            cached: false,
        })),
        Ok(None) => Ok(JSON(RateResponse{
            rate: None,
            no_data: true,
            cached: false,
        })),
        Err(err) => Err(err),
    })
}

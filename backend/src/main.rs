//! Poloniex API backend.  See README.md for more information.

#![feature(plugin, custom_derive, decl_macro)]
#![plugin(rocket_codegen)]

extern crate chrono;
extern crate diesel;
#[macro_use]
extern crate diesel_codegen;
extern crate hyper;
extern crate hyper_native_tls;
extern crate r2d2;
extern crate r2d2_diesel_mysql;
extern crate rayon;
extern crate rocket;
// #[macro_use]
extern crate rocket_contrib;
extern crate serde_json;
#[macro_use]
extern crate serde_derive;

use std::fmt::Debug;
use std::collections::HashMap;
use std::collections::hash_map::Entry;
use std::sync::{Arc, Mutex};

use chrono::NaiveDateTime;
use diesel::mysql::MysqlConnection;
use r2d2::{ Pool, PooledConnection };
use r2d2_diesel_mysql::ConnectionManager;

mod cors;
use cors::CORS;
// mod schema;
mod routes;
mod secret;
mod db_query;
use db_query::HistRateQueryResult;
mod feedback;

pub const MYSQL_DATE_FORMAT: &'static str = "%Y-%m-%d %H:%M:%S";

/// Given a type that can be debug-formatted, returns a String that contains its debug-formatted version.
pub fn debug<T>(x: T) -> String where T:Debug {
    format!("{:?}", x)
}

pub struct DbPool(Pool<ConnectionManager<MysqlConnection>>);

impl DbPool {
    pub fn get_conn(&self) -> PooledConnection<ConnectionManager<MysqlConnection>> {
        self.0.get().unwrap()
    }
}

/// A structure to cache rates pulled from the database.  Since historical exchange rates don't change,
/// we can safely cache the rates here to avoid extra database load.
pub struct RateCache(Arc<Mutex<HashMap<(String, NaiveDateTime), Option<f32>>>>);

impl RateCache {
    fn new() -> RateCache {
        RateCache(Arc::new(Mutex::new(HashMap::new())))
    }

    /// Inserts an exchange rate into the cache
    fn set(&self, pair: String, rate: Option<HistRateQueryResult>, timestamp: NaiveDateTime) {
        self.0.lock().unwrap().insert((pair, timestamp), rate.map(|qr| qr.0));
    }

    /// Attempts to retrieve a cached value from the inner `HashMap`
    fn get(&self, pair: String, timestamp: NaiveDateTime) -> Option<Option<f32>> {
        match self.0.lock().unwrap().entry((pair, timestamp)) {
            Entry::Occupied(val) => Some(val.get().clone()),
            _ => None,
        }
    }
}

fn main() {
    // initialize Rayon threadpool with custom configuration with 24 "threads" which actually translates to MySQL Connections
    rayon::initialize(rayon::Configuration::new().num_threads(24)).expect("Unable to initialize Rayon threadpool!");

    // initialize the Rocket webserver
    rocket::ignite()
        .mount("/", routes![
            routes::rate_options_handler,
            routes::batch_rate_options_handler,
            routes::feedback_options_handler,
            routes::get_hist_rate,
            routes::get_batch_hist_rates,
            routes::submit_feedback,
        ])
        .manage(DbPool(db_query::create_db_pool()))
        .manage(RateCache::new())
        .attach(CORS())
        .launch();
}

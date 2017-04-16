//! Poloniex API backend.  See README.md for more information.

#![feature(plugin)]
#![plugin(rocket_codegen)]

extern crate chrono;
#[macro_use]
extern crate diesel_codegen;
#[macro_use]
extern crate diesel;
extern crate hyper;
extern crate hyper_native_tls;
extern crate r2d2;
extern crate r2d2_diesel_mysql;
extern crate rocket;
// #[macro_use]
extern crate rocket_contrib;
extern crate serde_json;
#[macro_use]
extern crate serde_derive;

use diesel::mysql::MysqlConnection;
use r2d2::{ Pool, PooledConnection };
use r2d2_diesel_mysql::ConnectionManager;

mod schema;
mod secret;
mod db_query;

pub struct DbPool(Pool<ConnectionManager<MysqlConnection>>);

impl DbPool {
    pub fn get_conn(&self) -> PooledConnection<ConnectionManager<MysqlConnection>> {
        return self.0.get().unwrap()
    }
}

fn main() {
    // TODO
}

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

mod schema;

fn main() {
    // TODO
}

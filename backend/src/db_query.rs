//! Functions for interfacing with the database using Diesel

use chrono::NaiveDateTime;
use diesel::expression::sql_literal;
use diesel::prelude::*;
use diesel::mysql::MysqlConnection;
use r2d2::{ Config, Pool };
use r2d2_diesel_mysql::ConnectionManager;

// use schema;
use secret::DB_URL;
use super::{debug, MYSQL_DATE_FORMAT};

/// Helper type holding the rate and difference from the current timestamp of a historical rate query
#[derive(Copy, Clone, Queryable, PartialEq, Debug)]
pub struct HistRateQueryResult(pub f32, pub i32);

/// All valid currencies that are accepted by the API and may, at one point, have been in someone's Poloniex account.
const CURRENCIES: &[&'static str] = &[
    "1CR","ABY","AC","ACH","ADN","AEON","AERO","AIR","AMP","APH","ARCH","ARDR","AUR",
    "AXIS","BALLS","BANK","BBL","BBR","BCC","BCN","BCY","BDC","BDG","BELA","BITCNY","BITS","BITUSD","BLK","BLOCK","BLU",
    "BNS","BONES","BOST","BTC", "BTCD","BTCS","BTM","BTS","BURN","BURST","C2","CACH","CAI","CC","CCN","CGA","CHA","CINNI",
    "CLAM","CNL","CNMT","CNOTE","COMM","CON","CORG","CRYPT","CURE","CYC","DAO","DASH","DCR","DGB","DICE","DIEM","DIME",
    "DIS","DNS","DOGE","DRKC","DRM","DSH","DVK","EAC","EBT","ECC","EFL","EMC2","EMO","ENC","ETC","ETH","eTOK","EXE","EXP",
    "FAC","FCN","FCT","FIBRE","FLAP","FLDC","FLO","FLT","FOX","FRAC","FRK","FRQ","FVZ","FZ","FZN","GAME","GAP","GDN",
    "GEMZ","GEO","GIAR","GLB","GML","GNO","GNS","GNT","GOLD","GPC","GPUC","GRC","GRCX","GRS","GUE","H2O","HIRO","HOT","HUC",
    "HUGE","HVC","HYP","HZ","IFC","INDEX","IOC","ITC","IXC","JLH","JPC","JUG","KDC","KEY","LBC","LC","LCL","LEAF","LGC",
    "LOL","LOVE","LQD","LSK","LTBC","LTC","LTCX","MAID","MAST","MAX","MCN","MEC","METH","MIL","MIN","MINT","MMC","MMNXT",
    "MMXIV","MNTA","MON","MRC","MRS","MTS","MUN","MYR","MZC","N5X","NAS","NAUT","NAV","NBT","NEOS","NL","NMC","NOBL",
    "NOTE","NOXT","NRS","NSR","NTX","NXC","NXT","NXTI","OMNI","OPAL","PAND","PASC","PAWN","PIGGY","PINK","PLX","PMC",
    "POT","PPC","PRC","PRT","PTS","Q2C","QBK","QCN","QORA","QTL","RADS","RBY","RDD","REP","RIC","RZR","SBD","SC","SDC",
    "SHIBE","SHOPX","SILK","SJCX","SLR","SMC","SOC","SPA","SQL","SRCC","SRG","SSD","STEEM","STR","STRAT","SUM","SUN",
    "SWARM","SXC","SYNC","SYS","TAC","TOR","TRUST","TWE","UIS","ULTC","UNITY","URO","USDE","USDT","UTC","UTIL","UVC",
    "VIA","VOOT","VOX","VRC","VTC","WC","WDC","WIKI","WOLF","X13","XAI","XAP","XBC","XC","XCH","XCN","XCP","XCR","XDN",
    "XDP","XEM","XHC","XLB","XMG","XMR","XPB","XPM","XRP","XSI","XST","XSV","XUSD","XVC","XXC","YACC","YANG","YC","YIN",
    "ZEC", "USD", "EUR", "JPY", "GBP", "CAD", "NZD", "NOK"
];

const BASE_CURRENCIES: &[&'static str] = &["USD", "EUR", "JPY", "GBP", "CAD", "NZD", "NOK"];

pub fn create_db_pool() -> Pool<ConnectionManager<MysqlConnection>> {
    let config = Config::default();
    let manager = ConnectionManager::<MysqlConnection>::new(DB_URL);
    Pool::new(config, manager).expect("Failed to create pool.")
}

/// Given a pair and a timestamp, returns the exchange rate for that pair to BTC as close as possible to the provided timestamp.
/// Expects a pair in the format "BTC/ETH".
pub fn get_rate(pair: &str, timestamp: NaiveDateTime, conn: &MysqlConnection) -> Result<Option<HistRateQueryResult>, String> {
    let mut split = pair.split('/').collect::<Vec<&str>>();
    if split.len() < 2 {
        return Err(format!("Invalid currency pair supplied: {}!", pair))
    }

    if split[0] == "BTC" && split[1] == "BTC" {
        Ok(Some(HistRateQueryResult(1f32, 1000000)))
    } else if CURRENCIES.contains(&split[0]) && CURRENCIES.contains(&split[1]) {
        if split[0] == "USDT" || split[1] == "USDT" {
            split[0] = "BTC";
            split[1] = "USDT";
        }
        // base currencies have min precision of 1 obs every 24 hours; much more precise for Poloniex trade data
        let search_radius = if BASE_CURRENCIES.contains(&split[1]) { 13 } else { 4 };
        // have to construct raw SQL here since Diesel doesn't deal well with dynamic queries and writing macros is horrible
        let formatted_timestamp = timestamp.format(MYSQL_DATE_FORMAT);
        // create a query to find the trade nearest to the supplied timestamp within one day on either side.  Will return no rows if there
        // were no trades in the requested pair on one day on either side of the supplied timestamp.
        let query = format!(
            "SELECT `rate`, TIMESTAMPDIFF(MINUTE, '{}', CURRENT_TIMESTAMP)
            FROM `trades_{}_{}`
            WHERE `trade_time` BETWEEN DATE_SUB('{}', INTERVAL {} HOUR)
              AND DATE_ADD('{}', INTERVAL {} HOUR)
            ORDER BY abs(TIMESTAMPDIFF(SECOND, '{}', `trade_time`))
            LIMIT 1",
            formatted_timestamp, split[0], split[1], formatted_timestamp,
            search_radius, formatted_timestamp, search_radius, formatted_timestamp
        );
        let select_statement = sql_literal::sql(&query);
        let res: Vec<HistRateQueryResult> = select_statement
            .load::<HistRateQueryResult>(conn)
            .map_err(debug)?;
        if res.len() > 0 {
            Ok(Some(res[0]))
        } else {
            Ok(None)
        }
    } else {
        println!("Requested currency pair {} but we don't have data for that.", pair);
        Err(String::from("Invalid currency pair supplied."))
    }
}

#[test]
fn test_hist_rate_retrieval() {
    use super::DbPool;

    let pool = DbPool(create_db_pool());
    assert_eq!(
        get_rate("BTC/DOGE", NaiveDateTime::parse_from_str("2014-01-25 05:44:38", MYSQL_DATE_FORMAT).unwrap(), &*pool.get_conn()).unwrap().unwrap().0,
        0.0000015
    );
}

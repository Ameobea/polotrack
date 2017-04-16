//! Functions for interfacing with the database using Diesel

use std::fmt::Debug;

use chrono::NaiveDateTime;
use diesel::expression::sql_literal;
use diesel::prelude::*;
use diesel::mysql::MysqlConnection;
use r2d2::{ Config, Pool, PooledConnection };
use r2d2_diesel_mysql::ConnectionManager;

use schema;
use secret::DB_CREDENTIALS;
use super::DbPool;

pub const MYSQL_DATE_FORMAT: &'static str = "%Y-%m-%d %H:%M:%S";

/// All valid currencies that are accepted by the API and may, at one point, have been in someone's Poloniex account.
const CURRENCIES: &[&'static str] = &[
    "1CR","ABY","AC","ACH","ADN","AEON","AERO","AIR","AMP","APH","ARCH","ARDR","AUR",
    "AXIS","BALLS","BANK","BBL","BBR","BCC","BCN","BCY","BDC","BDG","BELA","BITCNY","BITS","BITUSD","BLK","BLOCK","BLU",
    "BNS","BONES","BOST","BTC","BTCD","BTCS","BTM","BTS","BURN","BURST","C2","CACH","CAI","CC","CCN","CGA","CHA","CINNI",
    "CLAM","CNL","CNMT","CNOTE","COMM","CON","CORG","CRYPT","CURE","CYC","DAO","DASH","DCR","DGB","DICE","DIEM","DIME",
    "DIS","DNS","DOGE","DRKC","DRM","DSH","DVK","EAC","EBT","ECC","EFL","EMC2","EMO","ENC","ETC","ETH","eTOK","EXE","EXP",
    "FAC","FCN","FCT","FIBRE","FLAP","FLDC","FLO","FLT","FOX","FRAC","FRK","FRQ","FVZ","FZ","FZN","GAME","GAP","GDN",
    "GEMZ","GEO","GIAR","GLB","GML","GNS","GNT","GOLD","GPC","GPUC","GRC","GRCX","GRS","GUE","H2O","HIRO","HOT","HUC",
    "HUGE","HVC","HYP","HZ","IFC","INDEX","IOC","ITC","IXC","JLH","JPC","JUG","KDC","KEY","LBC","LC","LCL","LEAF","LGC",
    "LOL","LOVE","LQD","LSK","LTBC","LTC","LTCX","MAID","MAST","MAX","MCN","MEC","METH","MIL","MIN","MINT","MMC","MMNXT",
    "MMXIV","MNTA","MON","MRC","MRS","MTS","MUN","MYR","MZC","N5X","NAS","NAUT","NAV","NBT","NEOS","NL","NMC","NOBL",
    "NOTE","NOXT","NRS","NSR","NTX","NXC","NXT","NXTI","OMNI","OPAL","PAND","PASC","PAWN","PIGGY","PINK","PLX","PMC",
    "POT","PPC","PRC","PRT","PTS","Q2C","QBK","QCN","QORA","QTL","RADS","RBY","RDD","REP","RIC","RZR","SBD","SC","SDC",
    "SHIBE","SHOPX","SILK","SJCX","SLR","SMC","SOC","SPA","SQL","SRCC","SRG","SSD","STEEM","STR","STRAT","SUM","SUN",
    "SWARM","SXC","SYNC","SYS","TAC","TOR","TRUST","TWE","UIS","ULTC","UNITY","URO","USDE","USDT","UTC","UTIL","UVC",
    "VIA","VOOT","VOX","VRC","VTC","WC","WDC","WIKI","WOLF","X13","XAI","XAP","XBC","XC","XCH","XCN","XCP","XCR","XDN",
    "XDP","XEM","XHC","XLB","XMG","XMR","XPB","XPM","XRP","XSI","XST","XSV","XUSD","XVC","XXC","YACC","YANG","YC","YIN",
    "ZEC"
];

pub fn create_db_pool() -> Pool<ConnectionManager<MysqlConnection>> {
    let config = Config::default();
    let manager = ConnectionManager::<MysqlConnection>::new(format!("{}", DB_CREDENTIALS));
    Pool::new(config, manager).expect("Failed to create pool.")
}

/// Given a type that can be debug-formatted, returns a String that contains its debug-formatted version.
pub fn debug<T>(x: T) -> String where T:Debug {
    format!("{:?}", x)
}

/// Given a currency and a timestamp, returns the exchange rate for that currency to BTC as close as possible to the provided timestamp.
pub fn get_rate(currency: &str, timestamp: NaiveDateTime, pool: DbPool) -> Result<f32, String> {
    if CURRENCIES.contains(&currency) {
        let conn = &*pool.get_conn();
        // have to construct raw SQL here since Diesel doesn't deal well with dynamic queries and writing macros is horrible
        let formatted_timestamp = timestamp.format(MYSQL_DATE_FORMAT);
        // create a query to find the trade nearest to the supplied timestamp within one day on either side.  Will return no rows if there
        // were no trades in the requested currency on one day on either side of the supplied timestamp.
        let query = format!(
            "SELECT `rate` FROM `trades_BTC_{}` WHERE `trade_time` BETWEEN DATE_SUB('{}', INTERVAL 1 DAY) AND DATE_ADD('{}', INTERVAL 1 DAY)
            ORDER BY abs(TIMESTAMPDIFF(SECOND, '{}', `trade_time`))", currency, formatted_timestamp, formatted_timestamp, formatted_timestamp);
        let select_statement = sql_literal::sql(&query);
        let res: Vec<f32> = select_statement
            .load::<f32>(conn)
            .map_err(debug)?;
        if res.len() > 0 {
            Ok(res[0])
        } else {
            Err(String::from("No trades occured within 1 day before or after the supplied timestamp in the supplied currency!"))
        }
    } else {
        Err(String::from("No stored data for that currency!"))
    }
}

#[test]
fn test_hist_rate_retrieval() {
    let pool = create_db_pool();
    assert_eq!(get_rate("DOGE", NaiveDateTime::parse_from_str("2014-01-25 05:44:38", MYSQL_DATE_FORMAT).unwrap(), DbPool(pool.clone())), Ok(0.0000015));
}

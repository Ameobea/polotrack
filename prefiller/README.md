# Database Prepopulator

A NodeJS script that pre-populates the database with data from the Poloniex API.  It loops through all available symbols and downloads all historical trade data, storing it in the database.  On repeated runs, it will fill in the database with new data for each pair starting from the most recently downloaded data point.  I recommend setting this on a cron job that runs hourly in order to keep the historical rates database up to date.

This tool only grabs the parts of the data that are important to use (global trade ID for indexing, time the trade occured, and exchange rate) and only stores only one data point per historical second.

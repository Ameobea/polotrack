# Database Prepopulator

A NodeJS script that pre-populates the database with data from the Poloniex API.  It loops through all available symbols and downloads all historical trade data, storing it in the database.

This tool only grabs the parts of the data that are important to use (global trade ID for indexing, time the trade occured, and exchange rate) and only grabs a maximum of one data point per second.

# Backend

The backend for this project is a Rust application that serves as an API gateway to the locally stored data.  One important feature of the tool is to track account, position, and profitability over time in terms of BTC or USD.  In order to do that, it's necessary to look back on a long history of exchange rates for the various cryptocurrencies.  This could be accomplished easily for a small number of time points, but for the large-scale comparisons over long periods of time and detailed charts I have in mind, making that number of API requests will be infeasable.

As a solution, I will be pulling a local copy of all trades made on Poloniex for all currencies and holding them locally.  I will expose an API to get the exchange rate for a currency at a given point in time as well as expanding that functionality for arrays of input times.  Combined with a well-designed backend, this will make a fast backend possible for the purposes I have need of.

## Components
The main component will be the API link that pulls data out of the database in response for exchange rate queries.  API endpoints will be added as required as the frontend grows.  However, a critical part of this process will be an updater daemon that updates the database with live data periodically to keep it fresh.  This could be implemented as a cron job or similar periodic script, but I'd like to bake the functionality into the application itself to keep everything as centralized and contained as possible.

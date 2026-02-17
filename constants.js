/**
 * Portfolio Tracker - Configuration and constants.
 * Edit PORTFOLIOS to update your tickers and unit counts.
 */
(function () {
    'use strict';

    const MARKET = {
        BRAZIL: 'brazil',
        US: 'us'
    };

    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

    const RATE_LIMIT_DELAY_MS = 1100; // Finnhub free tier: 60 calls/min

    const PORTFOLIOS = {
        [MARKET.BRAZIL]: {
            'TIMS3': 130,
            'MULT3': 101,
            'RADL3': 133,
            'BBDC3': 202,
            'ODPV3': 337,
            'CPFE3': 80,
            'EGIE3': 120,
            'WEGE3': 82,
            'FLRY3': 266,
            'BBAS3': 190,
            'ITUB3': 108,
            'PRIO3': 123,
            'TOTS3': 127,
            'SAPR3': 500,
            'PSSA3': 135
        },
        [MARKET.US]: {
            'PAYX': 2,
            'ROL': 4,
            'FAST': 10,
            'ROST': 3,
            'JPM': 2,
            'GOOG': 0,
            'JNJ': 3,
            'AME': 3,
            'MSFT': 4,
            'TSM': 4
        }
    };

    const API_CONFIG = {
        [MARKET.BRAZIL]: {
            baseUrl: 'https://brapi.dev/api/quote',
            storageKey: 'brapi_token',
            tokenPrompt: 'Enter your Brapi.dev API Token:',
            updateTokenPrompt: 'Enter new Brapi.dev Token:',
            cacheKey: 'brapi_stocks_cache',
            cacheTTL: CACHE_TTL_MS
        },
        [MARKET.US]: {
            baseUrl: 'https://finnhub.io/api/v1',
            storageKey: 'finnhub_token',
            tokenPrompt: 'Enter your Finnhub API Token:',
            updateTokenPrompt: 'Enter new Finnhub API Token:',
            cacheKey: 'finnhub_stocks_cache',
            cacheTTL: CACHE_TTL_MS
        }
    };

    window.PortfolioConstants = {
        MARKET,
        CACHE_TTL_MS,
        RATE_LIMIT_DELAY_MS,
        PORTFOLIOS,
        API_CONFIG
    };
})();

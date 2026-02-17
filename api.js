/**
 * Portfolio Tracker - API clients and data transformation for B3 and US markets.
 */
(function () {
    'use strict';

    const {
        MARKET,
        PORTFOLIOS,
        API_CONFIG,
        RATE_LIMIT_DELAY_MS
    } = window.PortfolioConstants;
    const { getCache, setCache } = window.Cache;
    const { getToken } = window.PortfolioAuth;

    function buildBrazilApiUrl(tickers, token) {
        const { baseUrl } = API_CONFIG[MARKET.BRAZIL];
        return `${baseUrl}/${tickers}?token=${token}&fundamental=true&modules=balanceSheetHistory,defaultKeyStatistics`;
    }

    function buildUsApiUrl(symbol, token, endpoint = 'quote', additionalParams = '') {
        const { baseUrl } = API_CONFIG[MARKET.US];
        const params = endpoint === 'stock/metric'
            ? `symbol=${symbol}&metric=all&token=${token}`
            : `symbol=${symbol}&token=${token}${additionalParams}`;
        return `${baseUrl}/${endpoint}?${params}`;
    }

    function transformBrazilStockData(apiStock) {
        const portfolio = PORTFOLIOS[MARKET.BRAZIL];
        const units = portfolio[apiStock.symbol] ?? 0;
        const price = apiStock.regularMarketPrice ?? 0;
        return {
            ticker: apiStock.symbol,
            price,
            units,
            total: price * units,
            p_l: apiStock.priceEarnings ?? 0,
            lpa: apiStock.earningsPerShare ?? 0,
            p_vpa: apiStock.defaultKeyStatistics?.priceToBook ?? 0
        };
    }

    function transformUsStockData(symbol, quoteData, metricsData = null) {
        if (!quoteData || quoteData.c === undefined) return null;
        const portfolio = PORTFOLIOS[MARKET.US];
        const units = portfolio[symbol] ?? 0;
        const price = parseFloat(quoteData.c) || 0;
        const pe = metricsData?.metric?.peNormalizedAnnual
            ? parseFloat(metricsData.metric.peNormalizedAnnual) : 0;
        const eps = metricsData?.metric?.epsNormalizedAnnual
            ? parseFloat(metricsData.metric.epsNormalizedAnnual) : 0;
        const pb = metricsData?.metric?.pbAnnual
            ? parseFloat(metricsData.metric.pbAnnual) : 0;
        return {
            ticker: symbol,
            price,
            units,
            total: price * units,
            p_l: pe,
            lpa: eps,
            p_vpa: pb
        };
    }

    async function fetchBrazilStocks({ onSuccess, onError }) {
        const config = API_CONFIG[MARKET.BRAZIL];
        const cachedData = getCache(config);

        if (cachedData) {
            onSuccess(cachedData.map(transformBrazilStockData));
            return;
        }

        const token = getToken(MARKET.BRAZIL);
        if (!token) return;

        const tickers = Object.keys(PORTFOLIOS[MARKET.BRAZIL]).join(',');
        const url = buildBrazilApiUrl(tickers, token);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!data.results) throw new Error('Invalid API Response');

            setCache(config, data.results);
            onSuccess(data.results.map(transformBrazilStockData));
        } catch (err) {
            console.error('Fetch Error:', err);
            onError();
        }
    }

    async function fetchUsStocks({ onSuccess, onError }) {
        const config = API_CONFIG[MARKET.US];
        const cachedData = getCache(config);

        if (cachedData) {
            onSuccess(cachedData);
            return;
        }

        const token = getToken(MARKET.US);
        if (!token) return;

        const symbols = Object.keys(PORTFOLIOS[MARKET.US]);
        if (symbols.length === 0) {
            onSuccess([]);
            return;
        }

        try {
            const results = [];
            for (let i = 0; i < symbols.length; i++) {
                const symbol = symbols[i];
                const quoteUrl = buildUsApiUrl(symbol, token, 'quote');
                const quoteResponse = await fetch(quoteUrl);
                if (!quoteResponse.ok) {
                    console.error(`HTTP error for ${symbol}:`, quoteResponse.status);
                    continue;
                }
                const quoteData = await quoteResponse.json();
                if (quoteData.error) {
                    console.error(`Error for ${symbol}:`, quoteData.error);
                    continue;
                }
                const metricsUrl = buildUsApiUrl(symbol, token, 'stock/metric');
                const metricsResponse = await fetch(metricsUrl);
                let metricsData = null;
                if (metricsResponse.ok) {
                    metricsData = await metricsResponse.json();
                    if (metricsData.error) metricsData = null;
                }
                const stock = transformUsStockData(symbol, quoteData, metricsData);
                if (stock) results.push(stock);
                if (i < symbols.length - 1) {
                    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS));
                }
            }
            setCache(config, results);
            onSuccess(results);
        } catch (err) {
            console.error('Fetch Error:', err);
            onError();
        }
    }

    window.PortfolioApi = {
        fetchBrazilStocks,
        fetchUsStocks
    };
})();

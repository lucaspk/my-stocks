/**
 * Portfolio Tracker - Stock portfolio dashboard with B3 (Brazil) and US market support.
 * Uses Brapi.dev for Brazil and Finnhub for US market data.
 */
const PortfolioApp = (() => {
    const MARKET = {
        BRAZIL: 'brazil',
        US: 'us'
    };

    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

    const STATE = {
        currentMarket: MARKET.BRAZIL,
        stocks: [],
        sortBy: 'total',
        sortDir: 'asc'
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

    // -------------------------------------------------------------------------
    // Formatting & DOM helpers
    // -------------------------------------------------------------------------

    const formatCurrency = (val, market) => {
        const currency = market === MARKET.BRAZIL ? 'BRL' : 'USD';
        const locale = market === MARKET.BRAZIL ? 'pt-BR' : 'en-US';
        return val.toLocaleString(locale, { style: 'currency', currency });
    };

    const formatNum = (val, decimals = 2) => Number(val).toFixed(decimals);

    const getElement = (id) => document.getElementById(id);

    /** Escapes HTML to prevent XSS when rendering user/API data */
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };


    const getToken = (market) => {
        const config = API_CONFIG[market];
        let token = localStorage.getItem(config.storageKey);
        if (!token || !token.trim()) {
            token = prompt(config.tokenPrompt);
            if (token && token.trim()) {
                localStorage.setItem(config.storageKey, token.trim());
            }
        }
        return token?.trim() || null;
    };


    const getCache = (config) => {
        const cached = localStorage.getItem(config.cacheKey);
        if (!cached) return null;

        try {
            const { timestamp, data } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            return age < config.cacheTTL ? data : null;
        } catch (err) {
            console.error('Error reading cache:', err);
            return null;
        }
    };

    const setCache = (config, data) => {
        try {
            localStorage.setItem(config.cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data
            }));
        } catch (err) {
            console.error('Error saving cache:', err);
        }
    };

    // -------------------------------------------------------------------------
    // API URL builders
    // -------------------------------------------------------------------------

    const buildBrazilApiUrl = (tickers, token) => {
        const { baseUrl } = API_CONFIG[MARKET.BRAZIL];
        return `${baseUrl}/${tickers}?token=${token}&fundamental=true&modules=balanceSheetHistory,defaultKeyStatistics`;
    };

    const buildUsApiUrl = (symbol, token, endpoint = 'quote', additionalParams = '') => {
        const { baseUrl } = API_CONFIG[MARKET.US];
        const params = endpoint === 'stock/metric'
            ? `symbol=${symbol}&metric=all&token=${token}`
            : `symbol=${symbol}&token=${token}${additionalParams}`;
        return `${baseUrl}/${endpoint}?${params}`;
    };

    // -------------------------------------------------------------------------
    // Data transformation
    // -------------------------------------------------------------------------

    const transformBrazilStockData = (apiStock) => {
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
    };

    const transformUsStockData = (symbol, quoteData, metricsData = null) => {
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
    };

    // -------------------------------------------------------------------------
    // Sorting
    // -------------------------------------------------------------------------

    const sortStocks = (stocks) => {
        const multiplier = STATE.sortDir === 'asc' ? 1 : -1;
        return [...stocks].sort((a, b) =>
            (Number(a[STATE.sortBy]) - Number(b[STATE.sortBy])) * multiplier
        );
    };

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    const createStockRow = (stock, index) => {
        const { ticker, units, price, total, p_l, lpa, p_vpa } = stock;
        const market = STATE.currentMarket;

        return `
            <tr class="hover:bg-indigo-50/40 transition-colors group">
                <td class="p-5 text-slate-400 font-mono text-xs">${index + 1}</td>
                <td class="p-5 font-bold text-slate-800">${escapeHtml(ticker)}</td>
                <td class="p-5 text-center text-slate-600">${units}</td>
                <td class="p-5 text-center text-slate-600 font-mono text-sm">${formatCurrency(price, market)}</td>
                <td class="p-5 text-center font-bold text-indigo-600 font-mono">${formatCurrency(total, market)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(p_l)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(lpa)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(p_vpa)}</td>
            </tr>
        `;
    };

    const updateSummary = () => {
        const grandTotal = STATE.stocks.reduce((acc, s) => acc + s.total, 0);
        const totalStr = formatCurrency(grandTotal, STATE.currentMarket);

        getElement('summary-total').textContent = totalStr;
        getElement('footer-total').textContent = totalStr;
        getElement('footer-count').textContent = `Tickers: ${STATE.stocks.length}`;
    };

    const renderTable = () => {
        const tbody = getElement('stock-table-body');
        const sortedStocks = sortStocks(STATE.stocks);

        tbody.innerHTML = sortedStocks.map(createStockRow).join('');
        updateSummary();
        if (typeof lucide?.createIcons === 'function') {
            lucide.createIcons();
        }
    };

    const showError = () => {
        getElement('empty-state').classList.remove('hidden');
    };

    const hideError = () => {
        getElement('empty-state').classList.add('hidden');
    };

    // -------------------------------------------------------------------------
    // Tab styling
    // -------------------------------------------------------------------------

    const TAB_ACTIVE_CLASSES = 'border-indigo-600 text-indigo-600';
    const TAB_INACTIVE_CLASSES = 'border-transparent text-slate-500';

    const updateTabStyles = (activeMarket) => {
        const brazilTab = getElement('tab-brazil');
        const usTab = getElement('tab-us');

        const [brazilActive, usActive] = activeMarket === MARKET.BRAZIL
            ? [true, false]
            : [false, true];

        brazilTab.classList.toggle('border-indigo-600', brazilActive);
        brazilTab.classList.toggle('text-indigo-600', brazilActive);
        brazilTab.classList.toggle('border-transparent', !brazilActive);
        brazilTab.classList.toggle('text-slate-500', !brazilActive);
        brazilTab.setAttribute('aria-selected', String(brazilActive));

        usTab.classList.toggle('border-indigo-600', usActive);
        usTab.classList.toggle('text-indigo-600', usActive);
        usTab.classList.toggle('border-transparent', !usActive);
        usTab.classList.toggle('text-slate-500', !usActive);
        usTab.setAttribute('aria-selected', String(usActive));
    };

    // -------------------------------------------------------------------------
    // API fetchers
    // -------------------------------------------------------------------------

    const fetchBrazilStocks = async () => {
        const config = API_CONFIG[MARKET.BRAZIL];
        const cachedData = getCache(config);

        if (cachedData) {
            STATE.stocks = cachedData.map(transformBrazilStockData);
            hideError();
            renderTable();
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
            STATE.stocks = data.results.map(transformBrazilStockData);
            hideError();
            renderTable();
        } catch (err) {
            console.error('Fetch Error:', err);
            showError();
        }
    };

    const fetchUsStocks = async () => {
        const config = API_CONFIG[MARKET.US];
        const cachedData = getCache(config);

        if (cachedData) {
            STATE.stocks = cachedData;
            hideError();
            renderTable();
            return;
        }

        const token = getToken(MARKET.US);
        if (!token) return;

        const symbols = Object.keys(PORTFOLIOS[MARKET.US]);
        if (symbols.length === 0) {
            STATE.stocks = [];
            hideError();
            renderTable();
            return;
        }

        const RATE_LIMIT_DELAY_MS = 1100; // Finnhub free tier: 60 calls/min

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
            STATE.stocks = results;
            hideError();
            renderTable();
        } catch (err) {
            console.error('Fetch Error:', err);
            showError();
        }
    };

    const fetchStocks = () => {
        STATE.stocks = [];
        renderTable();

        if (STATE.currentMarket === MARKET.BRAZIL) {
            fetchBrazilStocks();
        } else if (STATE.currentMarket === MARKET.US) {
            fetchUsStocks();
        }
    };

    // -------------------------------------------------------------------------
    // Sort & Token handlers
    // -------------------------------------------------------------------------

    const handleSort = (column) => {
        if (STATE.sortBy === column) {
            STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            STATE.sortBy = column;
            STATE.sortDir = 'asc';
        }
        renderTable();
    };

    const updateToken = () => {
        const config = API_CONFIG[STATE.currentMarket];
        const newToken = prompt(config.updateTokenPrompt);
        if (newToken && newToken.trim()) {
            localStorage.setItem(config.storageKey, newToken.trim());
            fetchStocks();
        }
    };

    // -------------------------------------------------------------------------
    // Market switch
    // -------------------------------------------------------------------------

    const switchMarket = (market) => {
        STATE.currentMarket = market;
        STATE.sortBy = 'total';
        STATE.sortDir = 'asc';
        STATE.stocks = [];

        updateTabStyles(market);
        getElement('header-title').textContent = market === MARKET.BRAZIL ? 'B3' : 'US';

        hideError();
        renderTable();
        fetchStocks();

        if (typeof lucide?.createIcons === 'function') {
            lucide.createIcons();
        }
    };

    const init = () => {
        switchMarket(MARKET.BRAZIL);
    };

    return {
        init,
        refresh: fetchStocks,
        updateToken,
        handleSort,
        switchMarket
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PortfolioApp.init());
} else {
    PortfolioApp.init();
}

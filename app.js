const PortfolioApp = (() => {
    const PORTFOLIOS = {
        brazil: {
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
        us: {
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
        currentMarket: 'brazil',
        stocks: [],
        sortBy: 'total',
        sortDir: 'asc'
    };

    const API_CONFIG = {
        brazil: {
            baseUrl: 'https://brapi.dev/api/quote',
            storageKey: 'brapi_token',
            tokenPrompt: 'Enter your Brapi.dev API Token:',
            updateTokenPrompt: 'Enter new Brapi.dev Token:',
            cacheKey: 'brapi_stocks_cache',
            cacheTTL: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        },
        us: {
            baseUrl: 'https://finnhub.io/api/v1',
            storageKey: 'finnhub_token',
            tokenPrompt: 'Enter your Finnhub API Token:',
            updateTokenPrompt: 'Enter new Finnhub API Token:',
            cacheKey: 'finnhub_stocks_cache',
            cacheTTL: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        }
    };

    const formatCurrency = (val, market) => {
        const currency = market === 'brazil' ? 'BRL' : 'USD';
        const locale = market === 'brazil' ? 'pt-BR' : 'en-US';
        return val.toLocaleString(locale, { style: 'currency', currency });
    };
    const formatNum = (val, decimals = 2) => val.toFixed(decimals);

    const getElement = (id) => document.getElementById(id);

    const getToken = (market) => {
        const config = API_CONFIG[market];
        let token = localStorage.getItem(config.storageKey);
        if (!token) {
            token = prompt(config.tokenPrompt);
            if (token) localStorage.setItem(config.storageKey, token);
        }
        return token;
    };

    const buildBrazilApiUrl = (tickers, token) => {
        const config = API_CONFIG.brazil;
        return `${config.baseUrl}/${tickers}?token=${token}&fundamental=true&modules=balanceSheetHistory,defaultKeyStatistics`;
    };

    const buildUsApiUrl = (symbol, token, endpoint = 'quote', additionalParams = '') => {
        const config = API_CONFIG.us;
        const params = endpoint === 'stock/metric' 
            ? `symbol=${symbol}&metric=all&token=${token}`
            : `symbol=${symbol}&token=${token}${additionalParams}`;
        return `${config.baseUrl}/${endpoint}?${params}`;
    };

    const transformBrazilStockData = (apiStock) => {
        const portfolio = PORTFOLIOS.brazil;
        const units = portfolio[apiStock.symbol] || 0;
        const price = apiStock.regularMarketPrice || 0;
        
        return {
            ticker: apiStock.symbol,
            price,
            units,
            total: price * units,
            p_l: apiStock.priceEarnings || 0,
            lpa: apiStock.earningsPerShare || 0,
            p_vpa: apiStock.defaultKeyStatistics?.priceToBook || 0
        };
    };

    const transformUsStockData = (symbol, quoteData, metricsData = null) => {
        const portfolio = PORTFOLIOS.us;
        
        // Finnhub quote response: { c: current, h: high, l: low, o: open, pc: previous close, t: timestamp }
        if (!quoteData || quoteData.c === undefined) return null;
        
        const units = portfolio[symbol] || 0;
        const price = parseFloat(quoteData.c) || 0;
        
        // Extract fundamental data from metrics if available
        const pe = metricsData?.metric?.peNormalizedAnnual ? parseFloat(metricsData.metric.peNormalizedAnnual) : 0;
        const eps = metricsData?.metric?.epsNormalizedAnnual ? parseFloat(metricsData.metric.epsNormalizedAnnual) : 0;
        const pb = metricsData?.metric?.pbAnnual ? parseFloat(metricsData.metric.pbAnnual) : 0;
        
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

    const sortStocks = (stocks) => {
        const multiplier = STATE.sortDir === 'asc' ? 1 : -1;
        return [...stocks].sort((a, b) => (a[STATE.sortBy] - b[STATE.sortBy]) * multiplier);
    };

    const createStockRow = (stock, index) => {
        const { ticker, units, price, total, p_l, lpa, p_vpa } = stock;
        return `
            <tr class="hover:bg-indigo-50/40 transition-colors group">
                <td class="p-5 text-slate-400 font-mono text-xs">${index + 1}</td>
                <td class="p-5 font-bold text-slate-800">${ticker}</td>
                <td class="p-5 text-center text-slate-600">${units}</td>
                <td class="p-5 text-center text-slate-600 font-mono text-sm">${formatCurrency(price, STATE.currentMarket)}</td>
                <td class="p-5 text-center font-bold text-indigo-600 font-mono">${formatCurrency(total, STATE.currentMarket)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(p_l)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(lpa)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(p_vpa)}</td>
            </tr>
        `;
    };

    const updateSummary = () => {
        const grandTotal = STATE.stocks.reduce((acc, stock) => acc + stock.total, 0);
        const totalStr = formatCurrency(grandTotal, STATE.currentMarket);

        getElement('summary-total').innerText = totalStr;
        getElement('footer-total').innerText = totalStr;
        getElement('footer-count').innerText = `Tickers: ${STATE.stocks.length}`;
    };

    const renderTable = () => {
        const tbody = getElement('stock-table-body');
        const sortedStocks = sortStocks(STATE.stocks);
        
        tbody.innerHTML = sortedStocks.map(createStockRow).join('');
        updateSummary();
        lucide.createIcons();
    };

    const showError = () => {
        getElement('empty-state').classList.remove('hidden');
    };

    const hideError = () => {
        getElement('empty-state').classList.add('hidden');
    };

    const getBrazilCache = () => {
        const config = API_CONFIG.brazil;
        const cached = localStorage.getItem(config.cacheKey);
        if (!cached) return null;

        try {
            const cacheData = JSON.parse(cached);
            const now = Date.now();
            const cacheAge = now - cacheData.timestamp;

            // Check if cache is still valid (within TTL)
            if (cacheAge < config.cacheTTL) {
                return cacheData.data;
            }
            // Cache expired
            return null;
        } catch (err) {
            console.error("Error reading cache:", err);
            return null;
        }
    };

    const setBrazilCache = (data) => {
        const config = API_CONFIG.brazil;
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        try {
            localStorage.setItem(config.cacheKey, JSON.stringify(cacheData));
        } catch (err) {
            console.error("Error saving cache:", err);
        }
    };

    const fetchBrazilStocks = async () => {
        // Check cache first
        const cachedData = getBrazilCache();
        if (cachedData) {
            STATE.stocks = cachedData.map(transformBrazilStockData);
            hideError();
            renderTable();
            return;
        }

        // Cache expired or doesn't exist, fetch from API
        const token = getToken('brazil');
        if (!token) return;

        const tickers = Object.keys(PORTFOLIOS.brazil).join(',');
        const url = buildBrazilApiUrl(tickers, token);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (!data.results) throw new Error("Invalid API Response");

            // Update cache with new data
            setBrazilCache(data.results);

            STATE.stocks = data.results.map(transformBrazilStockData);
            hideError();
            renderTable();
        } catch (err) {
            console.error("Fetch Error:", err);
            showError();
        }
    };

    const getUsCache = () => {
        const config = API_CONFIG.us;
        const cached = localStorage.getItem(config.cacheKey);
        if (!cached) return null;

        try {
            const cacheData = JSON.parse(cached);
            const now = Date.now();
            const cacheAge = now - cacheData.timestamp;

            // Check if cache is still valid (within TTL)
            if (cacheAge < config.cacheTTL) {
                return cacheData.data;
            }
            // Cache expired
            return null;
        } catch (err) {
            console.error("Error reading cache:", err);
            return null;
        }
    };

    const setUsCache = (data) => {
        const config = API_CONFIG.us;
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        try {
            localStorage.setItem(config.cacheKey, JSON.stringify(cacheData));
        } catch (err) {
            console.error("Error saving cache:", err);
        }
    };

    const fetchUsStocks = async () => {
        // Check cache first
        const cachedData = getUsCache();
        if (cachedData) {
            STATE.stocks = cachedData;
            hideError();
            renderTable();
            return;
        }

        // Cache expired or doesn't exist, fetch from API
        const token = getToken('us');
        if (!token) return;

        const symbols = Object.keys(PORTFOLIOS.us);
        if (symbols.length === 0) {
            STATE.stocks = [];
            hideError();
            renderTable();
            return;
        }

        try {
            // Finnhub free tier: 60 calls/min, so we can fetch faster
            // We fetch both quote and metrics for each symbol (2 calls per stock)
            const results = [];
            for (let i = 0; i < symbols.length; i++) {
                const symbol = symbols[i];
                
                // Fetch quote data (current price)
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
                
                // Fetch metrics data for fundamental analysis
                const metricsUrl = buildUsApiUrl(symbol, token, 'stock/metric');
                const metricsResponse = await fetch(metricsUrl);
                let metricsData = null;
                
                if (metricsResponse.ok) {
                    metricsData = await metricsResponse.json();
                    if (metricsData.error) {
                        metricsData = null; // Continue without metrics data
                    }
                }
                
                const stock = transformUsStockData(symbol, quoteData, metricsData);
                if (stock) results.push(stock);
                
                // Small delay to respect rate limits (60 calls/min = 1 call/second)
                if (i < symbols.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 seconds between calls
                }
            }

            // Update cache with new data
            setUsCache(results);

            STATE.stocks = results;
            hideError();
            renderTable();
        } catch (err) {
            console.error("Fetch Error:", err);
            showError();
        }
    };

    const fetchStocks = () => {
        // Ensure we clear stocks before fetching to avoid showing wrong market data
        STATE.stocks = [];
        renderTable();
        
        if (STATE.currentMarket === 'brazil') {
            fetchBrazilStocks();
        } else if (STATE.currentMarket === 'us') {
            fetchUsStocks();
        }
    };

    const toggleSortDirection = () => {
        STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
    };

    const setSortColumn = (column) => {
        STATE.sortBy = column;
        STATE.sortDir = 'asc';
    };

    const handleSort = (column) => {
        if (STATE.sortBy === column) {
            toggleSortDirection();
        } else {
            setSortColumn(column);
        }
        renderTable();
    };

    const updateToken = () => {
        const config = API_CONFIG[STATE.currentMarket];
        const newToken = prompt(config.updateTokenPrompt);
        if (newToken) {
            localStorage.setItem(config.storageKey, newToken);
            fetchStocks();
        }
    };

    const switchMarket = (market) => {
        STATE.currentMarket = market;
        STATE.sortBy = 'total';
        STATE.sortDir = 'asc';
        
        // Clear existing stocks immediately when switching
        STATE.stocks = [];
        renderTable(); // Clear the table display
        
        // Update tab styles for Brazil tab
        const brazilTab = getElement('tab-brazil');
        if (market === 'brazil') {
            brazilTab.classList.remove('border-transparent', 'text-slate-500');
            brazilTab.classList.add('border-indigo-600', 'text-indigo-600');
        } else {
            brazilTab.classList.remove('border-indigo-600', 'text-indigo-600');
            brazilTab.classList.add('border-transparent', 'text-slate-500');
        }
        
        // Update tab styles for US tab
        const usTab = getElement('tab-us');
        if (market === 'us') {
            usTab.classList.remove('border-transparent', 'text-slate-500');
            usTab.classList.add('border-indigo-600', 'text-indigo-600');
        } else {
            usTab.classList.remove('border-indigo-600', 'text-indigo-600');
            usTab.classList.add('border-transparent', 'text-slate-500');
        }
        
        // Update header
        getElement('header-title').innerText = market === 'brazil' ? 'B3' : 'US';
        
        // Hide error state when switching
        hideError();
        
        // Fetch new data for the selected market
        fetchStocks();
        lucide.createIcons();
    };

    const init = () => {
        switchMarket('brazil');
    };

    return {
        init,
        refresh: fetchStocks,
        updateToken,
        handleSort,
        switchMarket
    };
})();

PortfolioApp.init();

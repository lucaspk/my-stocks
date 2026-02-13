const PortfolioApp = (() => {
    const MY_PORTFOLIO = {
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
    };

    const STATE = {
        stocks: [],
        sortBy: 'total',
        sortDir: 'asc'
    };

    const API_BASE_URL = 'https://brapi.dev/api/quote';
    const STORAGE_KEY = 'brapi_token';

    const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatNum = (val, decimals = 2) => val.toFixed(decimals);

    const getElement = (id) => document.getElementById(id);

    const getToken = () => {
        let token = localStorage.getItem(STORAGE_KEY);
        if (!token) {
            token = prompt("Enter your Brapi.dev API Token:");
            if (token) localStorage.setItem(STORAGE_KEY, token);
        }
        return token;
    };

    const buildApiUrl = (tickers, token) => {
        return `${API_BASE_URL}/${tickers}?token=${token}&fundamental=true&modules=balanceSheetHistory,defaultKeyStatistics`;
    };

    const transformStockData = (apiStock) => {
        const units = MY_PORTFOLIO[apiStock.symbol] || 0;
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
                <td class="p-5 text-center text-slate-600 font-mono text-sm">${formatCurrency(price)}</td>
                <td class="p-5 text-center font-bold text-indigo-600 font-mono">${formatCurrency(total)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(p_l)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(lpa)}</td>
                <td class="p-5 text-center text-slate-500 font-mono">${formatNum(p_vpa)}</td>
            </tr>
        `;
    };

    const updateSummary = () => {
        const grandTotal = STATE.stocks.reduce((acc, stock) => acc + stock.total, 0);
        const totalStr = formatCurrency(grandTotal);

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

    const fetchStocks = async () => {
        const token = getToken();
        if (!token) return;

        const tickers = Object.keys(MY_PORTFOLIO).join(',');
        const url = buildApiUrl(tickers, token);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (!data.results) throw new Error("Invalid API Response");

            STATE.stocks = data.results.map(transformStockData);
            renderTable();
        } catch (err) {
            console.error("Fetch Error:", err);
            showError();
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
        const newToken = prompt("Enter new Brapi.dev Token:");
        if (newToken) {
            localStorage.setItem(STORAGE_KEY, newToken);
            fetchStocks();
        }
    };

    const init = () => {
        fetchStocks();
        lucide.createIcons();
    };

    return {
        init,
        refresh: fetchStocks,
        updateToken,
        handleSort
    };
})();

PortfolioApp.init();

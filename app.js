/**
 * PORTFOLIO APPLICATION MODULE
 */
const PortfolioApp = (() => {
    // --- Private State ---
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

    // --- Utilities ---
    const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatNum = (val, decimals = 2) => val.toFixed(decimals);

    // --- Core Logic ---
    const getToken = () => {
        let token = localStorage.getItem('brapi_token');
        if (!token) {
            token = prompt("Enter your Brapi.dev API Token:");
            if (token) localStorage.setItem('brapi_token', token);
        }
        return token;
    };

    const fetchStocks = async () => {
        const token = getToken();
        if (!token) return;

        const tickers = Object.keys(MY_PORTFOLIO).join(',');
        const url = `https://brapi.dev/api/quote/${tickers}?token=${token}&fundamental=true&modules=balanceSheetHistory,defaultKeyStatistics`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.results) throw new Error("Invalid API Response");

            STATE.stocks = data.results.map(s => ({
                ticker: s.symbol,
                price: s.regularMarketPrice || 0,
                units: MY_PORTFOLIO[s.symbol] || 0,
                total: (s.regularMarketPrice || 0) * (MY_PORTFOLIO[s.symbol] || 0),
                p_l: s.priceEarnings || 0,
                lpa: s.earningsPerShare || 0,
                p_vpa: s.defaultKeyStatistics?.priceToBook || 0
            }));

            render();
        } catch (err) {
            console.error("Fetch Error:", err);
            document.getElementById('empty-state').classList.remove('hidden');
        }
    };

    const render = () => {
        const tbody = document.getElementById('stock-table-body');
        
        // Sort Logic
        const sortedData = [...STATE.stocks].sort((a, b) => {
            const mod = STATE.sortDir === 'asc' ? 1 : -1;
            return (a[STATE.sortBy] - b[STATE.sortBy]) * mod;
        });

        // Generate Rows
        tbody.innerHTML = sortedData.map((stock, idx) => {
            const { ticker, units, price, total, p_l, lpa, p_vpa } = stock;
            return `
                <tr class="hover:bg-indigo-50/40 transition-colors group">
                    <td class="p-5 text-slate-400 font-mono text-xs">${idx + 1}</td>
                    <td class="p-5 font-bold text-slate-800">${ticker}</td>
                    <td class="p-5 text-center text-slate-600">${units}</td>
                    <td class="p-5 text-center text-slate-600 font-mono text-sm">${formatCurrency(price)}</td>
                    <td class="p-5 text-center font-bold text-indigo-600 font-mono">${formatCurrency(total)}</td>
                    <td class="p-5 text-center text-slate-500 font-mono">${formatNum(p_l)}</td>
                    <td class="p-5 text-center text-slate-500 font-mono">${formatNum(lpa)}</td>
                    <td class="p-5 text-center text-slate-500 font-mono">${formatNum(p_vpa)}</td>
                </tr>
            `;
        }).join('');

        // Update Footers/Headers
        const grandTotal = STATE.stocks.reduce((acc, s) => acc + s.total, 0);
        const totalStr = formatCurrency(grandTotal);

        document.getElementById('summary-total').innerText = totalStr;
        document.getElementById('footer-total').innerText = totalStr;
        document.getElementById('footer-count').innerText = `Tickers: ${STATE.stocks.length}`;
        
        lucide.createIcons();
    };

    // --- Public API ---
    return {
        init: () => {
            fetchStocks();
            lucide.createIcons();
        },
        refresh: fetchStocks,
        updateToken: () => {
            const newToken = prompt("Enter new Brapi.dev Token:");
            if (newToken) {
                localStorage.setItem('brapi_token', newToken);
                fetchStocks();
            }
        },
        handleSort: (col) => {
            if (STATE.sortBy === col) {
                STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                STATE.sortBy = col;
                STATE.sortDir = 'asc';
            }
            render();
        }
    };
})();

// Bootstrap App
PortfolioApp.init();

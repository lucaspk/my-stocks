/**
 * Portfolio Tracker - Application orchestrator.
 * Coordinates state, API calls, and UI updates.
 */
const PortfolioApp = (() => {
    const { MARKET, API_CONFIG } = window.PortfolioConstants;
    const { getElement } = window.PortfolioUtils;
    const { fetchBrazilStocks, fetchUsStocks } = window.PortfolioApi;
    const { renderTable, showError, hideError, updateTabStyles } = window.PortfolioUI;

    const STATE = {
        currentMarket: MARKET.BRAZIL,
        stocks: [],
        sortBy: 'total',
        sortDir: 'asc'
    };

    const refreshTable = () => {
        renderTable(STATE.stocks, STATE.sortBy, STATE.sortDir, STATE.currentMarket);
    };

    const loadStocks = () => {
        const onSuccess = (stocks) => {
            STATE.stocks = stocks;
            hideError();
            refreshTable();
        };
        const onError = () => showError();

        if (STATE.currentMarket === MARKET.BRAZIL) {
            fetchBrazilStocks({ onSuccess, onError });
        } else {
            fetchUsStocks({ onSuccess, onError });
        }
    };

    const fetchStocks = () => {
        STATE.stocks = [];
        refreshTable();
        loadStocks();
    };

    const handleSort = (column) => {
        if (STATE.sortBy === column) {
            STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            STATE.sortBy = column;
            STATE.sortDir = 'asc';
        }
        refreshTable();
    };

    const updateToken = () => {
        const config = API_CONFIG[STATE.currentMarket];
        const newToken = prompt(config.updateTokenPrompt);
        if (newToken && newToken.trim()) {
            localStorage.setItem(config.storageKey, newToken.trim());
            fetchStocks();
        }
    };

    const switchMarket = (market) => {
        STATE.currentMarket = market;
        STATE.sortBy = 'total';
        STATE.sortDir = 'asc';
        STATE.stocks = [];

        updateTabStyles(market);
        getElement('header-title').textContent = market === MARKET.BRAZIL ? 'B3' : 'US';

        hideError();
        refreshTable();
        loadStocks();

        if (typeof lucide?.createIcons === 'function') lucide.createIcons();
    };

    const init = () => switchMarket(MARKET.BRAZIL);

    return {
        init,
        refresh: fetchStocks,
        updateToken,
        handleSort,
        switchMarket
    };
})();

window.PortfolioApp = PortfolioApp;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PortfolioApp.init());
} else {
    PortfolioApp.init();
}

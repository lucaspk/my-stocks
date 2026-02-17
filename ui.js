/**
 * Portfolio Tracker - UI rendering and DOM updates.
 */
(function () {
    'use strict';

    const { MARKET } = window.PortfolioConstants;
    const { formatCurrency, formatNum, getElement, escapeHtml, sortStocks } = window.PortfolioUtils;

    function createStockRow(stock, index, market) {
        const { ticker, units, price, total, p_l, lpa, p_vpa } = stock;
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
    }

    function updateSummary(stocks, market) {
        const grandTotal = stocks.reduce((acc, s) => acc + s.total, 0);
        const totalStr = formatCurrency(grandTotal, market);
        getElement('summary-total').textContent = totalStr;
        getElement('footer-total').textContent = totalStr;
        getElement('footer-count').textContent = `Tickers: ${stocks.length}`;
    }

    function renderTable(stocks, sortBy, sortDir, market) {
        const tbody = getElement('stock-table-body');
        const sortedStocks = sortStocks(stocks, sortBy, sortDir);
        tbody.innerHTML = sortedStocks.map((s, i) => createStockRow(s, i, market)).join('');
        updateSummary(stocks, market);
        if (typeof lucide?.createIcons === 'function') lucide.createIcons();
    }

    function showError() {
        getElement('empty-state').classList.remove('hidden');
    }

    function hideError() {
        getElement('empty-state').classList.add('hidden');
    }

    function updateTabStyles(activeMarket) {
        const brazilTab = getElement('tab-brazil');
        const usTab = getElement('tab-us');
        const brazilActive = activeMarket === MARKET.BRAZIL;

        brazilTab.classList.toggle('border-indigo-600', brazilActive);
        brazilTab.classList.toggle('text-indigo-600', brazilActive);
        brazilTab.classList.toggle('border-transparent', !brazilActive);
        brazilTab.classList.toggle('text-slate-500', !brazilActive);
        brazilTab.setAttribute('aria-selected', String(brazilActive));

        usTab.classList.toggle('border-indigo-600', !brazilActive);
        usTab.classList.toggle('text-indigo-600', !brazilActive);
        usTab.classList.toggle('border-transparent', brazilActive);
        usTab.classList.toggle('text-slate-500', brazilActive);
        usTab.setAttribute('aria-selected', String(!brazilActive));
    }

    window.PortfolioUI = {
        renderTable,
        showError,
        hideError,
        updateTabStyles
    };
})();

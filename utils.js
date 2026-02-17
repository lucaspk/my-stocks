/**
 * Portfolio Tracker - Formatting and DOM utilities.
 */
(function () {
    'use strict';

    const { MARKET } = window.PortfolioConstants;

    function formatCurrency(val, market) {
        const currency = market === MARKET.BRAZIL ? 'BRL' : 'USD';
        const locale = market === MARKET.BRAZIL ? 'pt-BR' : 'en-US';
        return val.toLocaleString(locale, { style: 'currency', currency });
    }

    function formatNum(val, decimals = 2) {
        return Number(val).toFixed(decimals);
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function sortStocks(stocks, sortBy, sortDir) {
        const multiplier = sortDir === 'asc' ? 1 : -1;
        return [...stocks].sort((a, b) =>
            (Number(a[sortBy]) - Number(b[sortBy])) * multiplier
        );
    }

    window.PortfolioUtils = {
        formatCurrency,
        formatNum,
        getElement,
        escapeHtml,
        sortStocks
    };
})();

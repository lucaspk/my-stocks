/**
 * Portfolio Tracker - Token management for API authentication.
 */
(function () {
    'use strict';

    const { API_CONFIG } = window.PortfolioConstants;

    function getToken(market) {
        const config = API_CONFIG[market];
        let token = localStorage.getItem(config.storageKey);
        if (!token || !token.trim()) {
            token = prompt(config.tokenPrompt);
            if (token && token.trim()) {
                localStorage.setItem(config.storageKey, token.trim());
            }
        }
        return token?.trim() || null;
    }

    window.PortfolioAuth = { getToken };
})();

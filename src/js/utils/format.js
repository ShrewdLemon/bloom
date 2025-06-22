/**
 * Utility functions for formatting various data types in Bloom & Brew
 */

/**
 * Format a number as currency
 * @param {number} amount - The monetary amount to format
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} Formatted currency string
 */
export function formatMoney(amount, currency = '$') {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return `${currency}0`;
    }
    
    // Handle negative numbers
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    
    // Format based on amount size
    let formatted;
    if (absAmount >= 1000000) {
        // Millions
        formatted = `${currency}${(absAmount / 1000000).toFixed(1)}M`;
    } else if (absAmount >= 1000) {
        // Thousands
        formatted = `${currency}${(absAmount / 1000).toFixed(1)}K`;
    } else {
        // Under 1000
        formatted = `${currency}${absAmount.toFixed(0)}`;
    }
    
    return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format a number as a percentage
 * @param {number} value - The decimal value to format (0.75 = 75%)
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 0) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '0%';
    }
    
    return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format time in game minutes to human-readable format
 * @param {number} gameTime - Time in game minutes since start of day
 * @returns {string} Formatted time string (e.g., "8:30 AM")
 */
export function formatGameTime(gameTime) {
    if (typeof gameTime !== 'number' || isNaN(gameTime)) {
        return '6:00 AM';
    }
    
    const hours = Math.floor(gameTime / 60) % 24;
    const minutes = Math.floor(gameTime % 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = ((hours + 11) % 12 + 1);
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Format a large number with appropriate suffixes
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted number with suffix
 */
export function formatLargeNumber(num, decimals = 1) {
    if (typeof num !== 'number' || isNaN(num)) {
        return '0';
    }
    
    const absNum = Math.abs(num);
    const isNegative = num < 0;
    
    let formatted;
    if (absNum >= 1e9) {
        formatted = `${(absNum / 1e9).toFixed(decimals)}B`;
    } else if (absNum >= 1e6) {
        formatted = `${(absNum / 1e6).toFixed(decimals)}M`;
    } else if (absNum >= 1e3) {
        formatted = `${(absNum / 1e3).toFixed(decimals)}K`;
    } else {
        formatted = absNum.toFixed(decimals);
    }
    
    return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format duration in seconds to human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return '0s';
    }
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.slice(0, 2).join(' '); // Show max 2 units
}

/**
 * Format a number with commas for thousands separators
 * @param {number} num - The number to format
 * @returns {string} Formatted number with commas
 */
export function formatWithCommas(num) {
    if (typeof num !== 'number' || isNaN(num)) {
        return '0';
    }
    
    return num.toLocaleString();
}

/**
 * Format a decimal number to a fixed number of places
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export function formatDecimal(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) {
        return '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
    }
    
    return num.toFixed(decimals);
}

/**
 * Format a probability value (0-1) as a percentage with appropriate color class
 * @param {number} probability - Probability value between 0 and 1
 * @returns {Object} Object with formatted text and CSS class
 */
export function formatProbability(probability) {
    if (typeof probability !== 'number' || isNaN(probability)) {
        return { text: '0%', class: 'prob-unknown' };
    }
    
    const percentage = Math.round(probability * 100);
    const text = `${percentage}%`;
    
    let cssClass;
    if (percentage >= 80) {
        cssClass = 'prob-high';
    } else if (percentage >= 50) {
        cssClass = 'prob-medium';
    } else if (percentage >= 20) {
        cssClass = 'prob-low';
    } else {
        cssClass = 'prob-very-low';
    }
    
    return { text, class: cssClass };
}

/**
 * Format a risk metric with appropriate styling
 * @param {number} risk - Risk value (typically 0-1 but can be higher)
 * @param {string} type - Type of risk metric ('var', 'volatility', 'correlation', etc.)
 * @returns {Object} Object with formatted text and CSS class
 */
export function formatRiskMetric(risk, type = 'general') {
    if (typeof risk !== 'number' || isNaN(risk)) {
        return { text: 'N/A', class: 'risk-unknown' };
    }
    
    let text;
    let cssClass;
    
    switch (type) {
        case 'var':
            // Value at Risk - typically negative
            text = formatMoney(risk);
            cssClass = risk < -1000 ? 'risk-high' : risk < -500 ? 'risk-medium' : 'risk-low';
            break;
            
        case 'volatility':
            // Volatility - typically 0-1 but can be higher
            text = formatPercentage(risk, 2);
            cssClass = risk > 0.3 ? 'risk-high' : risk > 0.15 ? 'risk-medium' : 'risk-low';
            break;
            
        case 'correlation':
            // Correlation - typically -1 to 1
            text = formatDecimal(risk, 3);
            cssClass = Math.abs(risk) > 0.8 ? 'risk-high' : Math.abs(risk) > 0.5 ? 'risk-medium' : 'risk-low';
            break;
            
        default:
            // General risk metric
            text = formatDecimal(risk, 2);
            cssClass = risk > 0.7 ? 'risk-high' : risk > 0.3 ? 'risk-medium' : 'risk-low';
    }
    
    return { text, class: cssClass };
}
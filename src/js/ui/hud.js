// Heads-Up Display (HUD) for Bloom & Brew
import { formatMoney } from '../utils/format.js';

// Initialize HUD
export function initHUD() {
    // Create HUD elements if they don't exist
    if (!document.getElementById('hud-container')) {
        const hud = document.createElement('div');
        hud.id = 'hud-container';
        hud.className = 'hud-container';
        
        hud.innerHTML = `
            <div class="hud-money">
                <span class="hud-label">Money:</span>
                <span id="hud-money-amount">$1,000</span>
            </div>
            <div class="hud-reputation">
                <span class="hud-label">Reputation:</span>
                <div class="hud-bar-container">
                    <div id="hud-reputation-bar" class="hud-bar"></div>
                    <span id="hud-reputation-text" class="hud-bar-text">50/100</span>
                </div>
            </div>
            <div class="hud-day">
                <span class="hud-label">Day:</span>
                <span id="hud-day">1</span>
            </div>
            <div class="hud-customers">
                <span class="hud-label">Customers Today:</span>
                <span id="hud-customers">0</span>
            </div>
            <div class="hud-satisfaction">
                <span class="hud-label">Satisfaction:</span>
                <div class="hud-bar-container">
                    <div id="hud-satisfaction-bar" class="hud-bar"></div>
                    <span id="hud-satisfaction-text" class="hud-bar-text">100%</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(hud);
    }
    
    // Add CSS for HUD if not already added
    if (!document.getElementById('hud-styles')) {
        const style = document.createElement('style');
        style.id = 'hud-styles';
        style.textContent = `
            .hud-container {
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 10px;
                padding: 15px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                font-family: 'Nunito', sans-serif;
                z-index: 1000;
                min-width: 200px;
                border: 1px solid #e0e0e0;
            }
            
            .hud-container > div {
                margin: 8px 0;
                display: flex;
                align-items: center;
            }
            
            .hud-label {
                font-weight: 600;
                color: #555;
                margin-right: 10px;
                min-width: 100px;
                font-size: 0.9em;
            }
            
            .hud-bar-container {
                flex: 1;
                height: 20px;
                background: #f0f0f0;
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            }
            
            .hud-bar {
                height: 100%;
                background: #9CAF88;
                transition: width 0.3s ease;
                min-width: 0%;
            }
            
            .hud-bar-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 0.8em;
                font-weight: 600;
                color: #333;
                text-shadow: 0 0 2px white;
            }
            
            #hud-money-amount {
                font-weight: 700;
                color: #2e7d32;
            }
            
            #hud-day {
                font-weight: 700;
            }
            
            #hud-customers {
                font-weight: 700;
            }
            
            /* Professional mode styles */
            .professional-mode .hud-container {
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #d0d0d0;
            }
            
            .professional-mode .hud-label {
                color: #333;
                font-family: 'Courier New', monospace;
                font-weight: 700;
            }
            
            .professional-mode .hud-bar {
                background: #4a6fa5;
            }
        `;
        document.head.appendChild(style);
    }
}

// Update HUD with current game state
export function updateHUD(gameState) {
    // Update money
    const moneyElement = document.getElementById('hud-money-amount');
    if (moneyElement) {
        moneyElement.textContent = formatMoney(gameState.money);
    }
    
    // Update reputation
    updateHUDBar('reputation', gameState.reputation, 100);
    
    // Update day
    const dayElement = document.getElementById('hud-day');
    if (dayElement) {
        dayElement.textContent = gameState.day || 1;
    }
    
    // Update customers
    const customersElement = document.getElementById('hud-customers');
    if (customersElement) {
        customersElement.textContent = gameState.dailyCustomers || 0;
    }
    
    // Update satisfaction
    updateHUDBar('satisfaction', gameState.customerSatisfaction, 100, true);
    
    // Update any notifications
    if (gameState.lastNotification) {
        showNotification(gameState.lastNotification.message, gameState.lastNotification.type);
        gameState.lastNotification = null; // Clear after showing
    }
}

// Update a HUD progress bar
export function updateHUDBar(type, value, max = 100, showPercentage = false) {
    const barElement = document.getElementById(`hud-${type}-bar`);
    const textElement = document.getElementById(`hud-${type}-text`);
    
    if (barElement && textElement) {
        const percentage = Math.min(100, (value / max) * 100);
        barElement.style.width = `${percentage}%`;
        
        // Change color based on value (green > 70%, yellow > 30%, red otherwise)
        if (percentage > 70) {
            barElement.style.background = '#4caf50'; // Green
        } else if (percentage > 30) {
            barElement.style.background = '#ffc107'; // Yellow
        } else {
            barElement.style.background = '#f44336'; // Red
        }
        
        // Update text
        if (showPercentage) {
            textElement.textContent = `${Math.round(percentage)}%`;
        } else {
            textElement.textContent = `${Math.round(value)}/${max}`;
        }
    }
}

// Show a notification to the player
export function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.alignItems = 'flex-end';
        document.body.appendChild(container);
        
        // Add styles if not already added
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: #333;
                    font-family: 'Nunito', sans-serif;
                    font-size: 0.9em;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    transform: translateX(120%);
                    opacity: 0;
                    transition: all 0.3s ease;
                    max-width: 300px;
                    word-wrap: break-word;
                    cursor: pointer;
                    border-left: 4px solid #4a90e2;
                    background-color: #ffffff;
                }
                
                .notification.show {
                    transform: translateX(0);
                    opacity: 1;
                }
                
                .notification.info {
                    border-left-color: #4a90e2;
                    background-color: #e3f2fd;
                }
                
                .notification.success {
                    border-left-color: #4caf50;
                    background-color: #e8f5e9;
                }
                
                .notification.warning {
                    border-left-color: #ffc107;
                    background-color: #fff8e1;
                    color: #5e4a00;
                }
                
                .notification.error {
                    border-left-color: #f44336;
                    background-color: #ffebee;
                }
                
                @media (max-width: 600px) {
                    .notification {
                        max-width: 90%;
                        margin: 5px auto;
                        right: 5%;
                        left: 5%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to container
    container.insertBefore(notification, container.firstChild);
    
    // Trigger animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Auto-remove after delay
    const removeNotification = () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode === container) {
                container.removeChild(notification);
            }
            // Remove container if empty
            if (container.children.length === 0 && container.parentNode) {
                document.body.removeChild(container);
            }
        }, 300);
    };
    
    const removalTimeout = setTimeout(removeNotification, 5000);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
        clearTimeout(removalTimeout);
        removeNotification();
    });
}

// Initialize the HUD when the module loads
initHUD();

/**
 * Monte Carlo Simulation Module for Bloom & Brew
 * Handles various probabilistic simulations for risk assessment and scenario planning
 */

/**
 * Generic Monte Carlo simulation runner
 * @param {Object} params - Simulation parameters
 * @returns {Object} Simulation results
 */
export function runMonteCarloSimulation(params) {
    // Default to revenue simulation if no specific type is provided
    return runRevenueSimulation(params);
}

/**
 * Runs a Monte Carlo simulation for revenue forecasting
 * @param {Object} params - Simulation parameters
 * @param {number} params.baseRevenue - Base daily revenue
 * @param {number} params.dailyVolatility - Daily revenue volatility (standard deviation)
 * @param {number} params.days - Number of days to simulate
 * @param {number} params.simulations - Number of simulation runs
 * @returns {Object} Simulation results with statistics and paths
 */
export function runRevenueSimulation(params) {
    const { baseRevenue, dailyVolatility, days, simulations } = params;
    const results = {
        paths: [],
        finalRevenues: [],
        statistics: {}
    };
    
    // Run simulations
    for (let i = 0; i < simulations; i++) {
        const path = [baseRevenue];
        let currentRevenue = baseRevenue;
        
        for (let day = 1; day <= days; day++) {
            // Geometric Brownian Motion for revenue
            const randomFactor = Math.exp(
                -0.5 * Math.pow(dailyVolatility, 2) + 
                dailyVolatility * boxMullerTransform()
            );
            
            currentRevenue *= randomFactor;
            path.push(currentRevenue);
        }
        
        results.paths.push(path);
        results.finalRevenues.push(currentRevenue);
    }
    
    // Calculate statistics
    results.statistics = calculateStatistics(results.finalRevenues);
    
    // Calculate Value at Risk (VaR) and Conditional VaR (CVaR)
    const sortedRevenues = [...results.finalRevenues].sort((a, b) => a - b);
    const var95Index = Math.floor(simulations * 0.05);
    results.statistics.var95 = sortedRevenues[var95Index];
    results.statistics.cvar95 = sortedRevenues
        .slice(0, var95Index + 1)
        .reduce((sum, val) => sum + val, 0) / (var95Index + 1);
    
    return results;
}

/**
 * Simulates customer flow and service quality
 * @param {Object} params - Simulation parameters
 * @param {number} params.arrivalRate - Average customers per hour
 * @param {number} params.serviceRate - Average service rate (customers per hour per server)
 * @param {number} params.servers - Number of servers
 * @param {number} params.hours - Business hours to simulate
 * @param {number} params.simulations - Number of simulation runs
 * @returns {Object} Simulation results with service metrics
 */
export function runServiceQualitySimulation(params) {
    const { arrivalRate, serviceRate, servers, hours, simulations } = params;
    const results = {
        waitTimes: [],
        queueLengths: [],
        serverUtilization: [],
        statistics: {}
    };
    
    for (let sim = 0; sim < simulations; sim++) {
        let totalWaitTime = 0;
        let totalQueueLength = 0;
        let totalUtilization = 0;
        let customersServed = 0;
        
        const queue = [];
        const serverEndTimes = Array(servers).fill(0);
        
        // Simulate each minute
        for (let minute = 0; minute < hours * 60; minute++) {
            // Customer arrival (Poisson process)
            if (Math.random() < arrivalRate / 60) {
                queue.push({
                    arrivalTime: minute,
                    serviceTime: Math.ceil(-Math.log(1 - Math.random()) * 60 / serviceRate)
                });
            }
            
            // Process servers
            for (let i = 0; i < servers; i++) {
                if (serverEndTimes[i] <= minute && queue.length > 0) {
                    const customer = queue.shift();
                    serverEndTimes[i] = minute + customer.serviceTime;
                    totalWaitTime += minute - customer.arrivalTime;
                    customersServed++;
                }
                
                // Track utilization
                if (serverEndTimes[i] > minute) {
                    totalUtilization++;
                }
            }
            
            // Track queue length
            totalQueueLength += queue.length;
        }
        
        // Calculate metrics for this simulation
        results.waitTimes.push(customersServed > 0 ? totalWaitTime / customersServed : 0);
        results.queueLengths.push(totalQueueLength / (hours * 60));
        results.serverUtilization.push(totalUtilization / (servers * hours * 60));
    }
    
    // Calculate statistics
    results.statistics = {
        avgWaitTime: calculateStatistics(results.waitTimes).mean,
        avgQueueLength: calculateStatistics(results.queueLengths).mean,
        avgUtilization: calculateStatistics(results.serverUtilization).mean,
        waitTimePercentiles: calculatePercentiles(results.waitTimes, [50, 75, 90, 95]),
        queueLengthPercentiles: calculatePercentiles(results.queueLengths, [50, 75, 90, 95])
    };
    
    return results;
}

/**
 * Simulates inventory management with uncertain demand
 * @param {Object} params - Simulation parameters
 * @param {number} params.holdingCost - Cost to hold one unit of inventory per day
 * @param {number} params.orderingCost - Fixed cost per order
 * @param {number} params.leadTime - Order lead time in days
 * @param {number} params.initialInventory - Starting inventory
 * @param {number} params.days - Number of days to simulate
 * @param {number} params.simulations - Number of simulation runs
 * @param {Function} params.demandGenerator - Function that generates daily demand
 * @returns {Object} Simulation results with cost metrics
 */
export function runInventorySimulation(params) {
    const { 
        holdingCost, 
        orderingCost, 
        leadTime, 
        initialInventory, 
        days, 
        simulations, 
        demandGenerator 
    } = params;
    
    const results = {
        totalCosts: [],
        serviceLevels: [],
        averageInventory: [],
        statistics: {}
    };
    
    // Run simulations
    for (let sim = 0; sim < simulations; sim++) {
        let inventory = initialInventory;
        let totalCost = 0;
        let totalDemand = 0;
        let totalStockouts = 0;
        let totalHoldingCost = 0;
        let totalOrderingCost = 0;
        
        const ordersInTransit = [];
        const dailyInventory = [];
        
        for (let day = 0; day < days; day++) {
            // Receive orders that have arrived
            const arrivedOrders = ordersInTransit.filter(order => order.arrivalDay === day);
            ordersInTransit = ordersInTransit.filter(order => order.arrivalDay > day);
            
            // Add arrived orders to inventory
            for (const order of arrivedOrders) {
                inventory += order.quantity;
                totalOrderingCost += orderingCost;
            }
            
            // Generate demand
            const demand = demandGenerator(day);
            totalDemand += demand;
            
            // Fulfill demand
            const fulfilled = Math.min(inventory, demand);
            const stockout = demand - fulfilled;
            
            if (stockout > 0) {
                totalStockouts += stockout;
            }
            
            inventory -= fulfilled;
            
            // Calculate holding cost
            const dailyHoldingCost = inventory * holdingCost;
            totalHoldingCost += dailyHoldingCost;
            
            // Record daily inventory
            dailyInventory.push(inventory);
            
            // Place new order (simple reorder point policy)
            if (inventory <= 20) { // Reorder point
                const orderQuantity = 50; // Fixed order quantity
                ordersInTransit.push({
                    quantity: orderQuantity,
                    arrivalDay: day + leadTime
                });
            }
        }
        
        // Calculate metrics for this simulation
        const totalCost = totalHoldingCost + totalOrderingCost + (totalStockouts * 10); // Stockout cost
        const serviceLevel = 1 - (totalStockouts / totalDemand);
        const avgInventory = dailyInventory.reduce((sum, val) => sum + val, 0) / days;
        
        results.totalCosts.push(totalCost);
        results.serviceLevels.push(serviceLevel);
        results.averageInventory.push(avgInventory);
    }
    
    // Calculate statistics
    results.statistics = {
        avgTotalCost: calculateStatistics(results.totalCosts).mean,
        avgServiceLevel: calculateStatistics(results.serviceLevels).mean,
        avgInventory: calculateStatistics(results.averageInventory).mean,
        costPercentiles: calculatePercentiles(results.totalCosts, [5, 25, 50, 75, 95]),
        serviceLevelPercentiles: calculatePercentiles(results.serviceLevels, [5, 25, 50, 75, 95])
    };
    
    return results;
}

/**
 * Helper function to calculate basic statistics from an array of numbers
 */
function calculateStatistics(data) {
    if (data.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };
    
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / data.length;
    
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return {
        mean,
        stdDev,
        min: Math.min(...data),
        max: Math.max(...data),
        median: calculatePercentile(data, 50)
    };
}

/**
 * Calculate percentiles for an array of values
 */
function calculatePercentiles(data, percentiles) {
    const sorted = [...data].sort((a, b) => a - b);
    return percentiles.map(p => ({
        percentile: p,
        value: calculatePercentile(sorted, p)
    }));
}

/**
 * Calculate a single percentile from a sorted array
 */
function calculatePercentile(sortedData, percentile) {
    if (sortedData.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) return sortedData[lower];
    
    // Linear interpolation
    return sortedData[lower] + (sortedData[upper] - sortedData[lower]) * (index - lower);
}

/**
 * Box-Muller transform for generating normally distributed random numbers
 */
function boxMullerTransform() {
    const u1 = 1 - Math.random(); // [0, 1) -> (0, 1]
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0; // We only need one value
}

/**
 * Generate a random number from a triangular distribution
 */
function triangularDistribution(min, mode, max) {
    const u = Math.random();
    const f = (mode - min) / (max - min);
    
    if (u <= f) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
}

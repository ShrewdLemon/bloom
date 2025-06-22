// Queuing Theory Implementation for Bloom & Brew
// Implements M/M/c queue model for customer service simulation

export class QueueingModel {
    /**
     * Creates a new queuing model
     * @param {number} arrivalRate - Average arrival rate (λ) in customers per minute
     * @param {number} serviceRate - Average service rate (μ) in customers per minute per server
     * @param {number} servers - Number of servers (c)
     */
    constructor(arrivalRate, serviceRate, servers = 1) {
        this.arrivalRate = arrivalRate;
        this.serviceRate = serviceRate;
        this.servers = servers;
        
        // Derived metrics
        this.trafficIntensity = this.calculateTrafficIntensity();
        this.probabilityZero = this.calculateProbabilityZero();
        this.averageQueueLength = this.calculateAverageQueueLength();
        this.averageTimeInQueue = this.calculateAverageTimeInQueue();
        this.utilization = this.calculateUtilization();
    }
    
    /**
     * Calculate traffic intensity (ρ = λ/(cμ))
     */
    calculateTrafficIntensity() {
        return this.arrivalRate / (this.servers * this.serviceRate);
    }
    
    /**
     * Calculate probability of zero customers in the system (P₀)
     */
    calculateProbabilityZero() {
        const rho = this.trafficIntensity;
        let sum = 0;
        
        // Summation part of the formula
        for (let n = 0; n < this.servers; n++) {
            sum += Math.pow(this.arrivalRate / this.serviceRate, n) / this.factorial(n);
        }
        
        // Add the final term
        const finalTerm = (Math.pow(this.arrivalRate / this.serviceRate, this.servers) / 
                         this.factorial(this.servers)) * 
                         (1 / (1 - rho));
        
        return 1 / (sum + finalTerm);
    }
    
    /**
     * Calculate average number of customers in the queue (Lq)
     */
    calculateAverageQueueLength() {
        const rho = this.trafficIntensity;
        const numerator = Math.pow(this.arrivalRate / this.serviceRate, this.servers) * rho * this.probabilityZero;
        const denominator = this.factorial(this.servers) * Math.pow(1 - rho, 2);
        
        return numerator / denominator;
    }
    
    /**
     * Calculate average time a customer spends in the queue (Wq)
     */
    calculateAverageTimeInQueue() {
        return this.averageQueueLength / this.arrivalRate;
    }
    
    /**
     * Calculate server utilization (ρ = λ/(cμ))
     */
    calculateUtilization() {
        return this.trafficIntensity;
    }
    
    /**
     * Calculate probability of n customers in the system (Pₙ)
     */
    probabilityOfNCustomers(n) {
        if (n < this.servers) {
            return (Math.pow(this.arrivalRate / this.serviceRate, n) / this.factorial(n)) * this.probabilityZero;
        } else {
            return (Math.pow(this.arrivalRate / this.serviceRate, n) / 
                   (Math.pow(this.servers, n - this.servers) * this.factorial(this.servers))) * 
                   this.probabilityZero;
        }
    }
    
    /**
     * Calculate the probability that a customer has to wait in the queue
     */
    probabilityOfWaiting() {
        const rho = this.trafficIntensity;
        const numerator = Math.pow(this.arrivalRate / this.serviceRate, this.servers) * this.probabilityZero;
        const denominator = this.factorial(this.servers) * (1 - rho);
        
        return numerator / denominator;
    }
    
    /**
     * Optimize the number of servers to meet a target wait time
     * @param {number} targetWaitTime - Maximum acceptable wait time in minutes
     * @returns {number} Optimal number of servers
     */
    optimizeServersForWaitTime(targetWaitTime) {
        let servers = this.servers;
        let currentWait = this.calculateAverageTimeInQueue();
        
        // If already meeting the target, try to reduce servers
        if (currentWait <= targetWaitTime) {
            while (servers > 1) {
                const testModel = new QueueingModel(this.arrivalRate, this.serviceRate, servers - 1);
                if (testModel.calculateAverageTimeInQueue() > targetWaitTime) {
                    break;
                }
                servers--;
            }
        } 
        // If not meeting target, increase servers
        else {
            while (currentWait > targetWaitTime) {
                servers++;
                const testModel = new QueueingModel(this.arrivalRate, this.serviceRate, servers);
                currentWait = testModel.calculateAverageTimeInQueue();
            }
        }
        
        return servers;
    }
    
    /**
     * Helper function to calculate factorial
     */
    factorial(n) {
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }
}

/**
 * Simulate customer arrivals and service times
 * @param {Object} params - Simulation parameters
 * @param {number} params.duration - Duration of simulation in minutes
 * @param {number} params.arrivalRate - Average arrivals per minute
 * @param {number} params.serviceRate - Average services per minute per server
 * @param {number} params.servers - Number of servers
 * @returns {Object} Simulation results
 */
export function simulateQueue(params) {
    const { duration, arrivalRate, serviceRate, servers } = params;
    
    // Convert rates to probabilities per minute
    const arrivalProb = 1 - Math.exp(-arrivalRate / 60);
    const serviceProb = 1 - Math.exp(-serviceRate / 60);
    
    const queue = [];
    const serverBusy = Array(servers).fill(0);
    const results = {
        totalCustomers: 0,
        servedCustomers: 0,
        averageWaitTime: 0,
        maxQueueLength: 0,
        serverUtilization: Array(servers).fill(0)
    };
    
    let totalWaitTime = 0;
    
    // Simulate each minute
    for (let minute = 0; minute < duration; minute++) {
        // Generate new arrivals
        if (Math.random() < arrivalProb) {
            queue.push({
                arrivalTime: minute,
                serviceTime: Math.ceil(Math.random() * (2 / serviceProb)) // Random service time
            });
            results.totalCustomers++;
        }
        
        // Update server status and process queue
        for (let i = 0; i < servers; i++) {
            if (serverBusy[i] > 0) {
                serverBusy[i]--;
                results.serverUtilization[i]++;
            }
            
            if (serverBusy[i] === 0 && queue.length > 0) {
                const customer = queue.shift();
                serverBusy[i] = customer.serviceTime;
                totalWaitTime += minute - customer.arrivalTime;
                results.servedCustomers++;
            }
        }
        
        // Update max queue length
        if (queue.length > results.maxQueueLength) {
            results.maxQueueLength = queue.length;
        }
    }
    
    // Calculate final metrics
    results.averageWaitTime = results.servedCustomers > 0 
        ? totalWaitTime / results.servedCustomers 
        : 0;
        
    results.serverUtilization = results.serverUtilization.map(u => u / duration);
    
    return results;
}

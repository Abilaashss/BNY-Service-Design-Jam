import { DomainConfig } from '../types';

export const DOMAINS: Record<string, DomainConfig> = {
  bny: {
    id: 'bny',
    name: 'BNY',
    logo: '🏦',
    description: 'Financial services, asset management, and complex portfolio queries.',
    slaThresholds: {
      urgent: 4, // 4 hours for critical issues like trade failures
      standard: 24, // 24 hours for general queries
    },
    riskKeywords: {
      critical: [
        'fraud', 'unauthorized', 'compliance breach', 'lawsuit', 'breach', 'lost money', 
        'emergency', 'sec investigation', 'money laundering', 'sanctions', 'insider trading', 
        'identity theft', 'hacked', 'fiduciary failure', 'regulatory inquiry'
      ],
      high: [
        'fail', 'error', 'urgent', 'stuck', 'immediately', 'penalty', 'escalate', 
        'margin call', 'trade failure', 'wire missing', 'incorrect balance', 'double charge', 
        'cannot withdraw', 'account frozen', 'system outage'
      ],
      medium: [
        'delay', 'slow', 'confused', 'access', 'login', 'reset', 'password', 
        'fees', 'statement', 'clarification', 'not working', 'app crash'
      ],
    },
  },
  zepto: {
    id: 'zepto',
    name: 'Zepto',
    logo: '⚡',
    description: '10-minute grocery delivery, order fulfillment, and logistics.',
    slaThresholds: {
      urgent: 0.25, // 15 mins (if order is late, it's urgent)
      standard: 1, // 1 hour for refunds/general
    },
    riskKeywords: {
      critical: [
        'spoiled', 'allergy', 'sick', 'unsafe', 'accident', 'food poisoning', 'scam', 
        'sexual harassment', 'threatened', 'stalking', 'severe injury', 'hospital', 
        'expired product', 'foreign object', 'contamination'
      ],
      high: [
        'late', 'missing', 'cold', 'wrong item', 'refund', 'cancel', 'driver', 'never arrived', 
        'spilled', 'damaged', 'rude', 'unprofessional', 'vehicle breakdown', 'payment failed', 
        'charged twice'
      ],
      medium: [
        'status', 'where', 'promo', 'coupon', 'bag', 'item missing', 'change address', 
        'add item', 'phone number', 'contact support', 'eta'
      ],
    },
  },
};

// Simulated "Customer 360" Database
export const MOCK_USER_CONTEXT = {
  bny: {
    accountHolder: "Alex Mercer",
    accountType: "Institutional Premium",
    recentTransactions: [
      { id: "TXN-88291", date: "2024-05-20", amount: "$50,000.00", recipient: "Vendor Corp Inc.", status: "Pending", type: "Wire Transfer" },
      { id: "TXN-88285", date: "2024-05-19", amount: "$1,250.00", recipient: "Service Fee", status: "Completed", type: "Debit" },
      { id: "TXN-88100", date: "2024-05-15", amount: "$150,000.00", recipient: "Global Equity Fund", status: "Completed", type: "Investment" }
    ],
    alerts: [
      { id: "ALT-001", type: "Security", message: "Login attempt from new device (Singapore)" },
      { id: "ALT-002", type: "Portfolio", message: "Rebalancing recommended for Q3" }
    ]
  },
  zepto: {
    accountHolder: "Alex Mercer",
    membership: "Zepto Pass",
    recentOrders: [
      { id: "ZEP-9921", date: "Today, 10:30 AM", items: ["Milk (1L)", "Whole Wheat Bread", "Eggs (6)"], status: "Delayed", driver: "Rajesh K.", eta: "10:55 AM (Original: 10:40 AM)" },
      { id: "ZEP-9900", date: "Yesterday, 06:15 PM", items: ["Diet Coke (Can) x6", "Lays Classic"], status: "Delivered", issue: "None" },
      { id: "ZEP-9850", date: "Last Week", items: ["Avocados x2", "Tomatoes"], status: "Refunded", issue: "Item Quality" }
    ],
    activePromos: [
      { code: "FREEDEL", description: "Free Delivery on orders > $10" }
    ]
  }
};
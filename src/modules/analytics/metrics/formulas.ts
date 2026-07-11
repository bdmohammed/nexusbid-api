export interface CalculatedMetric {
  key: string;
  name: string;
  calculate: (data: Record<string, any>) => number | string;
}

export const MetricFormulas: Record<string, CalculatedMetric> = {
  mrr: {
    key: 'mrr',
    name: 'Monthly Recurring Revenue',
    calculate: (data) => {
      const activeMonthlyPlansRevenue = data['activeMonthlyRevenueCents'] ?? 0;
      return (activeMonthlyPlansRevenue / 100).toFixed(2);
    },
  },
  arr: {
    key: 'arr',
    name: 'Annual Recurring Revenue',
    calculate: (data) => {
      const activeMonthlyPlansRevenue = data['activeMonthlyRevenueCents'] ?? 0;
      return ((activeMonthlyPlansRevenue * 12) / 100).toFixed(2);
    },
  },
  conversion_rate: {
    key: 'conversion_rate',
    name: 'Bid Conversion Rate',
    calculate: (data) => {
      const uniqueVisitors = data['uniqueVisitors'] ?? 1;
      const bidsSubmitted = data['bidsSubmitted'] ?? 0;
      const rate = (bidsSubmitted / uniqueVisitors) * 100;
      return `${Math.min(100, parseFloat(rate.toFixed(2)))}%`;
    },
  },
  bid_success_rate: {
    key: 'bid_success_rate',
    name: 'Bid Success Rate',
    calculate: (data) => {
      const bidsSubmitted = data['bidsSubmitted'] ?? 1;
      const bidsAwarded = data['bidsAwarded'] ?? 0;
      const rate = (bidsAwarded / bidsSubmitted) * 100;
      return `${Math.min(100, parseFloat(rate.toFixed(2)))}%`;
    },
  },
  churn_rate: {
    key: 'churn_rate',
    name: 'Subscriber Churn Rate',
    calculate: (data) => {
      const activeCount = data['activeSubscribers'] ?? 1;
      const cancelledCount = data['cancelledThisMonth'] ?? 0;
      const rate = (cancelledCount / activeCount) * 100;
      return `${Math.min(100, parseFloat(rate.toFixed(2)))}%`;
    },
  },
  arpu: {
    key: 'arpu',
    name: 'Average Revenue Per User',
    calculate: (data) => {
      const activeUsers = data['activeUsers'] ?? 1;
      const revenueCents = data['revenueCents'] ?? 0;
      return (revenueCents / activeUsers / 100).toFixed(2);
    },
  },
  ltv: {
    key: 'ltv',
    name: 'Customer Lifetime Value',
    calculate: (data) => {
      const activeUsers = data['activeUsers'] ?? 1;
      const revenueCents = data['revenueCents'] ?? 0;
      const activeCount = data['activeSubscribers'] ?? 1;
      const cancelledCount = data['cancelledThisMonth'] ?? 1;

      const arpu = revenueCents / activeUsers / 100;
      const churn = Math.max(0.01, cancelledCount / activeCount);
      return (arpu / churn).toFixed(2);
    },
  },
};

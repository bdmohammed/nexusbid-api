export interface MetricCalculationData {
  activeMonthlyRevenueCents: number;
  uniqueVisitors: number;
  bidsSubmitted: number;
  bidsAwarded: number;
  activeSubscribers: number;
  cancelledThisMonth: number;
  activeUsers: number;
  revenueCents: number;
  [key: string]: number;
}

export interface CalculatedMetric {
  key: string;
  name: string;
  calculate: (data: MetricCalculationData) => number | string;
}

export const MetricFormulas: Record<string, CalculatedMetric> = {
  mrr: {
    key: 'mrr',
    name: 'Monthly Recurring Revenue',
    calculate: (data) => {
      const activeMonthlyPlansRevenue = data.activeMonthlyRevenueCents;
      return (activeMonthlyPlansRevenue / 100).toFixed(2);
    },
  },
  arr: {
    key: 'arr',
    name: 'Annual Recurring Revenue',
    calculate: (data) => {
      const activeMonthlyPlansRevenue = data.activeMonthlyRevenueCents;
      return ((activeMonthlyPlansRevenue * 12) / 100).toFixed(2);
    },
  },
  conversion_rate: {
    key: 'conversion_rate',
    name: 'Bid Conversion Rate',
    calculate: (data) => {
      const { uniqueVisitors, bidsSubmitted } = data;
      const rate = (bidsSubmitted / uniqueVisitors) * 100;
      return `${Math.min(100, parseFloat(rate.toFixed(2)))}%`;
    },
  },
  bid_success_rate: {
    key: 'bid_success_rate',
    name: 'Bid Success Rate',
    calculate: (data) => {
      const { bidsSubmitted, bidsAwarded } = data;
      const rate = (bidsAwarded / bidsSubmitted) * 100;
      return `${Math.min(100, parseFloat(rate.toFixed(2)))}%`;
    },
  },
  churn_rate: {
    key: 'churn_rate',
    name: 'Subscriber Churn Rate',
    calculate: (data) => {
      const { activeSubscribers, cancelledThisMonth } = data;
      const rate = (cancelledThisMonth / activeSubscribers) * 100;
      return `${Math.min(100, parseFloat(rate.toFixed(2)))}%`;
    },
  },
  arpu: {
    key: 'arpu',
    name: 'Average Revenue Per User',
    calculate: (data) => {
      const { activeUsers, revenueCents } = data;
      return (revenueCents / activeUsers / 100).toFixed(2);
    },
  },
  ltv: {
    key: 'ltv',
    name: 'Customer Lifetime Value',
    calculate: (data) => {
      const { activeUsers, revenueCents, activeSubscribers, cancelledThisMonth } = data;

      const arpu = revenueCents / activeUsers / 100;
      const churn = Math.max(0.01, cancelledThisMonth / activeSubscribers);
      return (arpu / churn).toFixed(2);
    },
  },
};

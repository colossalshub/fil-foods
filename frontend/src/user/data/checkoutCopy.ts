import { formatPeso, PLAN_PRICES, STANDARD_MEAL_PRICE } from '../services/orderService';

/** USR-19 fulfillment screens — keep strings aligned with product copy. */
export const FULFILLMENT_COPY = {
  chooseTitle: 'Delivery or Pickup',
  chooseLead: 'Choose how you want to receive your meals.',
  deliveryTitle: 'Delivery',
  pickupTitle: 'Pickup',
  deliveryCardBody: 'Have your meals brought to your saved delivery address.',
  pickupCardBody: 'Pick up your meals at the F.I.L. Foods counter at your scheduled time.',
  continue: 'Continue',
  deliveryDetailsTitle: 'Delivery details',
  deliveryDetailsLead: 'Confirm your address and choose when to receive your meals.',
  pickupDetailsTitle: 'Pickup details',
  pickupDetailsLead: 'Review pickup instructions and choose a pickup time.',
  useSavedAddress: 'Use my saved address',
  requestDifferentAddress: 'Request a different address',
  pickupCounterTitle: 'F.I.L Foods Pickup Counter',
  pickupSteps: [
    'Come to the pickup counter at your scheduled time.',
    'Show your order reference to collect your meals.',
    'Check that your meals match your order before you leave.',
  ],
} as const;

export const CHECKOUT_MSG = {
  choosePlanTitle: 'Choose a plan',
  choosePlanLead: 'Pick the plan that fits how you eat.',
  choosePlan: 'Choose plan',
  orderSummaryTitle: 'Order summary',
  orderSummaryLead: 'Review your meals and fulfillment details before you confirm.',
  placeOrder: 'Place order',
  continue: 'Continue',
  confirmTitle: 'Confirm your order',
  confirmLead: 'Please check everything before you send it.',
  dietitianNotice: 'Your order goes to the Dietitian first. You pay only after it is approved.',
  confirmSend: 'Confirm and send order',
  goBack: 'Go back',
  sentTitle: 'Sent to the Dietitian',
  sentLead: 'Your order is waiting for review.',
  sentNotice: 'You can pay once the Dietitian approves your order.',
  viewOrders: 'View my orders',
  approvedTitle: 'Approved by your Dietitian',
  approvedLead: 'You can pay for your order now.',
  payAmount: (amount: string) => `Pay ${amount}`,
  paidTitle: 'Payment received',
  paidLead: 'Your order has been sent to the kitchen.',
  emptyCart: 'Your cart is empty. Add meals to get started.',
  browseMeals: 'Browse Meals',
  plan: 'Plan',
  meals: 'Meals',
  deliveryAddress: 'Delivery address',
  schedule: 'Schedule',
  customer: 'Customer',
  orderReference: 'Order reference',
  status: 'Status',
  total: 'Total',
  amountDue: 'Amount due',
  amountPaid: 'Amount paid',
  fulfillment: 'Fulfillment',
  paymentMethod: 'Payment method',
  gcash: 'GCash',
  maya: 'Maya',
  card: 'Credit or debit card',
  notAvailablePay: 'Payment is available after Dietitian approval.',
} as const;

export const STANDARD_PLAN = {
  id: 'standard',
  label: 'Standard meal',
  description: 'One meal, ordered whenever you need it',
  priceLabel: formatPeso(STANDARD_MEAL_PRICE),
  perMealLabel: `${formatPeso(STANDARD_MEAL_PRICE)} per meal`,
};

export const CHECKOUT_PLANS = [
  STANDARD_PLAN,
  {
    id: 'weekly',
    label: 'Weekly',
    description: 'Order regularly with weekly savings',
    priceLabel: PLAN_PRICES.find((p) => p.id === 'weekly')?.priceLabel || '₱4,999',
    perMealLabel: undefined,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    description: 'Best for steady meal routines',
    priceLabel: PLAN_PRICES.find((p) => p.id === 'monthly')?.priceLabel || '₱27,899',
    perMealLabel: undefined,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    description: 'Maximum savings for long-term plans',
    priceLabel: PLAN_PRICES.find((p) => p.id === 'yearly')?.priceLabel || '₱327,999',
    perMealLabel: undefined,
  },
] as const;

export type CheckoutPlanId = (typeof CHECKOUT_PLANS)[number]['id'];
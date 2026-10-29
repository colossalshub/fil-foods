/** @typedef {{ id: string, question: string, answer: string }} FaqItem */
/** @typedef {{ id: string, title: string, items: FaqItem[] }} FaqGroup */

export const FAQ_NO_MATCH = 'No answers found.';

/** Mutable contact block so tests can override the phone number. */
export const contactInfo = {
  phone: '0917-555-0123',
  email: 'support@mealservice.ph',
  hours: 'Mon-Sat 7:00 AM-6:00 PM',
};

export const ORDER_STEPS = [
  { step: 1, title: 'Choose meals' },
  { step: 2, title: 'Set quantity' },
  { step: 3, title: 'Pick delivery or pickup' },
  { step: 4, title: 'Review' },
  { step: 5, title: 'Confirm' },
];

/** @type {{ id: string, title: string, description: string, screenshotLabel?: string }[]} */
export const GUIDE_STEPS = [
  {
    id: 'home',
    title: 'Home: quick overview',
    description: 'Open Home for highlights and shortcuts into Meals, Orders, and Account.',
    screenshotLabel: 'Screenshot reference: Home screen',
  },
  {
    id: 'menu',
    title: 'Menu: browse and search meals',
    description: 'Open Meals to scroll the menu, search by name, and filter by diet or allergens.',
    screenshotLabel: 'Screenshot reference: Meals list with search bar',
  },
  {
    id: 'orders',
    title: 'Orders: current and previous orders',
    description: 'Open Orders to see active deliveries, order history, and status updates.',
  },
  {
    id: 'account',
    title: 'Account: profile and dietary information',
    description: 'Open Account to update contact details, allergies, dietary restrictions, and health information.',
  },
  {
    id: 'help',
    title: 'Help: guides and support',
    description: 'Open Help for step-by-step guides, frequently asked questions, and how to reach support.',
  },
];

/** @type {FaqGroup[]} */
export const FAQ_GROUPS = [
  {
    id: 'account',
    title: 'Account',
    items: [
      {
        id: 'account-create',
        question: 'How do I create an account?',
        answer: 'Tap Create an account on the login screen, fill in your details, verify your contact method, then complete your profile.',
      },
      {
        id: 'account-password',
        question: 'How do I reset my password?',
        answer: 'On the login screen tap Forgot password?, enter your username, verify the code, then set a new password.',
      },
      {
        id: 'account-google',
        question: 'Can I sign in with Google?',
        answer: 'Yes. Use Continue with Google on login or create account. You can link Google to an existing username and password account.',
      },
    ],
  },
  {
    id: 'ordering',
    title: 'Ordering',
    items: [
      {
        id: 'ordering-place',
        question: 'How do I place an order?',
        answer: 'Browse Meals, choose items and quantities, review your cart from Meals, then confirm payment and delivery details.',
      },
      {
        id: 'ordering-change',
        question: 'Can I change my order after confirming?',
        answer: 'Contact support as soon as possible. Changes depend on kitchen timing and order status.',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery',
    items: [
      {
        id: 'delivery-window',
        question: 'When will my order arrive?',
        answer: 'Delivery windows appear at checkout. Orders shows updates once the kitchen dispatches your order.',
      },
      {
        id: 'delivery-pickup',
        question: 'How does pickup work?',
        answer: 'Choose pickup at checkout, then collect at the listed location when your order is ready.',
      },
    ],
  },
  {
    id: 'health',
    title: 'Health Information',
    items: [
      {
        id: 'health-allergies',
        question: 'Why do you ask for allergies and health conditions?',
        answer: 'We use your profile to flag meals that may conflict with recorded allergies or dietary needs.',
      },
      {
        id: 'health-update',
        question: 'How do I update my dietary information?',
        answer: 'Open Account and edit Health conditions, Dietary restrictions, or Food allergies. Save after each change.',
      },
    ],
  },
];

export const FAQ_GROUP_TITLES = FAQ_GROUPS.map((g) => g.title);

/** @returns {FaqItem[]} */
export function allFaqItems() {
  return FAQ_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })));
}

/**
 * @param {string} query
 * @returns {FaqItem[]}
 */
export function searchFaq(query) {
  const needle = String(query || '').trim().toLowerCase();
  const items = allFaqItems();
  if (!needle) return items;
  return items.filter(
    (item) => item.question.toLowerCase().includes(needle) || item.answer.toLowerCase().includes(needle),
  );
}

/**
 * @param {string} phone
 * @returns {string}
 */
export function buildTelHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return `tel:${digits}`;
}

export function getContactPhone() {
  return contactInfo.phone;
}

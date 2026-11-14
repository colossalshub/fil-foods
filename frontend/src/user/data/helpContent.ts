interface FaqItem {
  id: string;
  question: string;
  answer: string;
  group?: string;
}

interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

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

export type GuideStepId = 'menu' | 'order' | 'tracking' | 'profile' | 'help';

export const GUIDE_STEPS: Array<{
  id: GuideStepId;
  title: string;
  description: string;
  overviewTitle: string;
  overviewBlurb: string;
  screenshotLabel: string;
}> = [
  {
    id: 'menu',
    title: 'Menu: browse and search meals',
    description: 'Open Meals to scroll the menu, search by name, and filter by diet or allergens.',
    overviewTitle: 'Menu',
    overviewBlurb: 'Browse and search meals.',
    screenshotLabel: 'Screen reference: Meals list with search bar',
  },
  {
    id: 'order',
    title: 'Order: choose meals and confirm your order',
    description: 'Open Order to choose one meal for each meal time, then delivery or pickup.',
    overviewTitle: 'Order',
    overviewBlurb: 'Choose meals and confirm your order.',
    screenshotLabel: 'Screen reference: Order screen',
  },
  {
    id: 'tracking',
    title: 'Tracking: follow your order status',
    description: 'Open an order to follow its status from review through delivery or pickup.',
    overviewTitle: 'Tracking',
    overviewBlurb: 'Follow your order status.',
    screenshotLabel: 'Screen reference: Tracking screen',
  },
  {
    id: 'profile',
    title: 'Profile: keep your details up to date',
    description: 'Open Account to update contact details, allergies, dietary restrictions, and health information.',
    overviewTitle: 'Profile',
    overviewBlurb: 'Keep your details up to date.',
    screenshotLabel: 'Screen reference: Account screen',
  },
  {
    id: 'help',
    title: 'Help: find answers and send feedback',
    description: 'Open Help for step-by-step guides, frequently asked questions, and how to reach support.',
    overviewTitle: 'Help',
    overviewBlurb: 'Find answers and send feedback.',
    screenshotLabel: 'Screen reference: Help screen',
  },
];

export const FAQ_GROUPS: FaqGroup[] = [
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

export function allFaqItems() {
  return FAQ_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })));
}

function normalizeFaqQuery(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function faqWords(value: string) {
  return normalizeFaqQuery(value).split(/[^a-z0-9]+/).filter(Boolean);
}

function faqDistance(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dist[i][0] = i;
  for (let j = 0; j < cols; j += 1) dist[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  return dist[a.length][b.length];
}

function faqWordMatches(queryWord: string, text: string) {
  const budget = queryWord.length >= 6 ? 2 : 1;
  return faqWords(text).some((word) => {
    if (word === queryWord) return true;
    if (queryWord.length < 3) return false;
    if (Math.abs(word.length - queryWord.length) > budget) return false;
    return faqDistance(queryWord, word) <= budget;
  });
}

export function searchFaq(query: string) {
  const needle = normalizeFaqQuery(query);
  const items = allFaqItems();
  if (needle.length < 2) return items;
  const queryWords = faqWords(needle);
  const scored = items.map((item) => {
    const haystack = `${item.question} ${item.answer}`;
    const exact = normalizeFaqQuery(haystack).includes(needle);
    const fuzzy = queryWords.every((word) => faqWordMatches(word, haystack));
    return { item, exact, fuzzy };
  }).filter((row) => row.exact || row.fuzzy);
  scored.sort((a, b) => Number(b.exact) - Number(a.exact));
  return scored.map((row) => row.item);
}

export function buildTelHref(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  return `tel:${digits}`;
}

export function getContactPhone() {
  return contactInfo.phone;
}

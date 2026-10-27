import { getSetting } from '../settings/settings.service.js';

const ALL = ['cash', 'card', 'upi', 'bank'];
const KEY = { cash: 'payment.allowCash', card: 'payment.allowCard', upi: 'payment.allowUpi', bank: 'payment.allowBank' };

/** How the school wants payments taken; edited under Settings → Payments. */
export const PAYMENT_METHODS = {
  all: ALL,
  async enabled() {
    const on = [];
    for (const method of ALL) if (await getSetting(KEY[method])) on.push(method);
    return on;
  },
  partialAllowed: async () => Boolean(await getSetting('payment.allowPartial')),
  receiptPrefix: async () => getSetting('payment.receiptPrefix'),
};

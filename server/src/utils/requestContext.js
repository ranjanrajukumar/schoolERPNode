import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Who is making the current request, available anywhere below it without passing it along. The audit columns (authadd, authedit,
 * authdel) on every table are filled from this. Set once the user is known (see requireAuth); empty for public and system work.
 */
const store = new AsyncLocalStorage();

export const setCurrentUser = (name) => store.enterWith({ user: name });
export const currentUser = () => store.getStore()?.user ?? 'system';

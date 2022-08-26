import User  from '@/models/User';
import Admin from '@/models/Admin';

import { SerializeOptions } from '@/stores/utils/cookie';

/**
 * The minimal AuthStore interface.
 *
 * @deprecated
 * This interface predates the abstract BaseAuthStore class
 * and it is kept mainly for backward compatibility.
 *
 * New AuthStore implementations should extend directly the
 * BaseAuthStore abstract class.
 */
export type AuthStore = {
    /**
     * Retrieves the stored token (if any).
     */
    readonly token: string

    /**
     * Retrieves the stored model data (if any).
     */
    readonly model: User|Admin|null

    /**
     * Checks if the store has valid (aka. existing and unexpired) token.
     */
    readonly isValid: boolean

    /**
     * Saves new token and model data in the auth store.
     */
    save(token: string, model: User|Admin|null): void

    /**
     * Removes the stored token and model data form the auth store.
     */
    clear(): void

    /**
     * Parses the provided cookie string and updates the store state
     * with the cookie's token and model data.
     */
    loadFromCookie(cookie: string, key?: string): void

    /**
     * Exports the current store state as cookie string.
     */
    exportToCookie(options?: SerializeOptions, key?: string): string
}

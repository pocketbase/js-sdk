import User  from '@/models/User';
import Admin from '@/models/Admin';

export type AuthStore = {
    /**
     * Retrieves the stored token (if any).
     */
    readonly token: string

    /**
     * Retrieves the stored model data (if any).
     */
    readonly model: User|Admin|{}

    /**
     * Checks if the store has valid (aka. existing and unexpired) token.
     */
    readonly isValid: boolean

    /**
     * Saves new token and model data in the auth store.
     */
    save(token: string, model: User|Admin|{}): void

    /**
     * Removes the stored token and model data form the auth store.
     */
    clear(): void
}

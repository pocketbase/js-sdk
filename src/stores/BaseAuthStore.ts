import { AuthStore } from '@/stores/utils/AuthStore';
import JWT           from '@/stores/utils/JWT';
import User          from '@/models/User';
import Admin         from '@/models/Admin';

type onChangeFunc = (token: string, model: User | Admin | {}) => void;

/**
 * Base AuthStore class that is intented to be extended by all other
 * PocketBase AuthStore implementations.
 */
export default abstract class BaseAuthStore implements AuthStore {
    protected baseToken: string = '';
    protected baseModel: User | Admin | {} = {};

    private _onChangeCallbacks: Array<onChangeFunc> = [];

    /**
     * Retrieves the stored token (if any).
     */
    get token(): string {
        return this.baseToken;
    }

    /**
     * Retrieves the stored model data (if any).
     */
    get model(): User | Admin | {} {
        return this.baseModel;
    }

    /**
     * Checks if the store has valid (aka. existing and unexpired) token.
     */
    get isValid(): boolean {
        return !JWT.isExpired(this.token);
    }

    /**
     * Saves the provided new token and model data in the auth store.
     */
    save(token: string, model: User | Admin | {}): void {
        this.baseToken = token;
        this.baseModel = model;
        this.triggerChange();
    }

    /**
     * Removes the stored token and model data form the auth store.
     */
    clear(): void {
        this.triggerChange();
    }

    /**
     * Register a callback function that will be called on store change.
     *
     * Returns a removal function that you could call to "unsubscibe" from the changes.
     */
    onChange(callback: () => void): () => void {
        this._onChangeCallbacks.push(callback);

        return () => {
            for (let i = this._onChangeCallbacks.length - 1; i >= 0; i--) {
                if (this._onChangeCallbacks[i] == callback) {
                    delete this._onChangeCallbacks[i];    // removes the function reference
                    this._onChangeCallbacks.splice(i, 1); // reindex the array
                    return;
                }
            }
        }
    }

    protected triggerChange(): void {
        for (const callback of this._onChangeCallbacks) {
            callback && callback(this.token, this.model);
        }
    }
}

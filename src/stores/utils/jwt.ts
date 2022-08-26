let atobPolyfill: Function;
if (typeof atob === 'function') {
    atobPolyfill = atob
} else {
    atobPolyfill = (a: any) => Buffer.from(a, 'base64').toString('binary');
}

/**
 * Returns JWT token's payload data.
 */
export function getTokenPayload(token: string): { [key: string]: any } {
    if (token) {
        try {

            let base64 = decodeURIComponent(atobPolyfill(token.split('.')[1]).split('').map(function (c: string) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(base64) || {};
        } catch (e) {
        }
    }

    return {};
}

/**
 * Checks whether a JWT token is expired or not.
 * Tokens without `exp` payload key are considered valid.
 * Tokens with empty payload (eg. invalid token strings) are considered expired.
 *
 * @param token The token to check.
 * @param [expirationThreshold] Time in seconds that will be subtracted from the token `exp` property.
 */
export function isTokenExpired(token: string, expirationThreshold = 0): boolean {
    let payload = getTokenPayload(token);

    if (
        Object.keys(payload).length > 0 &&
        (!payload.exp || (payload.exp - expirationThreshold) > (Date.now() / 1000))
    ) {
        return false;
    }

    return true;
}

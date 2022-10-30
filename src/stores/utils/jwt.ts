let atobPolyfill: Function;
if (typeof atob === 'function') {
    atobPolyfill = atob
} else {
    /**
     * The code was extracted from:
     * https://github.com/davidchambers/Base64.js
     */
    atobPolyfill = (input: any) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

        let str = String(input).replace(/=+$/, "");
        if (str.length % 4 == 1) {
            throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
        }

        for (
            // initialize result and counters
            var bc = 0, bs, buffer, idx = 0, output = "";
            // get next character
            (buffer = str.charAt(idx++));
            // character found in table? initialize bit storage and add its ascii value;
            ~buffer &&
            ((bs = bc % 4 ? (bs as any) * 64 + buffer : buffer),
                // and if not first of each 4 characters,
                // convert the first 8 bits to one ascii character
                bc++ % 4) ?
            (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) :
            0
        ) {
            // try to find character in table (0-63, not found => -1)
            buffer = chars.indexOf(buffer);
        }

        return output;
    };
}

/**
 * Returns JWT token's payload data.
 */
export function getTokenPayload(token: string): { [key: string]: any } {
    if (token) {
        try {
            const encodedPayload = decodeURIComponent(atobPolyfill(token.split('.')[1]).split('').map(function (c: string) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(encodedPayload) || {};
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

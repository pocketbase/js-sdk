/**
 * -------------------------------------------------------------------
 * Simple cookie parse and serialize utilities mostly based on the
 * node module https://github.com/jshttp/cookie.
 * -------------------------------------------------------------------
 */

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

export interface ParseOptions{
    decode?: (val: string) => string,
}

/**
* Parses the given cookie header string into an object
* The object has the various cookies as keys(names) => values
*/
export function cookieParse(str: string, options?: ParseOptions): { [key: string]: any }  {
    const result: { [key: string]: any } = {};

    if (typeof str !== 'string') {
        return result;
    }

    const opt    = Object.assign({}, options || {});
    const decode = opt.decode || defaultDecode;

    let index = 0;
    while (index < str.length) {
        const eqIdx = str.indexOf('=', index);

        // no more cookie pairs
        if (eqIdx === -1) {
            break;
        }

        let endIdx = str.indexOf(';', index);

        if (endIdx === -1) {
            endIdx = str.length;
        } else if (endIdx < eqIdx) {
            // backtrack on prior semicolon
            index = str.lastIndexOf(';', eqIdx - 1) + 1;
            continue;
        }

        const key = str.slice(index, eqIdx).trim();

        // only assign once
        if (undefined === result[key]) {
            let val = str.slice(eqIdx + 1, endIdx).trim();

            // quoted values
            if (val.charCodeAt(0) === 0x22) {
                val = val.slice(1, -1);
            }

            try {
                result[key] = decode(val);
            } catch (_) {
                result[key] = val; // no decoding
            }
        }

        index = endIdx + 1;
    }

    return result;
};

export interface SerializeOptions{
    encode?:   (val: string | number | boolean) => string,
    maxAge?:   number,
    domain?:   string,
    path?:     string,
    expires?:  Date,
    httpOnly?: boolean,
    secure?:   boolean,
    priority?: string,
    sameSite?: boolean|string,
}

/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * ```js
 * cookieSerialize('foo', 'bar', { httpOnly: true }) // "foo=bar; httpOnly"
 * ```
 */
export function cookieSerialize(name: string, val: string, options?: SerializeOptions): string {
    const opt    = Object.assign({}, options || {});
    const encode = opt.encode || defaultEncode;

    if (!fieldContentRegExp.test(name)) {
        throw new TypeError('argument name is invalid');
    }

    const value = encode(val);

    if (value && !fieldContentRegExp.test(value)) {
        throw new TypeError('argument val is invalid');
    }

    let result = name + '=' + value;

    if (opt.maxAge != null) {
        const maxAge = opt.maxAge - 0;

        if (isNaN(maxAge) || !isFinite(maxAge)) {
            throw new TypeError('option maxAge is invalid');
        }

        result += '; Max-Age=' + Math.floor(maxAge);
    }

    if (opt.domain) {
        if (!fieldContentRegExp.test(opt.domain)) {
            throw new TypeError('option domain is invalid');
        }

        result += '; Domain=' + opt.domain;
    }

    if (opt.path) {
        if (!fieldContentRegExp.test(opt.path)) {
            throw new TypeError('option path is invalid');
        }

        result += '; Path=' + opt.path;
    }

    if (opt.expires) {
        if (!isDate(opt.expires) || isNaN(opt.expires.valueOf())) {
            throw new TypeError('option expires is invalid');
        }

        result += '; Expires=' + opt.expires.toUTCString();
    }

    if (opt.httpOnly) {
        result += '; HttpOnly';
    }

    if (opt.secure) {
        result += '; Secure';
    }

    if (opt.priority) {
        const priority = typeof opt.priority === 'string' ? opt.priority.toLowerCase() : opt.priority;

        switch (priority) {
            case 'low':
                result += '; Priority=Low';
                break;
            case 'medium':
                result += '; Priority=Medium';
                break;
            case 'high':
                result += '; Priority=High';
                break;
            default:
                throw new TypeError('option priority is invalid');
        }
    }

    if (opt.sameSite) {
        const sameSite = typeof opt.sameSite === 'string' ? opt.sameSite.toLowerCase() : opt.sameSite;

        switch (sameSite) {
            case true:
                result += '; SameSite=Strict';
                break;
            case 'lax':
                result += '; SameSite=Lax';
                break;
            case 'strict':
                result += '; SameSite=Strict';
                break;
            case 'none':
                result += '; SameSite=None';
                break;
            default:
                throw new TypeError('option sameSite is invalid');
        }
    }

    return result;
};

/**
 * Default URL-decode string value function.
 * Optimized to skip native call when no `%`.
 */
function defaultDecode(val: string): string {
    return val.indexOf('%') !== -1
        ? decodeURIComponent(val)
        : val;
}

/**
 * Default URL-encode value function.
 */
function defaultEncode(val: string | number | boolean): string {
    return encodeURIComponent(val);
}

/**
 * Determines if value is a Date.
 */
function isDate(val: any): boolean {
    return (
        Object.prototype.toString.call(val) === '[object Date]' ||
        val instanceof Date
    );
}

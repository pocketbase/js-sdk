import BaseModel from '@/models/utils/BaseModel';

export default class LogRequest extends BaseModel {
    url!:       string;
    method!:    string;
    status!:    number;
    auth!:      string;
    remoteIp!:  string;
    userIp!:    string;
    referer!:   string;
    userAgent!: string;
    meta!:      { [key: string]: any };

    /**
     * @inheritdoc
     */
    load(data: { [key: string]: any }) {
        super.load(data);

        // fallback to the ip field for backward compatibility
        data.remoteIp = data.remoteIp || data.ip;

        this.url       = typeof data.url       === 'string' ? data.url       : '';
        this.method    = typeof data.method    === 'string' ? data.method    : 'GET';
        this.status    = typeof data.status    === 'number' ? data.status    : 200;
        this.auth      = typeof data.auth      === 'string' ? data.auth      : 'guest';
        this.remoteIp  = typeof data.remoteIp  === 'string' ? data.remoteIp  : '';
        this.userIp    = typeof data.userIp    === 'string' ? data.userIp    : '';
        this.referer   = typeof data.referer   === 'string' ? data.referer   : '';
        this.userAgent = typeof data.userAgent === 'string' ? data.userAgent : '';
        this.meta      = typeof data.meta === 'object' && data.meta !== null ? data.meta : {};
    }
}

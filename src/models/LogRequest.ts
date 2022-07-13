import BaseModel from '@/models/utils/BaseModel';

export default class LogRequest extends BaseModel {
    url!:       string;
    method!:    string;
    status!:    number;
    auth!:      string;
    ip!:        string;
    referer!:   string;
    userAgent!: string;
    meta!:      null|{ [key: string]: any };

    /**
     * @inheritdoc
     */
    load(data: { [key: string]: any }) {
        super.load(data);

        this.url       = typeof data.url === 'string' ? data.url : '';
        this.method    = typeof data.method === 'string' ? data.method : 'GET';
        this.status    = typeof data.status === 'number' ? data.status : 200;
        this.auth      = typeof data.auth === 'string' ? data.auth : 'guest';
        this.ip        = typeof data.ip === 'string' ? data.ip : '';
        this.referer   = typeof data.referer === 'string' ? data.referer : '';
        this.userAgent = typeof data.userAgent === 'string' ? data.userAgent : '';
        this.meta      = typeof data.meta === 'object' && data.meta !== null ? data.meta : {};
    }
}

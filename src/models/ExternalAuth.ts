import BaseModel from '@/models/utils/BaseModel';

export default class ExternalAuth extends BaseModel {
    userId!:     string;
    provider!:   string;
    providerId!: string;

    /**
     * @inheritdoc
     */
    load(data: { [key: string]: any }) {
        super.load(data);

        this.userId     = typeof data.userId === 'string'     ? data.userId     : '';
        this.provider   = typeof data.provider === 'string'   ? data.provider   : '';
        this.providerId = typeof data.providerId === 'string' ? data.providerId : '';
    }
}

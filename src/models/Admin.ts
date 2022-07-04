import BaseModel from '@/models/utils/BaseModel';

export default class Admin extends BaseModel {
    avatar!:          number;
    email!:           string;
    lastResetSentAt!: string;

    /**
     * @inheritdoc
     */
    load(data: { [key: string]: any }) {
        super.load(data);

        this.avatar = typeof data.avatar === 'number' ? data.avatar : 0;
        this.email  = typeof data.email  === 'string' ? data.email  : '';
        this.lastResetSentAt = typeof data.lastResetSentAt === 'string' ? data.lastResetSentAt : '';
    }
}

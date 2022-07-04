import BaseModel from '@/models/utils/BaseModel';
import Record    from '@/models/Record';

export default class User extends BaseModel {
    email!:                  string;
    verified!:               boolean;
    lastResetSentAt!:        string;
    lastVerificationSentAt!: string;
    profile!:                null|Record;

    /**
     * @inheritdoc
     */
    load(data: { [key: string]: any }) {
        super.load(data);

        this.email = typeof data.email === 'string' ? data.email : '';
        this.verified = !!data.verified;
        this.lastResetSentAt = typeof data.lastResetSentAt === 'string' ? data.lastResetSentAt : '';
        this.lastVerificationSentAt = typeof data.lastVerificationSentAt === 'string' ? data.lastVerificationSentAt : '';
        this.profile = data.profile ? new Record(data.profile) : null;
    }
}

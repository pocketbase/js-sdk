import BaseModel from './BaseModel';

export default class ListResult<M = BaseModel> {
    page!:       number;
    perPage!:    number;
    totalItems!: number;
    totalPages!: number;
    items!:      Array<M>;

    constructor(
        page: number,
        perPage: number,
        totalItems: number,
        totalPages: number,
        items: Array<M>,
    ) {
        this.page       = page > 0 ? page : 1;
        this.perPage    = perPage >= 0 ? perPage : 0;
        this.totalItems = totalItems >= 0 ? totalItems : 0;
        this.totalPages = totalPages >= 0 ? totalPages : 0;
        this.items      = items || [];
    }
}

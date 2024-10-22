class FixedLengthList<T> {
    private items: T[] = [];
    private readonly maxLength: number;

    constructor(maxLength: number) {
        this.maxLength = maxLength;
    }

    push(item: T): void {
        this.items.push(item);
        if (this.items.length > this.maxLength) {
            this.items.shift();
        }
    }

    getItems(): T[] {
        return this.items;
    }

    clear(): void {
        this.items = [];
    }
}

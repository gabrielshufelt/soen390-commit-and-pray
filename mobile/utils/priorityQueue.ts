export class PriorityQueue<T> {
  private values: { val: T; priority: number }[] = [];

  enqueue(val: T, priority: number) {
    this.values.push({ val, priority });
    this.sort();
  }

  dequeue(): T | undefined {
    return this.values.shift()?.val;
  }

  isEmpty() {
    return this.values.length === 0;
  }

  private sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}

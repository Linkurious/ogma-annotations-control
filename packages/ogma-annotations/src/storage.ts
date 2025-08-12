import { Annotation, AnnotationCollection, Id } from "./types";

export class Storage {
  private elements: Annotation[] = [];
  private elementMap: Map<Id, Annotation> = new Map();

  public add(element: Annotation): void {
    this.elementMap.set(element.id, element);
    this.elements.push(element);
  }

  public getById(id: Id): Annotation | undefined {
    return this.elementMap.get(id);
  }

  public getAll(): Annotation[] {
    return this.elements;
  }

  public clear(): void {
    this.elements = [];
    this.elementMap.clear();
  }

  public remove(id: Id): void {
    const index = this.elements.findIndex((el) => el.id === id);
    if (index !== -1) {
      this.elements.splice(index, 1);
      this.elementMap.delete(id);
    }
  }

  public getCollection(): AnnotationCollection {
    return {
      type: "FeatureCollection",
      features: this.elements
    };
  }

  public createCollection<A extends Annotation>() {
    return new SubCollection<A>(this);
  }

  get length(): number {
    return this.elements.length;
  }
}

export class SubCollection<T extends Annotation> extends Array<T> {
  constructor(private storage: Storage) {
    super();
  }

  public push(element: T) {
    this.storage.add(element);
    return super.push(element);
  }

  public getById(id: Id): T | undefined {
    return this.storage.getById(id) as T | undefined;
  }

  public remove(id: Id): void {
    this.storage.remove(id);
    const index = this.findIndex((el) => el.id === id);
    if (index !== -1) this.splice(index, 1);
  }
}

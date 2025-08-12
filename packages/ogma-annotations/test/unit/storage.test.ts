import { describe, it, assert } from "vitest";
import { Storage } from "../../src/storage";
import { Annotation } from "../../src/types";

describe("Storage", () => {
  it("should add an element", () => {
    const storage = new Storage();
    const element = { id: "1", properties: {}, geometry: {} };
    storage.add(element as Annotation);
    const retrieved = storage.getById("1");
    assert.equal(retrieved, element as Annotation, "Element found in storage");
    assert.strictEqual(retrieved!.id, "1", "Element ID mismatch");
  });

  it("should remove an element", () => {
    const storage = new Storage();
    const element = { id: "1", properties: {}, geometry: {} };
    storage.add(element as Annotation);
    storage.remove("1");
    const retrieved = storage.getById("1");
    assert.isUndefined(retrieved, "Element should have been removed");
  });

  it("should update an element", () => {
    const storage = new Storage();
    const element = { id: "1", properties: {}, geometry: {} };
    storage.add(element as Annotation);
    Object.assign(element.properties, {
      updated: true
    });
    const retrieved = storage.getById("1");
    assert.isTrue(
      // @ts-expect-error TypeScript doesn't know about properties
      retrieved?.properties.updated,
      "Element should have been updated"
    );
  });

  it("should get elements by id", () => {
    const storage = new Storage();
    const element1 = { id: "1", properties: {}, geometry: {} } as Annotation;
    const element2 = { id: "2", properties: {}, geometry: {} } as Annotation;
    storage.add(element1);
    storage.add(element2);

    const retrieved1 = storage.getById("1");
    const retrieved2 = storage.getById("2");
    const retrieved3 = storage.getById("3"); // Non-existent ID

    assert.equal(retrieved1, element1, "Element 1 found in storage");
    assert.equal(retrieved2, element2, "Element 2 found in storage");
    assert.isUndefined(retrieved3, "Element 3 should not be found in storage");
  });

  it("should clear all elements", () => {
    const storage = new Storage();
    const element1 = { id: "1", properties: {}, geometry: {} } as Annotation;
    const element2 = { id: "2", properties: {}, geometry: {} } as Annotation;
    storage.add(element1);
    storage.add(element2);
    storage.clear();
    assert.equal(storage.length, 0, "Storage should be empty after clear");
  });

  it("should return all elements", () => {
    const storage = new Storage();
    const element1 = { id: "1", properties: {}, geometry: {} } as Annotation;
    const element2 = { id: "2", properties: {}, geometry: {} } as Annotation;
    storage.add(element1);
    storage.add(element2);
    const allElements = storage.getAll();
    assert.lengthOf(allElements, 2, "Should return all elements in storage");
    assert.include(allElements, element1, "Element 1 should be in the list");
    assert.include(allElements, element2, "Element 2 should be in the list");
  });

  it("should create a sub-collection", () => {
    const storage = new Storage();
    const element1 = { id: "1", properties: {}, geometry: {} } as Annotation;
    const element2 = { id: "2", properties: {}, geometry: {} } as Annotation;
    const element3 = { id: "3", properties: {}, geometry: {} } as Annotation;
    const element4 = { id: "4", properties: {}, geometry: {} } as Annotation;
    storage.add(element1);
    storage.add(element2);

    const subCollection = storage.createCollection<Annotation>();
    subCollection.push(element3);
    subCollection.push(element4);

    assert.lengthOf(
      subCollection,
      2,
      "Sub-collection should contain two elements"
    );
    assert.include(
      subCollection,
      element3,
      "Element 3 should be in the sub-collection"
    );
    assert.include(
      subCollection,
      element4,
      "Element 4 should be in the sub-collection"
    );

    assert.notInclude(
      subCollection,
      storage.getById("1"),
      "Sub-collection should not contain elements from main storage"
    );
    assert.notInclude(
      subCollection,
      storage.getById("2"),
      "Sub-collection should not contain elements from main storage"
    );

    assert.isDefined(
      storage.getById("3"),
      "Elements should be in the main storage"
    );
    assert.isDefined(
      storage.getById("4"),
      "Elements should be in the main storage"
    );
  });

  it("should remove an element from sub-collection", () => {
    const storage = new Storage();
    const element1 = { id: "1", properties: {}, geometry: {} } as Annotation;
    const element2 = { id: "2", properties: {}, geometry: {} } as Annotation;
    storage.add(element1);
    storage.add(element2);

    const subCollection = storage.createCollection<Annotation>();
    subCollection.push(element1);
    subCollection.push(element2);

    subCollection.remove("1");
    assert.lengthOf(
      subCollection,
      1,
      "Sub-collection should contain one element"
    );
    assert.notInclude(subCollection, element1, "Element 1 should be removed");
    assert.include(
      subCollection,
      element2,
      "Element 2 should still be present"
    );

    assert.isUndefined(
      storage.getById("1"),
      "Element 1 should be removed from main storage"
    );
  });
});

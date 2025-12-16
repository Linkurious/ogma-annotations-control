import { describe, it, expect, beforeEach } from "vitest";
import { createOgma } from "./utils";
import { Control, createText } from "../../src";

describe("Options Reactivity", () => {
  let control: Control;
  let ogma: ReturnType<typeof createOgma>;

  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma, {
      detectMargin: 5,
      minArrowHeight: 20,
      maxArrowHeight: 30
    });
  });

  describe("setOptions", () => {
    it("should update options in store", () => {
      const initialOptions = control["store"].getState().options;
      expect(initialOptions.detectMargin).toBe(5);
      expect(initialOptions.minArrowHeight).toBe(20);
      expect(initialOptions.maxArrowHeight).toBe(30);

      control.setOptions({
        detectMargin: 10,
        minArrowHeight: 15,
        maxArrowHeight: 40
      });

      const updatedOptions = control["store"].getState().options;
      expect(updatedOptions.detectMargin).toBe(10);
      expect(updatedOptions.minArrowHeight).toBe(15);
      expect(updatedOptions.maxArrowHeight).toBe(40);
    });

    it("should return updated options", () => {
      const result = control.setOptions({
        detectMargin: 15,
        textPlaceholder: "Custom placeholder"
      });

      expect(result.detectMargin).toBe(15);
      expect(result.textPlaceholder).toBe("Custom placeholder");
      // Other options should remain unchanged
      expect(result.showSendButton).toBe(true);
      expect(result.minArrowHeight).toBe(20);
    });

    it("should merge options, not replace them", () => {
      control.setOptions({ detectMargin: 10 });

      const options = control["store"].getState().options;
      expect(options.detectMargin).toBe(10);
      // Original options should still be there
      expect(options.showSendButton).toBe(true);
      expect(options.minArrowHeight).toBe(20);
      expect(options.magnetColor).toBe("#3e8");
    });

    it("should affect detection behavior", () => {
      // Add a text annotation at (100, 100) with width=50, height=30
      // Center point: (125, 115), bbox: [100, 100, 150, 130]
      const text = createText(100, 100, 50, 30, "Test");
      control.add(text);

      const interaction = control["interactions"];

      // Point at (154, 115) is 4px to the right of bbox edge (150)
      // With detectMargin = 5, this should be detected
      let result = interaction.detect(154, 115);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(text.id);

      // Now set detectMargin to 2 (tighter)
      control.setOptions({ detectMargin: 2 });

      // Same point (4px away) should now be outside detection range
      result = interaction.detect(154, 115);
      expect(result).toBeNull();

      // But a point within the new margin should still work
      result = interaction.detect(151, 115); // Only 1px away
      expect(result).not.toBeNull();
      expect(result?.id).toBe(text.id);
    });
  });

  describe("Initial options", () => {
    it("should use default options when none provided", () => {
      const defaultControl = new Control(ogma);
      const options = defaultControl["store"].getState().options;

      expect(options.detectMargin).toBe(2);
      expect(options.minArrowHeight).toBe(20);
      expect(options.maxArrowHeight).toBe(30);
      expect(options.showSendButton).toBe(true);
      expect(options.magnetColor).toBe("#3e8");
      expect(options.magnetRadius).toBe(10);
      expect(options.textPlaceholder).toBe("Type here");

      defaultControl.destroy();
    });

    it("should override defaults with provided options", () => {
      const customControl = new Control(ogma, {
        detectMargin: 20,
        showSendButton: false,
        textPlaceholder: "Enter text",
        magnetColor: "#ff0000"
      });

      const options = customControl["store"].getState().options;

      expect(options.detectMargin).toBe(20);
      expect(options.showSendButton).toBe(false);
      expect(options.textPlaceholder).toBe("Enter text");
      expect(options.magnetColor).toBe("#ff0000");
      // Unspecified options should use defaults
      expect(options.minArrowHeight).toBe(20);
      expect(options.magnetRadius).toBe(10);

      customControl.destroy();
    });
  });

  describe("Store as single source of truth", () => {
    it("should read all options from store", () => {
      const storeOptions = control["store"].getState().options;

      // Verify all expected options are in store
      expect(storeOptions).toHaveProperty("detectMargin");
      expect(storeOptions).toHaveProperty("showSendButton");
      expect(storeOptions).toHaveProperty("sendButtonIcon");
      expect(storeOptions).toHaveProperty("minArrowHeight");
      expect(storeOptions).toHaveProperty("maxArrowHeight");
      expect(storeOptions).toHaveProperty("magnetColor");
      expect(storeOptions).toHaveProperty("magnetRadius");
      expect(storeOptions).toHaveProperty("magnetHandleRadius");
      expect(storeOptions).toHaveProperty("textPlaceholder");
    });
  });
});

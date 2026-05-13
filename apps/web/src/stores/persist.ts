import { APackage } from "@/common/schema/pig/ts/pig-metaclasses";
import type { useHtmlStore } from "@/stores/cacheStore";
import type { Store } from "pinia";

type StoreWithHtmlArray = ReturnType<typeof useHtmlStore>['$state'];

export function setupPersistence(store: Store<string, StoreWithHtmlArray>) {
  const key = `pinia-${store.$id}`;

  // 1. Rehydration: Load from localStorage and update store
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const array = JSON.parse(saved);
      if (Array.isArray(array) && array.length > 0) {
        const xml = array.join('');
        const pkg = new APackage().setXML(xml);
        
        store.$patch({
          htmlArray: pkg.getHTML()
        });
        console.log("Persistence: Rehydrated store from localStorage");
      }
    } catch (err) {
      console.error("Persistence: Failed to rehydrate from localStorage", err);
    }
  }

  // 2. Subscription: Watch for changes and save to localStorage
  store.$subscribe((mutation, state) => {
    if (state.htmlArray?.length > 0) {
      localStorage.setItem(key, JSON.stringify(state.htmlArray));
      console.log("Persistence: Saved store to localStorage (mutation type: " + mutation.type + ")");

      console.log("Persistence: html array saved - ", localStorage.getItem(key));
    } else {
      localStorage.removeItem(key);
      console.log("Persistence: Removed store from localStorage");
    }
  });
}

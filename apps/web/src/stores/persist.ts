import type { usePackageCache } from "@/stores/packageCache";
import type { Store } from "pinia";

type StoreWithPackages = ReturnType<typeof usePackageCache>['$state'];

export function setupPersistence(store: Store<string, StoreWithPackages>) {
  const key = `pinia-${store.$id}`;

  // 1. Rehydration: Load from localStorage and update store
  const saved = localStorage.getItem(key);
  console.log("Persistence: Attempting to rehydrate store from localStorage");
  console.log("Persistence: Saved data in localStorage - ", saved);
  if (saved) {
    try {
      const array = JSON.parse(saved);
      if (Array.isArray(array) && array.length > 0) {
        store.$patch({
          packages: array
        });
        console.log("Persistence: Rehydrated store from localStorage");
      }
    } catch (err) {
      console.error("Persistence: Failed to rehydrate from localStorage", err);
    }
  }

  // 2. Subscription: Watch for changes and save to localStorage
  store.$subscribe((mutation, state) => {
    if (state.packages?.length > 0) {
      localStorage.setItem(key, JSON.stringify(state.packages));
      console.log("Persistence: Saved store to localStorage (mutation type: " + mutation.type + ")");

      console.log("Persistence: packages array saved - ", localStorage.getItem(key));
    } else {
      localStorage.removeItem(key);
      console.log("Persistence: Removed store from localStorage");
    }
  });
}

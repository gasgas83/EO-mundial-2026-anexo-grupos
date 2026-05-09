import { writable } from "svelte/store";

// Calculate initial values
const containerWidth = document.documentElement.clientWidth || window.innerWidth;
const isMobile = containerWidth < 730;

export const formatNumber = (number) => {
  return number.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const state = writable({
  isMobile,
  containerWidth,
  description: "title from sveltes store",
  counter: 0, // New counter variable
});

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    state.update(currentState => ({
      ...currentState,
      containerWidth: document.documentElement.clientWidth || window.innerWidth,
      isMobile: (document.documentElement.clientWidth || window.innerWidth) < 730,
    }));
  });
}
import { atom } from "nanostores";

export type Language = {
  name: string;
  native: string;
};

export type CyclingTextState = {
  currentIndex: number;
  isAnimating: boolean;
  intervalId: ReturnType<typeof setInterval> | null;
};

const initialState: CyclingTextState = {
  currentIndex: 0,
  isAnimating: false,
  intervalId: null,
};

export const $cyclingTextState = atom<CyclingTextState>(initialState);

export const languages: Language[] = [
  { name: "English", native: "English" },
  { name: "Urdu", native: "اردو" },
  { name: "Hindi", native: "हिंदी" },
  { name: "Arabic", native: "العربية" },
];

export const cyclingTextActions = {
  startCycling: (interval: number = 2800) => {
    const currentState = $cyclingTextState.get();

    // Clear any existing interval
    if (currentState.intervalId) {
      clearInterval(currentState.intervalId);
    }

    const intervalId = setInterval(() => {
      const state = $cyclingTextState.get();
      const nextIndex = (state.currentIndex + 1) % languages.length;

      $cyclingTextState.set({
        ...state,
        currentIndex: nextIndex,
        isAnimating: true,
      });

      // Reset animation flag with optimized timing
      setTimeout(() => {
        const currentState = $cyclingTextState.get();
        $cyclingTextState.set({
          ...currentState,
          isAnimating: false,
        });
      }, 500);
    }, interval);

    $cyclingTextState.set({
      ...currentState,
      intervalId,
    });
  },

  stopCycling: () => {
    const currentState = $cyclingTextState.get();
    if (currentState.intervalId) {
      clearInterval(currentState.intervalId);
      $cyclingTextState.set({
        ...currentState,
        intervalId: null,
      });
    }
  },

  reset: () => {
    const currentState = $cyclingTextState.get();
    if (currentState.intervalId) {
      clearInterval(currentState.intervalId);
    }
    $cyclingTextState.set(initialState);
  },
};

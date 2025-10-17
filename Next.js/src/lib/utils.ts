import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
export const debounce = (callback: (...args: any[]) => any, wait: number) => {
  let timeoutId: number | null = null;
  return (...args: any[]) => {
    timeoutId && window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};
export function debounce_leading(
  func: (...args: any[]) => void,
  timeout = 300,
) {
  let timer: string | number | NodeJS.Timeout | undefined;
  return function (this: any, ...args: any[]) {
    if (!timer) {
      func.apply(this, args);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
    }, timeout);
  };
}
/**
 * Binary search for a max value without knowing the exact value, only that it can be under or over
 * It dose not test every number but instead looks for 1,2,4,8,16,32,64,128,96,95 to figure out that
 * you thought about #96 from 0-infinity
 *
 * @example findFirstPositive(x => matchMedia(`(max-resolution: ${x}dpi)`).matches)
 * @author Jimmy Wärting
 * @see {@link https://stackoverflow.com/a/35941703/1008999}
 * @param {function} fn       The function to run the test on (should return truthy or falsy values)
 * @param {number}   start=1  Where to start looking from
 * @param {function} _        (private)
 * @returns {number}          Intenger
 */
function findFirstPositive(
  f: (x: number) => boolean,
  b: number = 1,
  d?: (e: number, g: number, c?: number) => number,
): number {
  const search =
    d ||
    ((e: number, g: number, c: number = 0): number => {
      if (g < e) return -1;
      c = (e + g) >>> 1;
      if (f(c)) {
        if (c === e || !f(c - 1)) return c;
        return search(e, c - 1);
      }
      return search(c + 1, g);
    });

  while (!f(b)) {
    b <<= 1;
  }
  return search(b >>> 1, b) | 0;
}

export const getDPI = () =>
  findFirstPositive(
    (x: any) => matchMedia(`(max-resolution: ${x}dpi)`).matches,
  );

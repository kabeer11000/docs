"use client";

import { useStore } from "@nanostores/react";
import { type DriveStep, driver } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { $auth } from "@/state/auth";
import { STEPS, type TourName, seenKey, tourForPath } from "./tour-config";

/** Resolves once every step target exists (or after the timeout), so the tour never points at nothing. */
function waitForTargets(steps: DriveStep[], timeoutMs = 10000): Promise<DriveStep[]> {
  const present = () => steps.filter((s) => typeof s.element === "string" && document.querySelector(s.element));
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const found = present();
      if (found.length === steps.length || Date.now() - started > timeoutMs) return resolve(found);
      setTimeout(tick, 250);
    };
    tick();
  });
}

async function runTour(tour: TourName, onDone?: () => void) {
  const steps = await waitForTargets(STEPS[tour]);
  if (steps.length === 0) return;
  const d = driver({
    steps,
    showProgress: steps.length > 1,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    allowClose: true,
    overlayOpacity: 0.35,
    stagePadding: 6,
    stageRadius: 8,
    popoverClass: "docs-tour",
    onDestroyed: () => onDone?.(),
  });
  d.drive();
}

/** First-run product tour. Shown once per user per surface; replay via the "docs:start-tour" window event. */
export function ProductTour() {
  const pathname = usePathname();
  const { user, isLoading } = useStore($auth);
  const userId = user?.id;

  useEffect(() => {
    const tour = tourForPath(pathname);
    if (!tour || !userId || isLoading) return;
    const key = seenKey(tour, userId);
    if (localStorage.getItem(key)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) runTour(tour, () => localStorage.setItem(key, "1"));
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname, userId, isLoading]);

  useEffect(() => {
    const replay = () => {
      const tour = tourForPath(pathname) ?? "home";
      if (tour === "home" && pathname !== "/home") {
        window.location.assign("/home?tour=1");
        return;
      }
      runTour(tour);
    };
    window.addEventListener("docs:start-tour", replay);
    if (pathname === "/home" && new URLSearchParams(window.location.search).get("tour") === "1") {
      window.history.replaceState(null, "", "/home");
      replay();
    }
    return () => window.removeEventListener("docs:start-tour", replay);
  }, [pathname]);

  return null;
}

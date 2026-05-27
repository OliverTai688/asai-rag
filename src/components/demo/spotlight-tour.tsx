"use client";

import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";
import { driver, type DriveStep, type Config } from "driver.js";

type SpotlightTourProps = {
  steps: DriveStep[];
  config?: Partial<Config>;
  delayMs?: number;
};

export function SpotlightTour({ steps, config, delayMs = 350 }: SpotlightTourProps) {
  const destroyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!steps.length) return;

    const timeout = setTimeout(() => {
      const driverObj = driver({
        animate: true,
        overlayOpacity: 0.78,
        overlayColor: "rgb(10, 35, 66)",
        stagePadding: 10,
        stageRadius: 10,
        allowClose: true,
        showProgress: true,
        progressText: "{{current}} / {{total}}",
        nextBtnText: "下一步 →",
        prevBtnText: "← 上一步",
        doneBtnText: "了解了",
        popoverClass: "asai-tour-popover",
        steps,
        ...config,
      });

      driverObj.drive();
      destroyRef.current = () => driverObj.destroy();
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      destroyRef.current?.();
      destroyRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

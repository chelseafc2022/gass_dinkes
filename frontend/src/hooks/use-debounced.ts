"use client";
import { useState, useEffect } from "react";
export function useDebounced<T>(value: T, delay = 350) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return result;
}

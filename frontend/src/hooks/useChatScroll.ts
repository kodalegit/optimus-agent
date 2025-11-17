"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useChatScroll(dependencies: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const userHasScrolledUpRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const element = containerRef.current;
    if (!element) return true;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceFromBottom < 100;
  }, []);

  const handleScroll = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    
    const nearBottom = isNearBottom();
    userHasScrolledUpRef.current = !nearBottom;
    setShowScrollButton(!nearBottom);
  }, [isNearBottom]);

  const scrollToBottom = useCallback((smooth = true) => {
    const element = containerRef.current;
    if (!element) return;
    
    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
    
    userHasScrolledUpRef.current = false;
    setShowScrollButton(false);
  }, []);

  // Auto-scroll when content changes
  useEffect(() => {
    if (userHasScrolledUpRef.current) return;
    
    const element = containerRef.current;
    if (!element) return;

    // Use instant scroll for auto-scroll to avoid race conditions
    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
  }, dependencies);

  return {
    containerRef,
    showScrollButton,
    scrollToBottom,
    handleScroll,
  };
}

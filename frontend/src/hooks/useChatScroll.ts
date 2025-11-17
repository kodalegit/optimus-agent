"use client";

import { useEffect, useRef, useState } from "react";

export function useChatScroll() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const autoScrollRef = useRef(true);

  const handleScroll = () => {
    const element = containerRef.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distanceFromBottom < 80;
    autoScrollRef.current = atBottom;
    setShowScrollButton(!atBottom);
  };

  const scrollToBottom = () => {
    const element = containerRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    autoScrollRef.current = true;
    setShowScrollButton(false);
  };

  const autoScrollOnChange = () => {
    if (!autoScrollRef.current) return;
    const element = containerRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  };

  return {
    containerRef,
    showScrollButton,
    scrollToBottom,
    handleScroll,
    autoScrollOnChange,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Opts = {
    sliver: number;
    minOpen: number;
    max: number;
    snapCloseAt: number;
    openDragDelta: number;
};

export function useRightSidebarResize(opts: Opts) {
    const [rightW, setRightW] = useState(320);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
    const [rightIsDragging, setRightIsDragging] = useState(false);

    // keep refs in sync for drag gesture continuity
    const rightOpenRef = useRef(isRightSidebarOpen);
    const rightWRef = useRef(rightW);

    useEffect(() => {
        rightOpenRef.current = isRightSidebarOpen;
    }, [isRightSidebarOpen]);

    useEffect(() => {
        rightWRef.current = rightW;
    }, [rightW]);

    const startRightResize = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setRightIsDragging(true);

            let mode: "closed" | "open" = rightOpenRef.current ? "open" : "closed";
            let baseX = e.clientX;
            let baseW = mode === "open" ? rightWRef.current : opts.sliver;

            function cleanup() {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
            }

            function snapClose() {
                setRightIsDragging(false);
                setIsRightSidebarOpen(false);
                cleanup();
            }

            function onMove(ev: MouseEvent) {
                const dx = ev.clientX - baseX;
                const proposed = baseW - dx; // drag left => wider

                if (mode === "open" && proposed < opts.snapCloseAt) {
                    snapClose();
                    return;
                }

                if (mode === "closed") {
                    if (proposed >= opts.sliver + opts.openDragDelta) {
                        mode = "open";
                        setIsRightSidebarOpen(true);

                        const next = Math.max(opts.minOpen, Math.min(opts.max, proposed));
                        setRightW(next);

                        baseX = ev.clientX;
                        baseW = next;
                    }
                    return;
                }

                const next = Math.max(opts.minOpen, Math.min(opts.max, proposed));
                setRightW(next);
            }

            function onUp() {
                cleanup();
                setRightIsDragging(false);
            }

            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
        },
        [opts]
    );

    return {
        rightW,
        setRightW,
        isRightSidebarOpen,
        setIsRightSidebarOpen,
        rightIsDragging,
        startRightResize,
    };
}

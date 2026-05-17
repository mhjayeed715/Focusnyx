"use client";
import { cn } from "@/lib/utils";
import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import React, { useEffect } from "react";

export const HeroHighlight = ({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);
  const [isAutoAnimating, setIsAutoAnimating] = React.useState(true);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    if (!currentTarget) return;
    setIsAutoAnimating(false);
    let { left, top } = currentTarget.getBoundingClientRect();

    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  function handleMouseLeave() {
    setIsAutoAnimating(true);
  }

  useEffect(() => {
    if (!isAutoAnimating) return;

    const container = document.querySelector('[data-hero-container]');
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    let animationFrame: NodeJS.Timeout;
    let time = 0;

    const animate = () => {
      time += 0.01;
      const x = Math.sin(time) * (width / 4) + width / 2;
      const y = Math.cos(time * 0.7) * (height / 4) + height / 2;

      mouseX.set(x);
      mouseY.set(y);

      animationFrame = setTimeout(animate, 16);
    };

    animate();

    return () => clearTimeout(animationFrame);
  }, [isAutoAnimating, mouseX, mouseY]);

  const dotPattern = (color: string) => ({
    backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
    backgroundSize: '16px 16px',
  });

  return (
    <div
      data-hero-container
      className={cn(
        "relative h-[40rem] flex items-center bg-white justify-center w-full group",
        containerClassName
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-70" 
        style={dotPattern('rgb(212 212 212)')}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          ...dotPattern('rgb(0, 107, 90)'),
          WebkitMaskImage: useMotionTemplate`
            radial-gradient(
              200px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
          maskImage: useMotionTemplate`
            radial-gradient(
              200px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
        }}
      />

      <div className={cn("relative z-20", className)}>{children}</div>
    </div>
  );
};

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.span
      animate={{
        backgroundSize: ["0% 100%", "100% 100%", "100% 100%", "0% 100%"],
      }}
      transition={{
        duration: 5,
        ease: "easeInOut",
        repeat: Infinity,
        times: [0, 0.3, 0.7, 1],
      }}
      style={{
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        display: "inline",
      }}
      className={cn(
        `relative inline-block pb-1 px-1 rounded-lg bg-gradient-to-r from-teal-300 to-teal-400`,
        className
      )}
    >
      {children}
    </motion.span>
  );
}

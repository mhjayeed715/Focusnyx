"use client";

import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          borderRadius: "16px",
          border: "2px solid #1E293B",
          boxShadow: "4px 4px 0 0 #1E293B",
          fontWeight: "700",
          fontSize: "14px",
        },
      }}
    />
  );
}

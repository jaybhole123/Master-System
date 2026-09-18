export function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.innerText = message;
  toast.style.position = "fixed";
  toast.style.top = "24px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%) translateY(-20px)";
  toast.style.backgroundColor = type === "success" ? "#10b981" : (type === "error" ? "#ef4444" : "#3b82f6");
  toast.style.color = "white";
  toast.style.padding = "12px 28px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 10px 25px -3px rgba(0, 0, 0, 0.2), 0 4px 10px -2px rgba(0, 0, 0, 0.1)";
  toast.style.fontFamily = "var(--font-sans, system-ui, sans-serif)";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "600";
  toast.style.zIndex = "9999";
  toast.style.opacity = "0";
  toast.style.transition = "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
  toast.style.whiteSpace = "nowrap";
  toast.style.pointerEvents = "none";

  document.body.appendChild(toast);

  // Trigger animation in (slide down from top)
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  // Remove after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-20px)";
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 400);
  }, 3500);
}

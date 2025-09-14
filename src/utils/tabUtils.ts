export const setActiveTab = (tabName: string) => {
  // This function would typically interact with a state management system
  // For now, we'll use a simple approach with custom events
  const event = new CustomEvent("tabChange", { detail: { activeTab: tabName } })
  window.dispatchEvent(event)

  // You might also want to store in localStorage for persistence
  localStorage.setItem("activeTab", tabName)
}

export const getActiveTab = (): string => {
  return localStorage.getItem("activeTab") || "student"
}

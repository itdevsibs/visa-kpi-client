import React from "react";
import Sidebar from "./Sidebar";

export default function ConditionalSidebar({ isSidebarOpen }) {
  // In a more complex app, this might conditionally return null based on route,
  // just like the reference app did. We'll wrap the actual Sidebar here for parity.
  return <Sidebar isSidebarOpen={isSidebarOpen} />;
}

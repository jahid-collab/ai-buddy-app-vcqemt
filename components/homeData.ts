export const modalDemos = [
  {
    title: "Chat with AI Buddy",
    description: "Start a new conversation with your AI companion",
    route: "/chat",
    color: "#5B7CFF",
  },
  {
    title: "Conversation History",
    description: "View and manage your past conversations",
    route: "/conversations",
    color: "#34C759",
  },
  {
    title: "Debug Info",
    description: "View backend configuration and test connection",
    route: "/debug-info",
    color: "#FF9500",
  },
  {
    title: "Standard Modal",
    description: "Full screen modal presentation",
    route: "/modal",
    color: "#007AFF",
  },
  {
    title: "Form Sheet",
    description: "Bottom sheet with detents and grabber",
    route: "/formsheet",
    color: "#34C759",
  },
  {
    title: "Transparent Modal",
    description: "Overlay without obscuring background",
    route: "/transparent-modal",
    color: "#FF9500",
  }
];

export type ModalDemo = typeof modalDemos[0];

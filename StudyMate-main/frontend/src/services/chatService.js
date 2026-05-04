
export const chatService = {
  sendMessage: async (message) => {
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      response: "That's a great question! Let me help you understand that concept better.",
      timestamp: new Date(),
    };
  },
  getHistory: async () => {
    return [];
  },
};


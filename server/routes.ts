import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // User initialization endpoint
  app.post("/api/user/init", async (req, res) => {
    try {
      const sessionId = req.body.session_id || randomUUID();
      
      let user = await storage.getUserBySessionId(sessionId);
      if (!user) {
        user = await storage.insertUser({
          sessionId,
          assistantId: null,
          threadId: null,
          selectedCategories: [],
          onboardingCompleted: false
        });
      }

      res.json({
        success: true,
        session_id: user.sessionId,
        onboarding_completed: user.onboardingCompleted,
        selected_categories: user.selectedCategories || []
      });
    } catch (error) {
      console.error('Error in /api/user/init:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User status endpoint
  app.get("/api/user/status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const user = await storage.getUserBySessionId(sessionId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        session_id: user.sessionId,
        onboarding_completed: user.onboardingCompleted,
        selected_categories: user.selectedCategories || []
      });
    } catch (error) {
      console.error('Error in /api/user/status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Category selection endpoint
  app.post("/api/chat/select-categories", async (req, res) => {
    try {
      const { categories, session_id } = req.body;
      
      const user = await storage.getUserBySessionId(session_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await storage.updateUser(user.id, {
        selectedCategories: categories,
        onboardingCompleted: categories.length > 0
      });

      const categoryNames = categories.map((cat: string) => 
        cat.replace('_', ' ').split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      );
      
      const confirmationMessage = `Perfect! I've configured your dashboard to monitor ${categories.length} data categories: ${categoryNames.join(', ')}. Your personalized HEOR Signal dashboard is now ready.`;

      res.json({
        success: true,
        message: confirmationMessage,
        categories,
        onboarding_completed: updatedUser.onboardingCompleted
      });
    } catch (error) {
      console.error('Error in /api/chat/select-categories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Chat messages endpoint
  app.get("/api/chat/messages/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const user = await storage.getUserBySessionId(sessionId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // For now, return empty messages array since we haven't implemented chat storage yet
      res.json([]);
    } catch (error) {
      console.error('Error in /api/chat/messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Send message endpoint (placeholder for now)
  app.post("/api/chat/send", async (req, res) => {
    try {
      const { message, session_id } = req.body;
      
      // For now, just return a simple response
      res.json({
        success: true,
        message: "Thank you for your message. The AI assistant integration is being finalized. Please use the category selection below to configure your dashboard.",
        message_id: randomUUID()
      });
    } catch (error) {
      console.error('Error in /api/chat/send:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

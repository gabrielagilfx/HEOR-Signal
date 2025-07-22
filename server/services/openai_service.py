import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from ..config import settings

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.assistant_instructions = """
You are a professional HEOR (Health Economics and Outcomes Research) assistant helping users set up their personalized dashboard for monitoring critical pharmaceutical industry data.

Your role is to:
1. Guide users through the onboarding process
2. Help them select relevant data categories for monitoring
3. Answer questions about HEOR data sources and methodologies
4. Provide professional, concise responses suitable for healthcare professionals

Be conversational but professional, and focus on the practical aspects of HEOR signal monitoring.
"""
    
    async def create_assistant(self) -> str:
        """Create a new OpenAI Assistant"""
        try:
            assistant = await self.client.beta.assistants.create(
                name="HEOR Signal Assistant",
                instructions=self.assistant_instructions,
                model="gpt-4-1106-preview",
                tools=[]
            )
            return assistant.id
        except Exception as e:
            logger.error(f"Error creating assistant: {e}")
            raise
    
    async def create_thread(self) -> str:
        """Create a new conversation thread"""
        try:
            thread = await self.client.beta.threads.create()
            return thread.id
        except Exception as e:
            logger.error(f"Error creating thread: {e}")
            raise
    
    async def send_message(self, thread_id: str, message: str) -> str:
        """Send a message to the thread"""
        try:
            await self.client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=message
            )
            return "Message sent successfully"
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise
    
    async def run_assistant(self, assistant_id: str, thread_id: str) -> str:
        """Run the assistant and get response"""
        try:
            run = await self.client.beta.threads.runs.create(
                thread_id=thread_id,
                assistant_id=assistant_id
            )
            
            # Wait for completion
            while run.status in ['queued', 'in_progress']:
                run = await self.client.beta.threads.runs.retrieve(
                    thread_id=thread_id,
                    run_id=run.id
                )
                await asyncio.sleep(1)
            
            if run.status == 'completed':
                messages = await self.client.beta.threads.messages.list(
                    thread_id=thread_id,
                    order="desc",
                    limit=1
                )
                
                if messages.data:
                    return messages.data[0].content[0].text.value
                
            return "Assistant processing failed"
            
        except Exception as e:
            logger.error(f"Error running assistant: {e}")
            raise
    
    async def get_welcome_message(self, categories: List[str]) -> str:
        """Generate welcome message with category selection"""
        category_text = ", ".join(categories) if categories else "all available categories"
        
        return f"""Welcome to **HEOR Signal**! I'm here to help you set up your personalized dashboard for Health Economics and Outcomes Research insights.

To get started, please select the data categories you'd like to monitor. You can always adjust these preferences later in your dashboard settings.

Your current selection: {category_text}

How can I help you customize your HEOR monitoring experience today?"""

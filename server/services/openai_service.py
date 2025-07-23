import asyncio
import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)


class OpenAIService:

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            default_headers={"OpenAI-Beta": "assistants=v2"})
        self.assistant_instructions = """
You are a professional HEOR (Health Economics and Outcomes Research) assistant helping users set up their personalized dashboard for monitoring critical pharmaceutical industry data.

Your role is to:
1. Guide users through the onboarding process
2. Help them select relevant data categories for monitoring
3. Answer questions about HEOR data sources and methodologies
4. Provide professional, concise responses suitable for healthcare professionals
5. Validate user expertise/preferences to ensure they relate to HEOR fields

When validating expertise, look for background in:
- Health Economics and Outcomes Research (HEOR)
- Pharmaceutical industry experience
- Healthcare policy or market access
- Clinical research or epidemiology
- Health technology assessment
- Pharmacoeconomics
- Real-world evidence studies
- Regulatory affairs in healthcare
- Healthcare data analysis

Be conversational but professional, and focus on the practical aspects of HEOR signal monitoring.
"""

    async def create_assistant(self) -> str:
        """Create a new OpenAI Assistant"""
        try:
            assistant = await self.client.beta.assistants.create(
                name="HEOR Signal Assistant",
                instructions=self.assistant_instructions,
                model="gpt-4o-mini",
                tools=[])
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
            await self.client.beta.threads.messages.create(thread_id=thread_id,
                                                           role="user",
                                                           content=message)
            return "Message sent successfully"
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise

    async def run_assistant(self, assistant_id: str, thread_id: str) -> str:
        """Run the assistant and get response"""
        try:
            run = await self.client.beta.threads.runs.create(
                thread_id=thread_id, assistant_id=assistant_id)

            # Wait for completion
            while run.status in ['queued', 'in_progress']:
                run = await self.client.beta.threads.runs.retrieve(
                    thread_id=thread_id, run_id=run.id)
                await asyncio.sleep(1)

            if run.status == 'completed':
                messages = await self.client.beta.threads.messages.list(
                    thread_id=thread_id, order="desc", limit=1)

                if messages.data:
                    content = messages.data[0].content[0]
                    if hasattr(content, 'text') and hasattr(content.text, 'value'):
                        return content.text.value
                    return str(content)

            return "Assistant processing failed"

        except Exception as e:
            logger.error(f"Error running assistant: {e}")
            raise

    async def validate_heor_expertise(self, user_response: str) -> Dict[str, Any]:
        """Validate if user response relates to HEOR expertise"""
        validation_prompt = f"""
Please analyze the following user response about their expertise/preference in HEOR:

User Response: "{user_response}"

Determine if this response relates to Health Economics and Outcomes Research (HEOR) or related healthcare fields such as:
- Health Economics and Outcomes Research (HEOR)
- Pharmaceutical industry experience
- Healthcare policy or market access
- Clinical research or epidemiology
- Health technology assessment
- Pharmacoeconomics
- Real-world evidence studies
- Regulatory affairs in healthcare
- Healthcare data analysis
- Medical affairs
- Biostatistics in healthcare
- Health outcomes research

Respond with a JSON object containing:
1. "is_valid": true if the response relates to HEOR/healthcare, false otherwise
2. "response": if valid, provide a brief acknowledgment. If invalid, ask them to provide their HEOR-related expertise/preference

Format your response as valid JSON only, no additional text.
"""
        
        try:
            # Create a temporary thread for validation
            temp_thread = await self.create_thread()
            await self.send_message(temp_thread, validation_prompt)
            
            # Create temporary assistant for validation
            validation_assistant = await self.client.beta.assistants.create(
                name="HEOR Validation Assistant",
                instructions="You are a validation assistant that analyzes user responses for HEOR relevance. Always respond with valid JSON only.",
                model="gpt-4o-mini"
            )
            
            response = await self.run_assistant(validation_assistant.id, temp_thread)
            
            # Clean up temporary resources
            await self.client.beta.assistants.delete(validation_assistant.id)
            
            # Parse JSON response
            import json
            try:
                result = json.loads(response)
                return result
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "is_valid": False,
                    "response": "Please provide your expertise or preference related to Health Economics and Outcomes Research (HEOR) or healthcare."
                }
                
        except Exception as e:
            logger.error(f"Error validating expertise: {e}")
            return {
                "is_valid": False,
                "response": "Please provide your expertise or preference related to Health Economics and Outcomes Research (HEOR) or healthcare."
            }

    async def get_welcome_message(self, categories: List[str]) -> str:
        """Generate welcome message with category selection"""
        category_text = ", ".join(
            categories) if categories else "all available categories"

        return f"""Welcome to HEOR Signal! I'm here to help you set up your personalized dashboard for Health Economics and Outcomes Research insights.

To get started, please select the data categories you'd like to monitor. You can always adjust these preferences later in your dashboard settings.

Your current selection: {category_text}

How can I help you customize your HEOR monitoring experience today?"""

// src/modules/leads/services/ai-lead-extraction.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface ExtractedLeadData {
  title: string | null;
  description: string | null;
  budget: string | null;
  quantity: string | null;
  location: string | null;
}

@Injectable()
export class AiLeadExtractionService {
  private groqClient: Groq;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured in environment variables');
    }
    this.groqClient = new Groq({ apiKey });
  }

  /**
   * Extract structured lead details from user's natural language input
   * @param userInput - The user's message describing their business requirement
   * @returns Extracted lead details with all fields (null if not found)
   */
  async extractLeadDetails(userInput: string): Promise<ExtractedLeadData> {
    if (!userInput || userInput.trim().length === 0) {
      throw new BadRequestException('User input cannot be empty');
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      
      const chatCompletion = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Extract lead details from this input: ${userInput}`,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const responseContent = chatCompletion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response received from AI model');
      }

      const result = JSON.parse(responseContent);
      
      // Ensure all required fields are present
      return this.validateAndNormalizeResult(result);
      
    } catch (error) {
      console.error('Error in AI lead extraction:', error);
      
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Failed to parse AI response');
      }
      
      if (error.message?.includes('API')) {
        throw new BadRequestException('AI service is currently unavailable');
      }
      
      throw new BadRequestException('Failed to extract lead details');
    }
  }

  /**
   * Build the system prompt for lead extraction
   */
  private buildSystemPrompt(): string {
    return `You are an AI assistant specialized in extracting business lead information from user input for the **Textile Industry**.

**YOUR TASK:**
Analyze the user's input and extract the following fields:
- **title**: A concise, professional title for the lead (3-10 words)
- **description**: A detailed description of what the user needs
- **budget**: Budget information if mentioned (extract numbers and currency)
- **quantity**: Quantity required with units if mentioned
- **location**: Location preference if mentioned

**EXTRACTION RULES:**

1. **Title Generation:**
   - Keep it MINIMAL and concise (3-6 words max)
   - Include key product and quantity if available
   - Use abbreviations: K for thousands (5000 -> 5K), M for millions
   - Example: "Cotton Fabric 5K Meters" or "Yarn Supplier Needed"

2. **Description:**
   - Keep it SHORT and to the point (1-2 sentences max)
   - Only include essential information
   - Use minimal professional language
   - Example: "Need cotton fabric for manufacturing." NOT long paragraphs

3. **Budget:**
   - Extract numbers only
   - Use K for thousands (50000 -> 50K), L for lakhs (100000 -> 1L), M for millions
   - Format: "50K" or "1L-2L" or "100-200"
   - Set to null if not mentioned

4. **Quantity:**
   - Use short forms for units:
     * meters -> mtr (2000 meters -> 2K mtr)
     * kilograms -> kg
     * pieces -> pcs
     * yards -> yds
     * tons -> T
   - Use K for thousands: 5000 -> 5K, 10000 -> 10K
   - Format: "2K mtr" or "500 kg" or "1K pcs"
   - Set to null if not mentioned

5. **Location:**
   - Keep short: city name or state only
   - Format: "Coimbatore" or "TN" or "South India"
   - Set to null if not mentioned

**IMPORTANT:**
- Set fields to null if information is NOT present in user input
- Do not make assumptions or add information not provided
- Extract only what the user explicitly states
- Use professional textile industry language
- Always return valid JSON format

**RESPONSE FORMAT:**
You must respond with ONLY a valid JSON object, no additional text. Format:
{
  "title": "string or null",
  "description": "string or null",
  "budget": "string or null",
  "quantity": "string or null",
  "location": "string or null"
}

**EXAMPLES:**

Input: "cotton fabric 2000 meters needed"
Output:
{
  "title": "Cotton Fabric 2K mtr",
  "description": "Need cotton fabric for manufacturing.",
  "budget": null,
  "quantity": "2K mtr",
  "location": null
}

Input: "need yarn supplier in coimbatore budget 50000"
Output:
{
  "title": "Yarn Supplier Coimbatore",
  "description": "Looking for yarn supplier in Coimbatore area.",
  "budget": "50K",
  "quantity": null,
  "location": "Coimbatore"
}

Input: "polyester thread 5000 pieces"
Output:
{
  "title": "Polyester Thread 5K pcs",
  "description": "Need polyester thread for production.",
  "budget": null,
  "quantity": "5K pcs",
  "location": null
}

Input: "denim fabric 10000 meters budget 200000 in tirupur"
Output:
{
  "title": "Denim Fabric 10K mtr Tirupur",
  "description": "Need denim fabric in Tirupur.",
  "budget": "2L",
  "quantity": "10K mtr",
  "location": "Tirupur"
}`;
  }

  /**
   * Validate and normalize the AI response
   */
  private validateAndNormalizeResult(result: any): ExtractedLeadData {
    const requiredFields = ['title', 'description', 'budget', 'quantity', 'location'];
    
    const normalizedResult: ExtractedLeadData = {
      title: null,
      description: null,
      budget: null,
      quantity: null,
      location: null,
    };

    // Ensure all required fields exist
    for (const field of requiredFields) {
      if (field in result && result[field] !== undefined && result[field] !== null && result[field] !== '') {
        normalizedResult[field] = result[field];
      }
    }

    return normalizedResult;
  }
}
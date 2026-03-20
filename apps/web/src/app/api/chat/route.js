import sql from '@/app/api/utils/sql';

export async function POST(request) {
  try {
    const { messages, conversationId, voiceAnalysis } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages array is required' }, { status: 400 });
    }

    let systemContent = `You are Health Buddy, a compassionate and supportive mental health companion. Your role is to:
- Listen actively and empathetically to users' feelings and concerns
- Provide emotional support and validation
- Suggest evidence-based coping strategies when appropriate
- Encourage professional help for serious mental health concerns
- Never diagnose or replace professional mental health care
- Use warm, friendly, and non-judgmental language
- Ask thoughtful follow-up questions to understand the user better
- Celebrate small wins and progress
- Remind users of their strengths and resilience

Keep responses concise, warm, and supportive. Focus on being a caring companion.`;

    if (voiceAnalysis) {
      systemContent += `\n\nCONTEXT: The user just sent a voice message. Our analysis detected:
- Mood: ${voiceAnalysis.mood}
- Anxiety Level: ${voiceAnalysis.anxiety_level}/10
- Detected Emotions: ${voiceAnalysis.detected_emotions?.join(', ')}
- Summary: ${voiceAnalysis.summary}

Please acknowledge their emotional state empathetically and respond appropriately to their anxiety level. If anxiety is high (7+), offer calming techniques or resources.`;
    }

    const systemPrompt = {
      role: 'system',
      content: systemContent,
    };

    const messagesWithSystem = [systemPrompt, ...messages];
    const geminiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-pro/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesWithSystem,
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return Response.json({ error: 'Failed to get response from AI' }, { status: geminiResponse.status });
    }

    const data = await geminiResponse.json();
    const assistantMessage = data.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      return Response.json({ error: 'No response from AI' }, { status: 500 });
    }

    if (conversationId) {
      try {
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage && lastUserMessage.role === 'user') {
          await sql`
            INSERT INTO messages (conversation_id, role, content)
            VALUES (${conversationId}, ${lastUserMessage.role}, ${lastUserMessage.content})
          `;
        }

        await sql`
          INSERT INTO messages (conversation_id, role, content)
          VALUES (${conversationId}, 'assistant', ${assistantMessage})
        `;

        await sql`
          UPDATE conversations
          SET updated_at = NOW()
          WHERE id = ${conversationId}
        `;
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    return Response.json({ message: assistantMessage, conversationId });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

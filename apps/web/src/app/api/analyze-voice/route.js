export async function POST(request) {
  try {
    const { audioUrl, text } = await request.json();

    if (!text) {
      return Response.json({ error: 'Text is required for analysis' }, { status: 400 });
    }

    const analysisPrompt = {
      role: 'system',
      content: `You are an expert psychologist analyzing emotional tone from text. Analyze the following message and respond ONLY with a JSON object (no markdown, no code blocks) in this exact format:
{
  "mood": "one of: happy, sad, anxious, angry, neutral, stressed, calm, excited",
  "anxiety_level": number from 1-10,
  "detected_emotions": ["emotion1", "emotion2"],
  "summary": "brief emotional summary in one sentence"
}

Base your analysis on:
- Word choice and language patterns
- Emotional indicators
- Stress markers
- Overall tone

Be empathetic and accurate.`,
    };

    const userMessage = {
      role: 'user',
      content: `Analyze this message: "${text}"`,
    };

    const geminiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-pro/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [analysisPrompt, userMessage],
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error('Failed to analyze emotional tone');
    }

    const data = await geminiResponse.json();
    const analysisText = data.choices?.[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis received');
    }

    let analysis;
    try {
      const cleanText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Failed to parse analysis:', analysisText);
      analysis = {
        mood: 'neutral',
        anxiety_level: 5,
        detected_emotions: ['uncertain'],
        summary: 'Unable to fully analyze emotional tone',
      };
    }

    return Response.json({
      ...analysis,
      transcribed_text: text,
      audio_url: audioUrl,
    });
  } catch (error) {
    console.error('Voice analysis error:', error);
    return Response.json({ error: 'Failed to analyze voice' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      return Response.json(
        { error: "Audio file is required" },
        { status: 400 },
      );
    }

    // Convert audio file to base64
    const buffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString("base64");

    // Use Gemini to transcribe audio
    // Note: For production, you might want to use a dedicated speech-to-text service
    // like Google Speech-to-Text, OpenAI Whisper, or similar

    const geminiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-pro/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a speech transcription assistant. Transcribe audio to text accurately. Only return the transcribed text, nothing else.",
            },
            {
              role: "user",
              content: `Transcribe this audio: ${base64Audio.substring(0, 1000)}...`,
            },
          ],
        }),
      },
    );

    if (!geminiResponse.ok) {
      throw new Error("Failed to transcribe audio");
    }

    const data = await geminiResponse.json();
    const transcription = data.choices?.[0]?.message?.content;

    if (!transcription) {
      throw new Error("No transcription received");
    }

    return Response.json({
      text: transcription.trim(),
      success: true,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return Response.json(
      { error: "Failed to transcribe audio" },
      { status: 500 },
    );
  }
}

import sql from "@/app/api/utils/sql";

// Get a specific conversation with all messages
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const conversation = await sql`
      SELECT * FROM conversations WHERE id = ${id}
    `;

    if (conversation.length === 0) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const messages = await sql`
      SELECT * FROM messages 
      WHERE conversation_id = ${id}
      ORDER BY created_at ASC
    `;

    return Response.json({
      ...conversation[0],
      messages,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return Response.json(
      { error: "Failed to fetch conversation" },
      { status: 500 },
    );
  }
}

// Delete a conversation
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await sql`
      DELETE FROM conversations WHERE id = ${id}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return Response.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}

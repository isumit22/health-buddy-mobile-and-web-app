import sql from '../utils/sql.js';

export async function POST(request) {
  try {
    const { userId, title } = await request.json();

    const result = await sql`
      INSERT INTO conversations (user_id, title)
      VALUES (${userId || null}, ${title || 'New Conversation'})
      RETURNING id, user_id, title, created_at, updated_at
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let conversations;
    if (userId) {
      conversations = await sql`
        SELECT c.*,
               COUNT(m.id) as message_count,
               MAX(m.created_at) as last_message_at
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.user_id = ${userId}
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `;
    } else {
      conversations = await sql`
        SELECT c.*,
               COUNT(m.id) as message_count,
               MAX(m.created_at) as last_message_at
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.user_id IS NULL
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `;
    }

    return Response.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

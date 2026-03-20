import sql from '../utils/sql.js';

export async function POST(request) {
  try {
    const { userId, mood, intensity, notes } = await request.json();

    if (!mood || !intensity) {
      return Response.json({ error: 'Mood and intensity are required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO mood_logs (user_id, mood, intensity, notes)
      VALUES (${userId || null}, ${mood}, ${intensity}, ${notes || null})
      RETURNING id, user_id, mood, intensity, notes, created_at
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error logging mood:', error);
    return Response.json({ error: 'Failed to log mood' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '30', 10);

    let moodLogs;
    if (userId) {
      moodLogs = await sql`
        SELECT * FROM mood_logs
        WHERE user_id = ${userId}
          AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
      `;
    } else {
      moodLogs = await sql`
        SELECT * FROM mood_logs
        WHERE user_id IS NULL
          AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
      `;
    }

    return Response.json(moodLogs);
  } catch (error) {
    console.error('Error fetching mood logs:', error);
    return Response.json({ error: 'Failed to fetch mood logs' }, { status: 500 });
  }
}

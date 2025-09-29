import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const profileUrl = searchParams.get('profileUrl');

  if (!profileUrl) {
    return NextResponse.json(
      { error: 'Profile URL is required' },
      { status: 400 }
    );
  }

  // Extract user ID from Spotify profile URL
  // Supports formats: https://open.spotify.com/user/{user_id} or /user/{user_id}?...
  const userIdMatch = profileUrl.match(/\/user\/([^/?]+)/);
  if (!userIdMatch) {
    return NextResponse.json(
      { error: 'Invalid Spotify profile URL format' },
      { status: 400 }
    );
  }

  const userId = userIdMatch[1];

  try {
    // Get Spotify access token using Client Credentials flow
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Spotify access token');
    }

    const { access_token } = await tokenResponse.json();

    // Fetch user's public playlists
    const playlistsResponse = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists?limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!playlistsResponse.ok) {
      if (playlistsResponse.status === 404) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      throw new Error('Failed to fetch user playlists');
    }

    const playlistsData = await playlistsResponse.json();

    // Format the response
    const playlists = playlistsData.items.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      tracksCount: playlist.tracks.total,
      imageUrl: playlist.images?.[0]?.url || null,
      externalUrl: playlist.external_urls.spotify,
      owner: playlist.owner.display_name,
    }));

    return NextResponse.json({
      userId,
      playlists,
    });
  } catch (error) {
    console.error('Spotify API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Spotify data' },
      { status: 500 }
    );
  }
}
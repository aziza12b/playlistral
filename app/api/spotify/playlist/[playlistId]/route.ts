import { NextRequest, NextResponse } from 'next/server';

// Helper to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RouteParams {
  params: Promise<{
    playlistId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { playlistId } = await params;

  if (!playlistId) {
    return NextResponse.json(
      { error: 'Playlist ID is required' },
      { status: 400 }
    );
  }

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

    // Fetch playlist details and tracks
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!playlistResponse.ok) {
      if (playlistResponse.status === 404) {
        return NextResponse.json(
          { error: 'Playlist not found' },
          { status: 404 }
        );
      }
      throw new Error('Failed to fetch playlist');
    }

    const playlistData = await playlistResponse.json();

    // Format playlist information
    const playlist = {
      id: playlistData.id,
      name: playlistData.name,
      description: playlistData.description,
      owner: playlistData.owner.display_name,
      imageUrl: playlistData.images?.[0]?.url || null,
      totalTracks: playlistData.tracks.total,
    };

    // Format tracks with general information
    const spotifyTracks = playlistData.tracks.items.map((item: any, index: number) => {
      const track = item.track;
      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist: any) => artist.name).join(', '),
        artistsArray: track.artists.map((artist: any) => artist.name),
        album: track.album.name,
        duration: track.duration_ms,
        trackNumber: track.track_number,
        externalUrl: track.external_urls.spotify,
        albumImageUrl: track.album.images?.[0]?.url || null,
        addedAt: item.added_at,
      };
    });

    // Fetch Discogs data for each track sequentially with delays
    const baseUrl = request.url.split('/api')[0];
    const tracksWithDiscogs = [];

    for (let i = 0; i < spotifyTracks.length; i++) {
      const track = spotifyTracks[i];

      try {
        const discogsUrl = `${baseUrl}/api/discogs/search?artist=${encodeURIComponent(
          track.artistsArray[0]
        )}&track=${encodeURIComponent(track.name)}&album=${encodeURIComponent(
          track.album
        )}`;

        const discogsResponse = await fetch(discogsUrl);

        if (discogsResponse.ok) {
          const discogsData = await discogsResponse.json();
          const { artistsArray, ...trackWithoutArray } = track;
          tracksWithDiscogs.push({
            ...trackWithoutArray,
            discogs: discogsData,
          });
        } else {
          const { artistsArray, ...trackWithoutArray } = track;
          tracksWithDiscogs.push({
            ...trackWithoutArray,
            discogs: { found: false },
          });
        }
      } catch (error) {
        console.error(`Failed to fetch Discogs data for track ${track.name}:`, error);
        const { artistsArray, ...trackWithoutArray } = track;
        tracksWithDiscogs.push({
          ...trackWithoutArray,
          discogs: { found: false },
        });
      }

      // Add delay between requests (except for the last one)
      if (i < spotifyTracks.length - 1) {
        await delay(600); // 600ms delay = ~1.6 requests per second
      }
    }

    return NextResponse.json({
      playlist,
      tracks: tracksWithDiscogs,
    });
  } catch (error) {
    console.error('Spotify API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlist data' },
      { status: 500 }
    );
  }
}
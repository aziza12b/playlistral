import { NextRequest } from 'next/server';

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
    return new Response(
      JSON.stringify({ error: 'Playlist ID is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send status update
        const sendUpdate = (data: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        sendUpdate({ type: 'status', message: 'Fetching playlist from Spotify...' });

        // Get Spotify access token
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
            throw new Error('Playlist not found');
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

        // Format tracks
        const spotifyTracks = playlistData.tracks.items.map((item: any) => {
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

        // Send playlist and Spotify tracks immediately
        sendUpdate({
          type: 'playlist',
          playlist,
          tracks: spotifyTracks.map((t: any) => {
            const { artistsArray, ...trackWithoutArray } = t;
            return {
              ...trackWithoutArray,
              discogs: { found: false },
            };
          }),
        });

        // Fetch Discogs data for each track sequentially
        const baseUrl = request.url.split('/api')[0];

        for (let i = 0; i < spotifyTracks.length; i++) {
          const track = spotifyTracks[i];

          sendUpdate({
            type: 'status',
            message: `Getting Discogs data for "${track.name}"`,
            progress: {
              current: i + 1,
              total: spotifyTracks.length,
              percentage: Math.round(((i + 1) / spotifyTracks.length) * 100),
            },
          });

          try {
            const discogsUrl = `${baseUrl}/api/discogs/search?artist=${encodeURIComponent(
              track.artistsArray[0]
            )}&track=${encodeURIComponent(track.name)}&album=${encodeURIComponent(
              track.album
            )}`;

            const discogsResponse = await fetch(discogsUrl);

            if (discogsResponse.ok) {
              const discogsData = await discogsResponse.json();

              // Send track update with Discogs data
              sendUpdate({
                type: 'track_update',
                trackId: track.id,
                discogs: discogsData,
              });
            }
          } catch (error) {
            console.error(`Failed to fetch Discogs data for track ${track.name}:`, error);
          }

          // Add delay between requests (except for the last one)
          if (i < spotifyTracks.length - 1) {
            await delay(400); // 400ms delay = ~2.5 requests per second
          }
        }

        sendUpdate({ type: 'complete' });
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'An error occurred',
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
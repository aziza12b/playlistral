import { NextRequest, NextResponse } from 'next/server';

// Helper to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const artist = searchParams.get('artist');
  const track = searchParams.get('track');
  const album = searchParams.get('album');

  if (!artist || !track) {
    return NextResponse.json(
      { error: 'Artist and track parameters are required' },
      { status: 400 }
    );
  }

  try {
    const discogsToken = process.env.DISCOGS_TOKEN;

    if (!discogsToken) {
      throw new Error('Discogs token not configured');
    }

    // Search Discogs for the track
    const searchQuery = `${artist} ${track}${album ? ` ${album}` : ''}`;
    const searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(
      searchQuery
    )}&type=release&per_page=5`;

    let searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Playlistral/1.0',
        'Authorization': `Discogs token=${discogsToken}`,
      },
    });

    // Handle rate limiting with retry
    if (searchResponse.status === 429) {
      await delay(1000); // Wait 1 second
      searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Playlistral/1.0',
          'Authorization': `Discogs token=${discogsToken}`,
        },
      });
    }

    if (!searchResponse.ok) {
      if (searchResponse.status === 429) {
        return NextResponse.json({
          found: false,
          message: 'Rate limited',
        });
      }
      throw new Error('Failed to search Discogs');
    }

    const searchData = await searchResponse.json();

    if (searchData.results.length === 0) {
      return NextResponse.json({
        found: false,
        message: 'No match found on Discogs',
      });
    }

    // Get the first (best) match
    const bestMatch = searchData.results[0];

    // Add a small delay before fetching details
    await delay(250);

    // Fetch detailed information about the release
    let detailResponse = await fetch(bestMatch.resource_url, {
      headers: {
        'User-Agent': 'Playlistral/1.0',
        'Authorization': `Discogs token=${discogsToken}`,
      },
    });

    // Handle rate limiting with retry
    if (detailResponse.status === 429) {
      await delay(1000);
      detailResponse = await fetch(bestMatch.resource_url, {
        headers: {
          'User-Agent': 'Playlistral/1.0',
          'Authorization': `Discogs token=${discogsToken}`,
        },
      });
    }

    if (!detailResponse.ok) {
      if (detailResponse.status === 429) {
        return NextResponse.json({
          found: false,
          message: 'Rate limited',
        });
      }
      throw new Error('Failed to fetch release details from Discogs');
    }

    const detailData = await detailResponse.json();

    // Extract relevant information
    const discogsInfo = {
      found: true,
      id: detailData.id,
      title: detailData.title,
      year: detailData.year || null,
      country: detailData.country || null,
      genres: detailData.genres || [],
      styles: detailData.styles || [],
      labels: detailData.labels?.map((label: any) => label.name) || [],
      formats: detailData.formats?.map((format: any) => ({
        name: format.name,
        descriptions: format.descriptions || [],
      })) || [],
      thumbUrl: detailData.thumb || null,
      coverUrl: detailData.images?.[0]?.uri || null,
      resourceUrl: detailData.resource_url,
      uri: detailData.uri,
    };

    return NextResponse.json(discogsInfo);
  } catch (error) {
    console.error('Discogs API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Discogs', found: false },
      { status: 500 }
    );
  }
}
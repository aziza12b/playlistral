import { NextRequest, NextResponse } from 'next/server';

// Helper to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to clean search strings for better Discogs matching
const cleanSearchString = (str: string): string => {
  return str
    // Remove all content in parentheses
    .replace(/\s*\([^)]*\)/g, '')
    // Remove version suffixes: - Radio Edit, - Remix, etc.
    .replace(/\s*-\s*(radio\s+edit|remix|extended\s+mix|club\s+mix|acoustic|live|remaster(ed)?|version|instrumental).*$/gi, '')
    // Normalize non-English characters to ASCII
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Additional character mappings
      const charMap: { [key: string]: string } = {
        'ø': 'o', 'Ø': 'O',
        'æ': 'ae', 'Æ': 'AE',
        'œ': 'oe', 'Œ': 'OE',
        'ß': 'ss',
        'ð': 'd', 'Ð': 'D',
        'þ': 'th', 'Þ': 'TH',
      };
      return charMap[char] || char;
    })
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

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

    // Clean search strings for better matching
    const cleanArtist = cleanSearchString(artist);
    const cleanTrack = cleanSearchString(track);
    const cleanAlbum = album ? cleanSearchString(album) : '';

    // Search Discogs for the track
    const searchQuery = `${cleanArtist} ${cleanTrack}${cleanAlbum ? ` ${cleanAlbum}` : ''}`;
    const searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(
      searchQuery
    )}&type=release&per_page=1`;

    let searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Playlistral/1.0',
        'Authorization': `Discogs token=${discogsToken}`,
      },
    });

    // Handle rate limiting with retry
    if (searchResponse.status === 429) {
      console.log(`Rate limited when searching Discogs for: ${searchQuery}`);
      await delay(2500); // Wait 2.5 seconds
      searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Playlistral/1.0',
          'Authorization': `Discogs token=${discogsToken}`,
        },
      });
    }

    if (!searchResponse.ok) {
      console.log(`Failed to search Discogs: ${searchResponse.statusText}`);
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
      console.log(`No Discogs match for: ${searchQuery}`);
      return NextResponse.json({
        found: false,
        message: 'No match found on Discogs',
      });
    }

    // Get the first (best) match from search results
    const bestMatch = searchData.results[0];

    // Extract relevant information directly from search results
    const discogsInfo = {
      found: true,
      id: bestMatch.id,
      title: bestMatch.title,
      year: bestMatch.year || null,
      country: bestMatch.country || null,
      genres: bestMatch.genre || [],
      styles: bestMatch.style || [],
      labels: bestMatch.label || [],
      formats: bestMatch.format || [],
      thumbUrl: bestMatch.thumb || bestMatch.cover_image || null,
      coverUrl: bestMatch.cover_image || null,
      resourceUrl: bestMatch.resource_url,
      uri: bestMatch.uri,
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
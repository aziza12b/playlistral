'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface DiscogsInfo {
  found: boolean;
  id?: number;
  title?: string;
  year?: number | null;
  country?: string | null;
  genres?: string[];
  styles?: string[];
  labels?: string[];
  formats?: Array<{
    name: string;
    descriptions: string[];
  }>;
  thumbUrl?: string | null;
  coverUrl?: string | null;
  resourceUrl?: string;
  uri?: string;
}

interface Track {
  id: string;
  name: string;
  artists: string;
  album: string;
  duration: number;
  trackNumber: number;
  externalUrl: string;
  albumImageUrl: string | null;
  addedAt: string;
  discogs?: DiscogsInfo;
}

interface PlaylistInfo {
  id: string;
  name: string;
  description: string | null;
  owner: string;
  imageUrl: string | null;
  totalTracks: number;
}

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.playlistId as string;

  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [loadingProgress, setLoadingProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [discogsComplete, setDiscogsComplete] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearRange, setYearRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });

  const fetchPlaylistTracks = async () => {
    try {
      setLoadingStatus('Connecting to Spotify...');

      const eventSource = new EventSource(`/api/spotify/playlist/${playlistId}/stream`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          setLoadingStatus(data.message);
          if (data.progress) {
            setLoadingProgress(data.progress);
          }
        } else if (data.type === 'playlist') {
          setPlaylist(data.playlist);
          setTracks(data.tracks);
          setLoading(false);
        } else if (data.type === 'track_update') {
          setTracks((prevTracks) =>
            prevTracks.map((track) =>
              track.id === data.trackId
                ? { ...track, discogs: data.discogs }
                : track
            )
          );
        } else if (data.type === 'complete') {
          setLoadingStatus('');
          setLoadingProgress(null);
          setIsRefreshing(false);
          setDiscogsComplete(true);
          eventSource.close();
        } else if (data.type === 'error') {
          setError(data.message);
          setLoading(false);
          setIsRefreshing(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setError('Connection to server lost');
        setLoading(false);
        setIsRefreshing(false);
        eventSource.close();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setError('');
    setDiscogsComplete(false);
    clearFilters();
    fetchPlaylistTracks();
  };

  useEffect(() => {
    fetchPlaylistTracks();
  }, [playlistId]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (totalMs: number) => {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const totalDuration = tracks.reduce((acc, track) => acc + track.duration, 0);

  // Helper to escape CSV values
  const escapeCSV = (str: string): string => {
    return str.replace(/"/g, '""');
  };

  // Export playlist to CSV
  const exportToCSV = () => {
    // CSV headers
    const headers = [
      'Track #', 'Track Name', 'Artists', 'Album', 'Duration',
      'Spotify URL', 'Added At',
      'Discogs Found', 'Discogs Title', 'Year', 'Country',
      'Genres', 'Styles', 'Labels', 'Formats', 'Discogs URL'
    ];

    // Build CSV rows
    const rows = tracks.map((track, index) => {
      const duration = formatDuration(track.duration);
      const discogs = track.discogs;

      // Format arrays as semicolon-separated
      const genres = discogs?.found && discogs.genres ? discogs.genres.join('; ') : '';
      const styles = discogs?.found && discogs.styles ? discogs.styles.join('; ') : '';
      const labels = discogs?.found && discogs.labels ? discogs.labels.join('; ') : '';
      const formats = discogs?.found && discogs.formats
        ? (Array.isArray(discogs.formats)
            ? discogs.formats.join('; ')
            : discogs.formats)
        : '';

      return [
        index + 1,
        escapeCSV(track.name),
        escapeCSV(track.artists),
        escapeCSV(track.album),
        duration,
        track.externalUrl,
        new Date(track.addedAt).toLocaleDateString(),
        discogs?.found ? 'Yes' : 'No',
        discogs?.found ? escapeCSV(discogs.title || '') : '',
        discogs?.year || '',
        discogs?.country || '',
        genres,
        styles,
        labels,
        formats,
        discogs?.uri ? `https://www.discogs.com${discogs.uri}` : '',
      ].map(val => `"${val}"`).join(',');
    });

    // Combine headers and rows
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = `${playlist?.name.replace(/[^a-z0-9]/gi, '_') || 'playlist'}_discogs.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get all unique genres and styles from tracks
  const allGenres = Array.from(
    new Set(
      tracks
        .filter((t) => t.discogs?.found && t.discogs.genres)
        .flatMap((t) => t.discogs!.genres || [])
    )
  ).sort();

  const allStyles = Array.from(
    new Set(
      tracks
        .filter((t) => t.discogs?.found && t.discogs.styles)
        .flatMap((t) => t.discogs!.styles || [])
    )
  ).sort();

  // Count tracks per genre
  const genreCounts = tracks.reduce((acc, track) => {
    if (track.discogs?.found && track.discogs.genres) {
      track.discogs.genres.forEach(genre => {
        acc[genre] = (acc[genre] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  // Count tracks per style
  const styleCounts = tracks.reduce((acc, track) => {
    if (track.discogs?.found && track.discogs.styles) {
      track.discogs.styles.forEach(style => {
        acc[style] = (acc[style] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter tracks based on selected filters
  const filteredTracks = tracks.filter((track) => {
    // Search query filter (artist, track name, or album)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        track.name.toLowerCase().includes(query) ||
        track.artists.toLowerCase().includes(query) ||
        track.album.toLowerCase().includes(query);

      if (!matchesSearch) return false;
    }

    // Genre filter
    if (selectedGenres.length > 0) {
      const trackGenres = track.discogs?.genres || [];
      const hasSelectedGenre = selectedGenres.some((genre) =>
        trackGenres.includes(genre)
      );
      if (!hasSelectedGenre) return false;
    }

    // Style filter
    if (selectedStyles.length > 0) {
      const trackStyles = track.discogs?.styles || [];
      const hasSelectedStyle = selectedStyles.some((style) =>
        trackStyles.includes(style)
      );
      if (!hasSelectedStyle) return false;
    }

    // Year range filter
    if (yearRange.min !== null || yearRange.max !== null) {
      const trackYear = track.discogs?.year;
      if (!trackYear) return false;

      if (yearRange.min !== null && trackYear < yearRange.min) return false;
      if (yearRange.max !== null && trackYear > yearRange.max) return false;
    }

    return true;
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedStyles([]);
    setSearchQuery('');
    setYearRange({ min: null, max: null });
  };

  const activeFiltersCount =
    selectedGenres.length +
    selectedStyles.length +
    (searchQuery ? 1 : 0) +
    (yearRange.min !== null || yearRange.max !== null ? 1 : 0);

  if (loading) {
    return (
      <div className="font-sans min-h-screen p-8 pb-20">
        <main className="max-w-6xl mx-auto">
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
              {loadingStatus || 'Loading playlist...'}
            </p>
            {loadingProgress && (
              <div className="mt-4">
                <div className="w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress.percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">
                  {loadingProgress.current} / {loadingProgress.total} tracks ({loadingProgress.percentage}%)
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-sans min-h-screen p-8 pb-20">
        <main className="max-w-6xl mx-auto">
          <p className="text-center text-red-500">{error}</p>
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Back to Playlists
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen p-8 pb-20">
      <main className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            ← Back to Playlists
          </button>
        </div>

        {playlist && (
          <div className="mb-8">
            <div className="flex items-start gap-6 mb-6">
              {playlist.imageUrl && (
                <img
                  src={playlist.imageUrl}
                  alt={playlist.name}
                  className="w-48 h-48 rounded-lg shadow-lg object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">{playlist.name}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      by {playlist.owner}
                    </p>
                    {playlist.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {playlist.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {playlist.totalTracks} tracks • {formatTotalDuration(totalDuration)}
                    </p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {/* Loading status during refresh */}
            {isRefreshing && loadingStatus && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  {loadingStatus}
                </p>
                {loadingProgress && (
                  <div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-1">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${loadingProgress.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {loadingProgress.current} / {loadingProgress.total} tracks ({loadingProgress.percentage}%)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {tracks.length > 0 && (
          <div className="mb-6 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount} active)`}
              </h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Search (Artist, Track, Album)
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Year Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Year Range</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={yearRange.min ?? ''}
                  onChange={(e) =>
                    setYearRange((prev) => ({
                      ...prev,
                      min: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="From"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={yearRange.max ?? ''}
                  onChange={(e) =>
                    setYearRange((prev) => ({
                      ...prev,
                      max: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="To"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Genres */}
            {allGenres.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Genres ({allGenres.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {allGenres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedGenres.includes(genre)
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                      }`}
                    >
                      {genre} <span className="opacity-70">({genreCounts[genre] || 0})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Styles */}
            {allStyles.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Styles ({allStyles.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {allStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleStyle(style)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedStyles.includes(style)
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800'
                      }`}
                    >
                      {style} <span className="opacity-70">({styleCounts[style] || 0})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Tracks ({filteredTracks.length} / {tracks.length})
            </h2>

            {discogsComplete && tracks.length > 0 && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
                title="Export playlist with Discogs data to CSV"
              >
                <span>📥</span>
                Export to CSV
              </button>
            )}
          </div>

          {/* Real-time Discogs fetch progress */}
          {!loading && loadingStatus && loadingProgress && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 dark:text-blue-400 animate-pulse">🔄</span>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Fetching Discogs data...
                </p>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 ml-6">
                Currently: <span className="font-semibold">{loadingStatus.replace('Getting Discogs data for ', '')}</span>
              </p>
              <div className="ml-6">
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mb-1">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {loadingProgress.current} / {loadingProgress.total} tracks fetched ({loadingProgress.percentage}%)
                </p>
              </div>
            </div>
          )}

          {tracks.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              This playlist has no tracks
            </p>
          ) : filteredTracks.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              No tracks match the current filters
            </p>
          ) : (
            <div className="space-y-2">
              {filteredTracks.map((track, index) => {
                const isExpanded = expandedTrackId === track.id;
                const hasDiscogsData = track.discogs?.found;

                return (
                  <div
                    key={`${track.id}-${index}`}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedTrackId(isExpanded ? null : track.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                          {index + 1}
                        </div>

                        {track.albumImageUrl && (
                          <img
                            src={track.albumImageUrl}
                            alt={track.album}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{track.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {track.artists}
                          </p>

                          {hasDiscogsData && track.discogs && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {track.discogs.genres && track.discogs.genres.length > 0 && (
                                <div className="flex gap-1 items-center">
                                  <span className="text-xs text-gray-500">Genre:</span>
                                  {track.discogs.genres.slice(0, 2).map((genre, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                                    >
                                      {genre}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {track.discogs.styles && track.discogs.styles.length > 0 && (
                                <div className="flex gap-1 items-center">
                                  <span className="text-xs text-gray-500">Style:</span>
                                  {track.discogs.styles.slice(0, 2).map((style, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full"
                                    >
                                      {style}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="hidden md:block flex-1 min-w-0">
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {track.album}
                          </p>
                        </div>

                        <div className="text-sm text-gray-500 dark:text-gray-500 w-12 text-right">
                          {formatDuration(track.duration)}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={track.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-600 text-sm underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Play
                          </a>
                          {hasDiscogsData && (
                            <span className="text-xs text-gray-400">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && hasDiscogsData && track.discogs && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 bg-gray-50 dark:bg-gray-900">
                        <h4 className="font-semibold mb-3 text-sm">Discogs Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {track.discogs.year && (
                            <div>
                              <span className="text-gray-500">Year:</span>{' '}
                              <span className="font-medium">{track.discogs.year}</span>
                            </div>
                          )}
                          {track.discogs.country && (
                            <div>
                              <span className="text-gray-500">Country:</span>{' '}
                              <span className="font-medium">{track.discogs.country}</span>
                            </div>
                          )}
                          {track.discogs.genres && track.discogs.genres.length > 0 && (
                            <div>
                              <span className="text-gray-500">All Genres:</span>{' '}
                              <span className="font-medium">{track.discogs.genres.join(', ')}</span>
                            </div>
                          )}
                          {track.discogs.styles && track.discogs.styles.length > 0 && (
                            <div>
                              <span className="text-gray-500">All Styles:</span>{' '}
                              <span className="font-medium">{track.discogs.styles.join(', ')}</span>
                            </div>
                          )}
                          {track.discogs.labels && track.discogs.labels.length > 0 && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500">Labels:</span>{' '}
                              <span className="font-medium">{track.discogs.labels.join(', ')}</span>
                            </div>
                          )}
                          {track.discogs.formats && track.discogs.formats.length > 0 && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500">Formats:</span>{' '}
                              <span className="font-medium">{track.discogs.formats.map(String).join(', ')}</span>
                            </div>
                          )}
                          {track.discogs.uri && (
                            <div className="md:col-span-2">
                              <a
                                href={`https://www.discogs.com${track.discogs.uri}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View on Discogs →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
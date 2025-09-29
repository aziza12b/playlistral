'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

  useEffect(() => {
    const fetchPlaylistTracks = async () => {
      try {
        const response = await fetch(`/api/spotify/playlist/${playlistId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch playlist tracks');
        }

        setPlaylist(data.playlist);
        setTracks(data.tracks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistTracks();
  }, [playlistId]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="font-sans min-h-screen p-8 pb-20">
        <main className="max-w-6xl mx-auto">
          <p className="text-center text-gray-500">Loading playlist...</p>
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
                  {playlist.totalTracks} tracks
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-4">Tracks</h2>

          {tracks.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              This playlist has no tracks
            </p>
          ) : (
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                    </div>

                    <div className="hidden md:block flex-1 min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {track.album}
                      </p>
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-500 w-12 text-right">
                      {formatDuration(track.duration)}
                    </div>

                    <div>
                      <a
                        href={track.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 hover:text-green-600 text-sm underline"
                      >
                        Play
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
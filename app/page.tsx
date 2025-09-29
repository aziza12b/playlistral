'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  tracksCount: number;
  imageUrl: string | null;
  externalUrl: string;
  owner: string;
}

export default function Home() {
  const router = useRouter();
  const [profileUrl, setProfileUrl] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  const handleFetchPlaylists = async () => {
    if (!profileUrl.trim()) {
      setError('Please enter a Spotify profile URL');
      return;
    }

    setLoading(true);
    setError('');
    setPlaylists([]);
    setSelectedPlaylist(null);

    try {
      const response = await fetch(
        `/api/spotify/user?profileUrl=${encodeURIComponent(profileUrl)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch playlists');
      }

      setUserId(data.userId);
      setPlaylists(data.playlists);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (selectedPlaylist) {
      router.push(`/playlist/${selectedPlaylist}`);
    }
  };

  return (
    <div className="font-sans min-h-screen p-8 pb-20">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Spotify Playlist Viewer</h1>

        <div className="mb-8">
          <label htmlFor="profileUrl" className="block text-sm font-medium mb-2">
            Spotify Profile URL
          </label>
          <div className="flex gap-4">
            <input
              id="profileUrl"
              type="text"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://open.spotify.com/user/..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            />
            <button
              onClick={handleFetchPlaylists}
              disabled={loading}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Loading...' : 'Get Playlists'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>

        {userId && (
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Showing playlists for user: <span className="font-mono">{userId}</span>
          </p>
        )}

        {playlists.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Playlists ({playlists.length})
            </h2>
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => setSelectedPlaylist(playlist.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPlaylist === playlist.id
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-700 hover:border-green-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {playlist.imageUrl && (
                      <img
                        src={playlist.imageUrl}
                        alt={playlist.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {playlist.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {playlist.owner} • {playlist.tracksCount} tracks
                      </p>
                      {playlist.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                          {playlist.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPlaylist === playlist.id && (
                        <span className="text-green-500 text-sm font-medium">
                          ✓ Selected
                        </span>
                      )}
                      <a
                        href={playlist.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 hover:text-green-600 text-sm underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open in Spotify
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedPlaylist && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && playlists.length === 0 && !error && (
          <div className="text-center py-12 text-gray-500">
            <p>Enter a Spotify profile URL to view playlists</p>
            <p className="text-sm mt-2">
              Example: https://open.spotify.com/user/spotify
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

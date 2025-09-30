# 🎵 Playlistral

**Enhanced Spotify playlist viewer with rich Discogs music metadata integration**

Playlistral transforms your Spotify playlists into powerful music catalogs by enriching each track with detailed metadata from Discogs, including genres, styles, record labels, release years, and more. Perfect for music enthusiasts who want deeper insights into their collections.

## ✨ Features

### 🎧 Spotify Integration
- **OAuth Authentication** - Secure login with your Spotify account
- **Playlist Management** - View all your Spotify playlists
- **Track Details** - Complete track information including artists, albums, and duration
- **Playlist Stats** - Total tracks count and complete playlist duration

### 🎼 Discogs Enrichment
- **Automatic Metadata Lookup** - Fetches detailed music data for every track
- **Rich Information** - Genres, styles, release year, country, labels, and formats
- **Smart Matching** - Advanced search with track name cleaning and character normalization
- **Real-time Progress** - Live status updates showing current track being processed
- **Progressive Loading** - Spotify data loads instantly, Discogs data streams in progressively

### 🔍 Advanced Filtering
- **Genre Filtering** - Filter tracks by Discogs genres with track counts
- **Style Filtering** - Sub-genre/style-based filtering with counts
- **Year Filtering** - Filter by release decade or year range
- **Real-time Counts** - Each filter shows the number of matching tracks

### 📊 Data Export
- **CSV Export** - Export complete playlist with all Spotify and Discogs metadata
- **Comprehensive Data** - Includes all track details, genres, styles, labels, and more
- **One-Click Export** - Download formatted CSV after Discogs data completes

### 🔄 Additional Features
- **Refresh Button** - Reload playlist data anytime
- **Rate Limiting** - Respects Discogs API limits with sequential processing
- **Character Normalization** - Handles international characters (è→e, ü→u, etc.)
- **Track Name Cleaning** - Removes features, remixes, and radio edits for better matching

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- Spotify Developer Account ([Create one](https://developer.spotify.com/))
- Discogs Account ([Sign up](https://www.discogs.com/))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/playlistral.git
cd playlistral
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env.local` file in the root directory:

```env
# Spotify API Credentials
# Get these from https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback

# Discogs API Credentials
# Get your token from https://www.discogs.com/settings/developers
DISCOGS_TOKEN=your_discogs_token_here
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

1. **Login** - Click "Login with Spotify" and authorize the application
2. **Select Playlist** - Choose a playlist from your Spotify library
3. **Wait for Enrichment** - Watch as Discogs data loads progressively for each track
4. **Filter & Explore** - Use genre, style, and year filters to explore your music
5. **Export** - Click "Export to CSV" to download the complete enriched playlist

## 🛠️ Built With

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Styling
- **[Spotify Web API](https://developer.spotify.com/documentation/web-api)** - Music data
- **[Discogs API](https://www.discogs.com/developers)** - Music metadata

## 📁 Project Structure

```
playlistral/
├── app/
│   ├── api/
│   │   ├── discogs/
│   │   │   └── search/          # Discogs search endpoint
│   │   └── spotify/
│   │       ├── callback/         # OAuth callback
│   │       ├── login/            # OAuth login
│   │       ├── playlists/        # Fetch all playlists
│   │       └── playlist/
│   │           └── [playlistId]/ # Playlist details
│   │               └── stream/   # SSE streaming endpoint
│   ├── playlist/
│   │   └── [playlistId]/         # Playlist page component
│   └── page.tsx                  # Home page
├── .env.local                    # Environment variables
└── package.json
```

## 🔐 API Configuration

### Spotify Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/api/spotify/callback` to Redirect URIs
4. Copy Client ID and Client Secret to `.env.local`

### Discogs Setup
1. Go to [Discogs Developer Settings](https://www.discogs.com/settings/developers)
2. Generate a personal access token
3. Copy the token to `.env.local`

## ⚡ Performance

- **Sequential Processing** - Respects Discogs rate limits (60 requests/minute)
- **Smart Delays** - 400ms between requests to avoid throttling
- **Optimized Queries** - Uses specific API parameters for better accuracy
- **Single API Call** - One search per track (no detail fetch)
- **Progressive Loading** - Instant Spotify data, streaming Discogs updates

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api) for music streaming data
- [Discogs API](https://www.discogs.com/developers) for comprehensive music metadata
- Built with modern web technologies from Vercel

---

**Made with ♪ by music lovers, for music lovers**
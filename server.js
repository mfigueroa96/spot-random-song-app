const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Spotify credentials from environment variables
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

app.use(cors());
app.use(express.static('public')); // To serve static files, like index.html

// Step 1: Redirect the user to Spotify's authorization URL
app.get('/login', (req, res) => {
    const scope = 'user-read-private user-read-email';
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
        });
    res.redirect(authUrl);
});

// Step 2: Spotify redirects to your callback URL with a code
app.get('/callback', async (req, res) => {
    const code = req.query.code || null;

    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri,
            }),
            {
                headers: {
                    Authorization:
                        'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token, refresh_token } = response.data;
        // Redirect back to the frontend with the tokens in the URL
        res.redirect(`/?access_token=${access_token}&refresh_token=${refresh_token}`);
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.send('Error during authentication');
    }
});

// Endpoint to get a random song based on genre
app.get('/random_song', async (req, res) => {
    const accessToken = req.query.access_token;
    const genre = req.query.genre;

    if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
    }

    try {
        // Make a request to Spotify’s API for genre-based recommendations
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
                seed_genres: genre,
                limit: 1,
            },
        });

        const track = response.data.tracks[0];
        const songData = {
            song: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            url: track.external_urls.spotify,
        };

        res.json(songData);
    } catch (error) {
        console.error('Error fetching random song:', error);
        res.status(500).json({ error: 'Failed to fetch random song' });
    }
});

// Serve index.html from the public directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

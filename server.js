const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const client_id = '9caf657d1e334f89a475d97f4d0a71ea';
const client_secret = '1710a1b73dd74c98846b1ec1328c6b16';
const redirect_uri = 'https://random-spotify-song-app-ccfdbaa17f18.herokuapp.com/callback';

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

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

        const { access_token } = response.data;
        res.redirect(`/index.html?access_token=${access_token}`);
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.send('Error during authentication');
    }
});

app.get('/random-song', async (req, res) => {
    const accessToken = req.query.access_token;
    const genre = req.query.genre || 'pop';

    try {
        const response = await axios.get(`https://api.spotify.com/v1/recommendations`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                seed_genres: genre,
                limit: 1
            }
        });

        const song = response.data.tracks[0];
        res.json({
            name: song.name,
            artist: song.artists[0].name,
            preview_url: song.preview_url,
            external_url: song.external_urls.spotify
        });
    } catch (error) {
        console.error('Error fetching random song:', error);
        res.status(500).send('Error fetching song recommendation');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

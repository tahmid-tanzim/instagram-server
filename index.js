const express = require('express');
const bodyParser = require('body-parser');
const upload = require('./middleware/upload');
const app = express();
const port = 8080;

/* SQLite Database */
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./database/instagram.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the Instagram database.');
});

app.use('/images', express.static('images'));
app.use(bodyParser.json());

app.get('/followers', (req, res) => {
    if (req.query.user_id) {
        db.all(`SELECT id, username FROM users WHERE id IN (SELECT follower_id FROM followers WHERE user_id = ?)`,
            [req.query.user_id],
            (err, rows) => {
                if (err) {
                    res.status(400).json({message: err.message});
                }

                res.status(200).json({data: rows});
            });
    } else {
        res.status(400).json({message: 'Invalid Request'});
    }
});

app.get('/followers/photo', (req, res) => {
    if (req.query.user_id) {
        db.all(`SELECT id, filename, title, uploaded_at FROM photos WHERE owner_id IN (SELECT id FROM users WHERE id IN (SELECT follower_id FROM followers WHERE user_id = ?)) ORDER BY uploaded_at DESC`,
            [req.query.user_id],
            (err, rows) => {
                if (err) {
                    res.status(400).json({message: err.message});
                }

                res.status(200).json({data: rows});
            });
    } else {
        res.status(400).json({message: 'Invalid Request'});
    }
});

app.post('/follow', (req, res) => {
    const {follower_id, user_id} = req.body;
    db.run(`INSERT INTO followers (follower_id, user_id) VALUES (?,?,?)`,
        [follower_id, user_id],
        function (err) {
            if (err) {
                res.status(400).json({message: err.message});
            }

            res.status(200).json({message: 'Success'});
        });
});

app.delete('/unfollow', (req, res) => {
    const {follower_id, user_id} = req.body;
    db.run(`DELETE FROM followers WHERE follower_id = ? AND user_id = ?`,
        [follower_id, user_id],
        function (err) {
            if (err) {
                res.status(400).json({message: err.message});
            }

            res.status(200).json({message: 'Success'});
        });
});

app.post('/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        res.status(500);
    } else {
        const uploaded_at = new Date();
        const {title, owner_id} = req.body;
        const {filename, size, mimetype} = req.file;

        db.run(`INSERT INTO photos (title,filename,size,mimetype,owner_id,uploaded_at) VALUES (?,?,?,?,?,?)`,
            [title, filename, size, mimetype, parseInt(owner_id), uploaded_at],
            function (err) {
                if (err) {
                    res.status(400).json({message: err.message});
                }

                res.status(202).json({
                    message: 'Successfully uploaded photo.',
                    data: {id: this.lastID, filename, title, uploaded_at: uploaded_at.getTime()}
                });
            });
    }
});

app.get('/photos', (req, res) => {
    if (req.query.owner_id) {
        db.all(`SELECT id, filename, title, uploaded_at FROM photos WHERE owner_id = ? ORDER BY uploaded_at DESC`,
            [req.query.owner_id],
            (err, rows) => {
                if (err) {
                    console.error(err.message);
                }
                res.status(200).json({data: rows});
            });
    } else {
        res.status(400).json({message: 'Invalid Request'});
    }
});

app.post('/login', (req, res) => {
    if (req.body.username) {
        let sql = `SELECT id, username FROM users WHERE username = ?`;
        db.get(sql, [req.body.username], (err, row) => {
            if (err) {
                res.status(404).json({message: err.message});
            }

            row ? res.status(200).json({data: row})
                : res.status(404).json({message: `No user found with the username - ${req.body.username}`});
        });
    } else {
        res.status(400).json({message: 'Invalid username'});
    }
});

// Respond with 404 to any routes not matching API endpoints
app.all('/*', (req, res) => {
    res.status(404).json({message: 'No endpoint exists at ' + req.originalUrl});
});

const server = app.listen(port, () => console.log(`Instagram app listening on port ${port}!`));

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('\nClose Instagram database connection.');
        server.close();
        process.exit();
    });
});
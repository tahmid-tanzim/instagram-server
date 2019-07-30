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
    db.serialize(() => {
        db.all(`SELECT rowid, id, username FROM users ORDER BY id ASC`, (err, rows) => {
            if (err) {
                console.error(err.message);
            }
            res.status(200).json({data: rows});
        });
    });

    // db.close((err) => {
    //     if (err) {
    //         return console.error(err.message);
    //     }
    //     console.log('Close the database connection.');
    // });
});

app.post('/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        res.status(500);
    } else {
        db.run(`INSERT INTO photos (title,filename,size,mimetype,owner_id,uploaded_at) VALUES (?,?,?,?,?,?)`,
            [
                req.body.title,
                req.file.filename,
                req.file.size,
                req.file.mimetype,
                parseInt(req.body.owner_id),
                new Date()
            ],
            (err) => {
                if (err) {
                    console.log(err.message);
                    res.status(400).json({message: err.message});
                }
                // get the last insert id
                console.log(`A row has been inserted with rowid : `, JSON.stringify(this, null, 2));
                res.status(202).json({message: 'Successfully uploaded photo.'});
            });
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

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
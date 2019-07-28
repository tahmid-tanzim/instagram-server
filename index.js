const express = require('express');
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

app.use(express.static(__dirname + '/photos'));

app.get('/followers', (req, res) => {
    db.serialize(() => {
        db.all(`SELECT id, username FROM users ORDER BY id ASC`, (err, rows) => {
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

app.get('/photos', (req, res) => {
    res.status(200).json({data: []});
});

// Respond with 404 to any routes not matching API endpoints
app.all('/*', (req, res) => {
    res.status(404).json({ message: 'No endpoint exists at ' + req.originalUrl });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
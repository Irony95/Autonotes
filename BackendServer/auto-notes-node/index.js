const express = require('express')
const cors = require("cors");
const fs = require('fs');

const rawModel = fs.readFileSync('./public/model.json');
const model = JSON.parse(rawModel);
const rawWeightBin1 = fs.readFileSync('./public/group1-shard1of2.bin');
const rawWeightBin2 = fs.readFileSync('./public/group1-shard2of2.bin');

console.log(model);

const app = express();
app.use(express.static('public/build'));
app.use(cors());

const data = {test : "ok"}
app.get("/api/test", (req, res) => {
    res.json(data);
}); 

app.get('/api/getFont', (req, res) => {
    res.sendFile(__dirname + '/public/mathFont.otf');
});

app.get("/api/getModel", (req, res) => {
    res.json(model);
});     
//used within the loadModel function
app.get("/api/group1-shard1of2.bin", (req, res) => {
    res.send(rawWeightBin1);
});

app.get("/api/group1-shard2of2.bin", (req, res) => {
    res.send(rawWeightBin2);
});

app.listen(5500, () => {
    console.log("listening at 5500");
})
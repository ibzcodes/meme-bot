const express = require("express"); 
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connecting to MongoDB 
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB Connection error:", err));

app.get("/api/tokens", async (req, res) => {
    try {
        const chain = req.query.chain || "solana"; 
        const url = `https://api.dexscreener.com/latest/dex/tokens/${chain}`;
        const response = await axios.get(url);
        const tokens = response.data.pairs;

    const FilteredTokens = tokens.filter((token) => {
        const liquidity = parseFloat(token.liquidity?.usd || 0);
        const volume = parseFloat(token.volume?.h24 || 0);
        const marketCap = parseFloat(token.fdv || 0);
        const holders = parseInt(token.holders.h24 || 0);
        const priceChange = parseFloat(token.priceChange?.h24 || 0);

        return (
        liquidity > 50000 &&
        volume > 100000 &&
        marketCap > 100000 &&
        marketCap < 1000000 &&
        holders > 100 &&
        priceChange > 20 &&
        priceChange < 50
        );
    });

    const RankedTokes = FilteredTokens.sort((a, b) => {
        const ScoreA = calculateScore(a);
        const ScoreB = calculateScore(b);
        return ScoreB - ScoreA;
    });

    res.json(RankedTokes.slice(0, 5)); 
    } catch (error) {
        console.error("Error fetching Tokens:", error);
        res.status(500).json({error: "Failed to fetch tokens"}); 
    }
});

function calculateScore(token) {
    let score = 0;
    const liquidity = parseFloat(token.liquidity?.usd || 0);
    const volume = parseFloat(token.volume?.h24 || 0);
    const marketCap = parseFloat(token.fdv || 0)
    const holders = parseInt(token.holders || 0)
    const priceChange = parseFloat(token.priceChange?.h24 || 0);

    if (liquidity > 50000) score += 1;
    if (volume > 100000) score += 1;
    if (marketCap > 100000 && marketCap < 1000000) score += 1;
    if (holders > 100) score += 1;
    if (priceChange > 20 && priceChange < 50) score += 1;
    
    return score;
}
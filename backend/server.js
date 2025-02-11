const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS Configuration
app.use(cors({
  origin: "*",
  methods: "GET, HEAD, PUT, POST, DELETE",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true,
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection error:", err));

// Fetch and filter tokens
app.get("/api/tokens", async (req, res) => {
  try {
    const chain = req.query.chain || "solana";
    const url = `https://api.dexscreener.com/latest/dex/search?q=${chain}`;

    console.log(`Fetching data from DexScreener: ${url}`);
    const response = await axios.get(url);

    console.log("✅ Full API Response:", JSON.stringify(response.data, null, 2));

    const tokens = response.data.pairs || [];

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(404).json({ error: "❌ No tokens found for the specified chain" });
    }

    // Debugging: Log token count before filtering
    console.log(`✅ Found ${tokens.length} tokens before filtering.`);

    const filteredTokens = tokens.filter((token) => {
      console.log("🔍 Full Token Object:", JSON.stringify(token, null, 2)); // Log for debugging
    
      // 🔹 Ensure only Solana tokens are included
      if (token.chainId !== "solana") {
        console.log(`❌ Skipping ${token.baseToken?.symbol} - Not on Solana`);
        return false;
      }
    
      const liquidity = parseFloat(token?.liquidity?.usd || token?.liquidity || 0);
      const volume = parseFloat(token?.volume?.h24 || 0);
      const marketCap = parseFloat(token?.fdv || token?.marketCap || 0);
      const holders = parseInt(token?.holders?.h24 || token?.holders || 0);
      const priceChange = parseFloat(token?.priceChange?.h24 || 0);
    
      console.log(`✅ Token: ${token.baseToken?.symbol || "Unknown"}, Chain: ${token.chainId}, Liquidity: ${liquidity}, Volume: ${volume}, MarketCap: ${marketCap}, Holders: ${holders}, Price Change: ${priceChange}`);
    
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
    

    // Debugging: Log token count after filtering
    console.log(`✅ Found ${filteredTokens.length} tokens after filtering.`);

    if (filteredTokens.length === 0) {
      return res.status(404).json({ error: "❌ No tokens matched the criteria" });
    }

    res.json(filteredTokens.slice(0, 5));
  } catch (error) {
    console.error("❌ Error fetching Tokens:", error);
    res.status(500).json({ error: "❌ Failed to fetch tokens" });
  }
});

// Calculate token score
function calculateScore(token) {
  let score = 0;
  const liquidity = parseFloat(token.liquidity?.usd || 0);
  const volume = parseFloat(token.volume?.h24 || 0);
  const marketCap = parseFloat(token.fdv || 0);
  const holders = parseInt(token.holders || 0); // ✅ Fixed holders field
  const priceChange = parseFloat(token.priceChange?.h24 || 0);

  if (liquidity > 50000) score += 1;
  if (volume > 100000) score += 1;
  if (marketCap > 100000 && marketCap < 1000000) score += 1;
  if (holders > 100) score += 1;
  if (priceChange > 20 && priceChange < 50) score += 1;

  return score;
}

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
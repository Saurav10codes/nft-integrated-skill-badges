import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import blockchainRoutes from './routes/blockchainRoutes';
import * as StellarSDK from '@stellar/stellar-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', blockchainRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Debug endpoint to test Horizon connection
app.get('/api/debug/account/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const server = new StellarSDK.Horizon.Server('https://horizon-testnet.stellar.org');
    const account = await server.loadAccount(address);
    res.json({ 
      success: true, 
      address,
      sequence: account.sequence,
      balances: account.balances 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      response: error.response?.data 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

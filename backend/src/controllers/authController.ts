import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const registerOrLoginUser = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      throw fetchError;
    }

    if (existingUser) {
      // Update last login
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('wallet_address', walletAddress.toLowerCase())
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        success: true,
        message: 'Login successful',
        user: updatedUser,
        isNewUser: false,
      });
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          wallet_address: walletAddress.toLowerCase(),
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    return res.json({
      success: true,
      message: 'Registration successful',
      user: newUser,
      isNewUser: true,
    });
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      details: error.message,
    });
  }
};

export const getUserByWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    return res.json({ success: true, user });
  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(500).json({
      error: 'Failed to fetch user',
      details: error.message,
    });
  }
};

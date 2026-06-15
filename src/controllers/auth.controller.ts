// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { prisma } from '../lib/prisma.js';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return res.status(401).json({ error: authError.message });
      }

      const user = authData.user;
      
      // Get role from user_metadata, default to STUDENT if not set
      let role = user.user_metadata?.role || 'STUDENT';
      
      // Override role based on email for known users (fallback)
      if (email === 'admin@dmif.org') {
        role = 'ADMIN';
      } else if (email === 'smith@dmif.org') {
        role = 'MENTOR';
      }

      // Get or create profile in database
      let profile = null;
      
      if (role === 'STUDENT') {
        profile = await prisma.student.findUnique({
          where: { userId: user.id },
          include: { program: true, track: true, mentor: true }
        });
        
        // If no profile exists, create one
        if (!profile) {
          const defaultProgram = await prisma.program.findFirst({
            where: { name: 'G-CMP' }
          });
          const defaultTrack = await prisma.track.findFirst({
            where: { programId: defaultProgram?.id }
          });
          
          profile = await prisma.student.create({
            data: {
              userId: user.id,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Student',
              registrationNumber: `DMIF${new Date().getFullYear()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              programId: defaultProgram?.id || '',
              trackId: defaultTrack?.id || '',
              joinDate: new Date(),
              lastActive: new Date(),
              progress: 0,
              status: 'ACTIVE',
            },
            include: { program: true, track: true, mentor: true }
          });
          console.log(`✅ Created student profile for ${user.email}`);
        }
      } 
      else if (role === 'MENTOR') {
        profile = await prisma.mentor.findUnique({
          where: { userId: user.id },
          include: { assignedStudents: true }
        });
        
        // If no profile exists, create one
        if (!profile) {
          profile = await prisma.mentor.create({
            data: {
              userId: user.id,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Mentor',
              expertise: [],
              programs: [],
              joinDate: new Date(),
              status: 'ACTIVE',
              rating: 0,
              students: 0,
            },
            include: { assignedStudents: true }
          });
          console.log(`✅ Created mentor profile for ${user.email}`);
        }
      } 
      else if (role === 'ADMIN') {
        profile = await prisma.admin.findUnique({
          where: { userId: user.id }
        });
        
        // If no profile exists, create one
        if (!profile) {
          profile = await prisma.admin.create({
            data: {
              userId: user.id,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Admin',
            }
          });
          console.log(`✅ Created admin profile for ${user.email}`);
        }
      }
      // Update lastLogin timestamp in our local database
      try {
        await prisma.user.updateMany({
          where: { email },
          data: { lastLogin: new Date() }
        });
      } catch (updateErr) {
        console.error('Failed to update lastLogin:', updateErr);
      }

      res.json({
        success: true,
        token: authData.session?.access_token,
        user: {
          id: user.id,
          email: user.email,
          role: role,
          profile: profile,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      // Register with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role || 'STUDENT',
            name: name,
          },
        },
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      const user = authData.user;

      if (!user) {
        return res.status(400).json({ error: 'User creation failed' });
      }

      // Create profile in database
      let profile = null;
      const userRole = role || 'STUDENT';
      
      if (userRole === 'STUDENT') {
        const defaultProgram = await prisma.program.findFirst({
          where: { name: 'G-CMP' }
        });
        const defaultTrack = await prisma.track.findFirst({
          where: { programId: defaultProgram?.id }
        });

        profile = await prisma.student.create({
          data: {
            userId: user.id,
            name: name,
            registrationNumber: `DMIF${new Date().getFullYear()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            programId: defaultProgram?.id || '',
            trackId: defaultTrack?.id || '',
            joinDate: new Date(),
            lastActive: new Date(),
            progress: 0,
            status: 'ACTIVE',
          },
        });
      } else if (userRole === 'MENTOR') {
        profile = await prisma.mentor.create({
          data: {
            userId: user.id,
            name: name,
            expertise: [],
            programs: [],
            joinDate: new Date(),
            status: 'ACTIVE',
            rating: 0,
            students: 0,
          },
        });
      } else if (userRole === 'ADMIN') {
        profile = await prisma.admin.create({
          data: {
            userId: user.id,
            name: name,
          },
        });
      }

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          role: userRole,
          profile: profile,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token) {
        await supabase.auth.admin.signOut(token);
      }
      
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      let role = user.user_metadata?.role || 'STUDENT';
      
      // Override role based on email
      if (user.email === 'admin@dmif.org') {
        role = 'ADMIN';
      } else if (user.email === 'smith@dmif.org') {
        role = 'MENTOR';
      }
      
      let profile = null;
      if (role === 'STUDENT') {
        profile = await prisma.student.findUnique({
          where: { userId: user.id },
          include: { program: true, track: true, mentor: true }
        });
      } else if (role === 'MENTOR') {
        profile = await prisma.mentor.findUnique({
          where: { userId: user.id },
          include: { assignedStudents: true }
        });
      } else if (role === 'ADMIN') {
        profile = await prisma.admin.findUnique({
          where: { userId: user.id }
        });
      }

      res.json({
        id: user.id,
        email: user.email,
        role: role,
        profile: profile,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword, refreshToken } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        console.warn('⚠️ [AUTH] Change password attempt failed: No token provided');
        return res.status(401).json({ error: 'No token provided' });
      }

      if (!currentPassword || !newPassword) {
        console.warn('⚠️ [AUTH] Change password attempt failed: Missing current or new password');
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      // First, get the authenticated user from Supabase using their token
      const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
      if (getUserError || !user || !user.email) {
        console.warn('⚠️ [AUTH] Change password attempt failed: Invalid token');
        return res.status(401).json({ error: 'Invalid token' });
      }

      console.log(`\n🔑 [AUTH] Change password request received for user: ${user.email}`);

      // To verify the current password, we try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        console.warn(`⚠️ [AUTH] Change password failed for user ${user.email}: Incorrect current password`);
        return res.status(400).json({ error: 'Incorrect current password' });
      }

      // Create a Supabase client with the user's specific access token to securely update
      const userSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      
      const { error: setSessionError } = await userSupabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken || ''
      });

      if (setSessionError) {
        console.error(`❌ [AUTH] Failed to set user session on backend client:`, setSessionError);
        return res.status(400).json({ error: `Auth session missing: ${setSessionError.message}` });
      }

      const { error: updateError } = await userSupabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error(`❌ [AUTH] Failed to update user password in Supabase:`, updateError);
        return res.status(400).json({ error: updateError.message });
      }

      console.log(`✅ [AUTH] Password successfully updated in Supabase for user: ${user.email}\n`);
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('❌ [AUTH] Change password error:', error);
      res.status(500).json({ error: error.message || 'Failed to change password' });
    }
  }
}